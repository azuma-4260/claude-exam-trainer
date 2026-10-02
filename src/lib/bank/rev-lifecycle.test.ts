import { describe, expect, it } from "vitest";
import type { AttemptRow, QuestionFlagRow } from "@/db/schema";
import { processAnswer, type AnswerDeps, type AnswerStore } from "@/lib/answer/process";
import { answerRequestSchema } from "@/lib/answer/schema";
import { activeQuestionRevisions, filterCurrentOpenFlags } from "@/lib/export/load";
import { assembleMistakesView, type MistakeAttempt } from "@/lib/mistakes/derive";
import { restoreCurrent, saveAnswer, savePosition, startFullMock, startSession, submitSession, type MockDeps } from "@/lib/mock/lifecycle";
import { FakeMockStore } from "@/lib/mock/test-store";
import { buildDailyQueue } from "@/lib/queue/build";
import { NOW as QUEUE_NOW, flash, mcq, srsRow, syllabus } from "@/lib/queue/test-fixtures";
import type { SrsStateUpsert } from "@/lib/srs/card-row";
import { evaluatePool, type OpenFlag, type PoolContext, type PoolQuery, type PoolSession } from "./pool";
import { mockFormSchema, type MockForm, type Question } from "./schema";

// T-rev: rev のライフサイクル(specs/03 §rev のライフサイクル, §question_flag, §exam_session、07 Step 6)。
// deploy = バンク差し替え(v1 → v2)をまたいだ不変条件を、store / DB 行は 1 つのまま
// バンク側(findQuestion / questions)だけを差し替えて検証する。保存済みの行は書き換えない。
// - editorial fix: 同一 ID で rev++ → 旧 rev のフラグは superseded(出題除外・未解決一覧から自動的に外れる)
// - 意味変更: 新 ID + 旧 ID retired → 旧 ID は全モードで出題除外(DB 履歴行は残す)
// - 進行中の exam_session は開始時の question_rev snapshot だけを使い、出題プールを再評価しない

const NOW = new Date("2026-10-26T10:00:00+09:00");
const LATER = (min: number) => new Date(NOW.getTime() + min * 60_000);

/** 回答 API の attempt_id 用 */
const UUID = "11111111-1111-4111-8111-111111111111";

// ---- fixture: 60 問のフォーム(未提出 = holdout 中)と独立 MCQ ----

const QUOTA: Record<string, number> = { "f-d1": 16, "f-d2": 11, "f-d3": 12, "f-d4": 12, "f-d5": 9 };
const FORM_V1: Question[] = Object.entries(QUOTA).flatMap(([domain, n]) =>
  Array.from({ length: n }, (_, i) =>
    mcq(`${domain}-q${String(i + 201).padStart(3, "0")}`, {
      scenario_id: "sc-form-a",
      eligible_modes: ["mock", "practice"],
      srs_eligible: false,
    }),
  ),
);
const FORM_A: MockForm = mockFormSchema.parse({
  id: "form-a",
  exam: "ccar-f",
  scenario_ids: ["sc-form-a"],
  question_ids: FORM_V1.map((q) => q.id),
});
/** 提出済みの form-a(Practice 解放後の文脈) */
const SUBMITTED_A: PoolSession = { exam: "ccar-f", formId: "form-a", kind: "full", status: "submitted" };

/** 独立 MCQ(drill / practice / mini の全 gate に到達する: 非フォーム・scenario なし・srs_eligible) */
const STANDALONE_V1 = mcq("f-d2-q001", { eligible_modes: ["drill", "practice", "mock"] });
/** mini 用の追加 2 問 */
const MINI_V1: Question[] = [
  STANDALONE_V1,
  mcq("f-d2-q002", { eligible_modes: ["drill", "practice", "mock"] }),
  mcq("f-d2-q003", { eligible_modes: ["drill", "practice", "mock"], type: "mcq_multi", answer: ["A", "B"], stem_en: "Select TWO transports." }),
];

const V1: Question[] = [...FORM_V1, ...MINI_V1];

/** editorial fix の deploy: 同一 ID のまま rev だけ進める(正答・選択肢の意味は不変) */
const bumpRev = (q: Question): Question => ({ ...q, rev: q.rev + 1, explanation_ja: `${q.explanation_ja}(誤字修正)` });
/** 意味変更の deploy: 旧 ID は retired で残す(バンクから消さない) */
const retire = (q: Question): Question => ({ ...q, status: "retired" });

const lookup = (questions: readonly Question[]) => {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return (id: string) => byId.get(id) ?? null;
};
const bankOf = (questions: Question[], forms: MockForm[] = [FORM_A]) => ({
  questions,
  forms,
  byId: new Map(questions.map((q) => [q.id, q])),
});

// ---- flag 行(DB の question_flag を模す。deploy で書き換えない) ----

let flagSeq = 0;
const flagRow = (q: Pick<Question, "id">, questionRev: number, over: Partial<QuestionFlagRow> = {}): QuestionFlagRow => ({
  id: `00000000-0000-4000-9000-${String(++flagSeq).padStart(12, "0")}`,
  questionId: q.id,
  questionRev,
  reason: "ambiguous",
  memo: null,
  createdAt: NOW,
  resolvedAt: null,
  ...over,
});
const asOpen = (rows: readonly QuestionFlagRow[]): OpenFlag[] =>
  rows.map(({ questionId, questionRev, resolvedAt }) => ({ questionId, questionRev, resolvedAt }));
const ctx = (flags: readonly QuestionFlagRow[] = [], sessions: readonly PoolSession[] = []): PoolContext => ({
  forms: [FORM_A],
  sessions,
  flags: asOpen(flags),
});
/** /api/export・設定画面の「未解決フラグ一覧」(現行 rev の未解決行のみ) */
const unresolvedList = (rows: readonly QuestionFlagRow[], bank: readonly Question[]) =>
  filterCurrentOpenFlags(rows, activeQuestionRevisions(bank));

// 各 gate に実際に到達する (問題, query, 文脈) の組
const DRILL: PoolQuery = { mode: "drill" };
const PRACTICE: PoolQuery = { mode: "practice" };
const PRACTICE_SRS: PoolQuery = { mode: "practice", srs: true };
const MINI_D2: PoolQuery = { mode: "mock", kind: "domain_mini", domainId: "f-d2" };
const FULL_A: PoolQuery = { mode: "mock", kind: "full", exam: "ccar-f", formId: "form-a" };

// ---- mock / answer の deps ----

let sessionSeq = 0;
const mockDeps = (store: FakeMockStore, bank: readonly Question[], now = NOW): MockDeps => ({
  store,
  findQuestion: lookup(bank),
  now,
  newSessionId: () => `00000000-0000-4000-8000-${String(++sessionSeq).padStart(12, "0")}`,
});

class FakeAnswerStore implements AnswerStore {
  attempts = new Map<string, AttemptRow>();
  async findAttempt(id: string) {
    return this.attempts.get(id) ?? null;
  }
  async findSrsState(): Promise<SrsStateUpsert | null> {
    return null;
  }
  async commit(attempt: AttemptRow) {
    this.attempts.set(attempt.attemptId, attempt);
  }
}
const answerDeps = (bank: readonly Question[], flags: readonly QuestionFlagRow[] = []): AnswerDeps => ({
  store: new FakeAnswerStore(),
  findQuestion: lookup(bank),
  poolContext: async () => ctx(flags),
  now: NOW,
});
const drillAnswer = (questionRev: number, questionId = STANDALONE_V1.id) =>
  answerRequestSchema.parse({ kind: "mcq", attempt_id: UUID, question_id: questionId, question_rev: questionRev, mode: "drill", chosen: ["B"] });

describe("rev++(editorial fix)で旧 rev のフラグは superseded(03 §question_flag)", () => {
  const STANDALONE_V2 = bumpRev(STANDALONE_V1);
  const FORMQ_V1 = FORM_V1[0];
  const FORMQ_V2 = bumpRev(FORMQ_V1);
  const V2 = V1.map((q) => (q.id === STANDALONE_V1.id ? STANDALONE_V2 : q.id === FORMQ_V1.id ? FORMQ_V2 : q));
  // v1 時点で付いた未解決フラグ。deploy 後も resolved_at は null のまま残る
  const rev1Flags = [flagRow(STANDALONE_V1, 1), flagRow(FORMQ_V1, 1)];

  it("v1: 現行 rev の未解決フラグは drill / practice / mini / 解放後 practice で open_flag として除外(対照: flag なしは allowed)", () => {
    for (const query of [DRILL, PRACTICE, PRACTICE_SRS, MINI_D2]) {
      expect(evaluatePool(STANDALONE_V1, query, ctx(rev1Flags))).toEqual({ allowed: false, reason: "open_flag" });
      expect(evaluatePool(STANDALONE_V1, query, ctx())).toEqual({ allowed: true });
    }
    expect(evaluatePool(FORMQ_V1, PRACTICE, ctx(rev1Flags, [SUBMITTED_A]))).toEqual({ allowed: false, reason: "open_flag" });
    expect(evaluatePool(FORMQ_V1, PRACTICE, ctx([], [SUBMITTED_A]))).toEqual({ allowed: true });
    expect(evaluatePool(FORMQ_V1, FULL_A, ctx(rev1Flags))).toEqual({ allowed: false, reason: "open_flag" });
    expect(evaluatePool(FORMQ_V1, FULL_A, ctx())).toEqual({ allowed: true });
  });

  it("v1: 未解決一覧に載り、収載フォームは開始不可(form_blocked)", async () => {
    expect(unresolvedList(rev1Flags, V1).map((r) => r.questionId)).toEqual([STANDALONE_V1.id, FORMQ_V1.id]);
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [], asOpen(rev1Flags), mockDeps(new FakeMockStore(), V1));
    expect(r).toEqual({ status: 409, error: "form_blocked", openFlagCount: 1, inactiveCount: 0 });
  });

  it("deploy v2(rev2): resolved_at を更新しなくても旧 rev1 フラグは出題除外から外れる", () => {
    for (const query of [DRILL, PRACTICE, PRACTICE_SRS, MINI_D2]) {
      expect(evaluatePool(STANDALONE_V2, query, ctx(rev1Flags))).toEqual({ allowed: true });
    }
    expect(evaluatePool(FORMQ_V2, PRACTICE, ctx(rev1Flags, [SUBMITTED_A]))).toEqual({ allowed: true });
    expect(evaluatePool(FORMQ_V2, FULL_A, ctx(rev1Flags))).toEqual({ allowed: true });
    expect(rev1Flags.every((r) => r.resolvedAt === null)).toBe(true);
  });

  it("deploy v2: 未解決一覧から自動的に外れ、フォームは開始できる(resolved_at 更新は deploy の成功条件ではない)", async () => {
    expect(unresolvedList(rev1Flags, V2)).toEqual([]);
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [], asOpen(rev1Flags), mockDeps(new FakeMockStore(), V2));
    expect(r.status).toBe(201);
  });

  it("v2 に新たに付いた rev2 フラグは再び除外対象。旧 rev1 行が併存しても rev2 行だけを数える", async () => {
    const both = [...rev1Flags, flagRow(STANDALONE_V2, 2), flagRow(FORMQ_V2, 2)];
    expect(evaluatePool(STANDALONE_V2, DRILL, ctx(both))).toEqual({ allowed: false, reason: "open_flag" });
    expect(unresolvedList(both, V2).map((r) => [r.questionId, r.questionRev])).toEqual([
      [STANDALONE_V2.id, 2],
      [FORMQ_V2.id, 2],
    ]);
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [], asOpen(both), mockDeps(new FakeMockStore(), V2));
    expect(r).toEqual({ status: 409, error: "form_blocked", openFlagCount: 1, inactiveCount: 0 });
  });

  it("解決済みの rev2 フラグは除外しない(対照)", () => {
    const resolved = [flagRow(STANDALONE_V2, 2, { resolvedAt: NOW })];
    expect(evaluatePool(STANDALONE_V2, DRILL, ctx(resolved))).toEqual({ allowed: true });
    expect(unresolvedList(resolved, V2)).toEqual([]);
  });

  it("回答 API: deploy 前の rev1 での回答は stale_question_rev、rev2 は旧 rev1 フラグがあっても受理(attempt は rev2)", async () => {
    expect(await processAnswer(drillAnswer(1), answerDeps(V2, rev1Flags))).toEqual({ status: 409, error: "stale_question_rev" });
    const ok = await processAnswer(drillAnswer(2), answerDeps(V2, rev1Flags));
    expect(ok.status).toBe(200);
    if (ok.status === 200) expect(ok.attempt.questionRev).toBe(2);
    // 対照: v1 では rev1 フラグで拒否されていた
    expect(await processAnswer(drillAnswer(1), answerDeps(V1, rev1Flags))).toEqual({ status: 409, error: "not_eligible", reason: "open_flag" });
  });
});

describe("意味変更(新 ID + 旧 ID retired)で旧 ID は全モードで出題除外(03 §rev のライフサイクル)", () => {
  const OLD = STANDALONE_V1;
  const NEW = mcq("f-d2-q010", { eligible_modes: ["drill", "practice", "mock"] });
  const FORMQ = FORM_V1[1];
  const V2 = [...V1.map((q) => (q.id === OLD.id || q.id === FORMQ.id ? retire(q) : q)), NEW];
  const find = lookup(V2);

  it("旧 ID は drill / practice / practice(srs)/ domain mini で status 除外、新 ID は allowed", () => {
    for (const query of [DRILL, PRACTICE, PRACTICE_SRS, MINI_D2]) {
      expect(evaluatePool(find(OLD.id)!, query, ctx())).toEqual({ allowed: false, reason: "status" });
      expect(evaluatePool(find(NEW.id)!, query, ctx())).toEqual({ allowed: true });
    }
  });

  it("フォーム収載の retired は full 実施でも解放後 practice でも status 除外(対照: active の収載問題は allowed)", () => {
    const retiredFormQ = find(FORMQ.id)!;
    const activeFormQ = find(FORM_V1[2].id)!;
    expect(evaluatePool(retiredFormQ, FULL_A, ctx())).toEqual({ allowed: false, reason: "status" });
    expect(evaluatePool(activeFormQ, FULL_A, ctx())).toEqual({ allowed: true });
    expect(evaluatePool(retiredFormQ, PRACTICE, ctx([], [SUBMITTED_A]))).toEqual({ allowed: false, reason: "status" });
    expect(evaluatePool(activeFormQ, PRACTICE, ctx([], [SUBMITTED_A]))).toEqual({ allowed: true });
  });

  it("retired 化の前後で旧 ID の rev は同じでも、その未解決フラグは一覧に出ない(現行問題に含めない)", () => {
    const rows = [flagRow(OLD, OLD.rev), flagRow(NEW, NEW.rev)];
    expect(unresolvedList(rows, V1.concat(NEW)).map((r) => r.questionId)).toEqual([OLD.id, NEW.id]);
    expect(unresolvedList(rows, V2).map((r) => r.questionId)).toEqual([NEW.id]);
  });

  it("収載問題が retired のフォームは開始不可(実行時の代替差し込みなし。07 Step 6)", async () => {
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [], [], mockDeps(new FakeMockStore(), V2));
    expect(r).toEqual({ status: 409, error: "form_blocked", openFlagCount: 0, inactiveCount: 1 });
  });

  it("回答 API は retired の旧 ID を拒否し、新 ID は受理", async () => {
    expect(await processAnswer(drillAnswer(OLD.rev), answerDeps(V2))).toEqual({ status: 409, error: "not_eligible", reason: "status" });
    const ok = await processAnswer(drillAnswer(NEW.rev, NEW.id), answerDeps(V2));
    expect(ok.status).toBe(200);
  });

  it("間違いノート: 旧 ID の誤答 attempt(履歴行)は残っていても retired は掲載しない。新 ID は別問題として扱う", () => {
    const attempts: MistakeAttempt[] = [
      { attemptId: "00000000-0000-4000-a000-000000000001", questionId: OLD.id, mode: "practice", isCorrect: false, answeredAt: LATER(-60) },
      { attemptId: "00000000-0000-4000-a000-000000000002", questionId: NEW.id, mode: "practice", isCorrect: false, answeredAt: LATER(-30) },
    ];
    // v1 では旧 ID が掲載されていた(対照)
    const before = assembleMistakesView({ bank: bankOf(V1), poolCtx: ctx(), scenarios: null, attempts: attempts.slice(0, 1) });
    expect(before.kind === "ok" && before.items.map((i) => i.questionId)).toEqual([OLD.id]);
    const after = assembleMistakesView({ bank: bankOf(V2), poolCtx: ctx(), scenarios: null, attempts });
    expect(after.kind === "ok" && after.items.map((i) => i.questionId)).toEqual([NEW.id]);
  });
});

describe("日次キュー: 履歴として残る srs_state 行があっても retired / 現行 rev の未解決フラグは due に出さない", () => {
  // 旧 ID の srs_state は削除しない(03 §rev)ので、deploy 後に due 化しうる。due 選定も出題プール判定に従うこと
  const RETIRED = retire(flash("f-d1-q050"));
  const REPLACEMENT = flash("f-d1-q051");
  const EDITED = bumpRev(flash("f-d1-q052"));
  const questions = [RETIRED, REPLACEMENT, EDITED];
  const srsRows = [srsRow(RETIRED.id), srsRow(EDITED.id)];
  const queue = (flags: readonly QuestionFlagRow[]) =>
    buildDailyQueue({
      now: QUEUE_NOW,
      scope: "ccar-f",
      questions,
      syllabi: [syllabus],
      poolCtx: { forms: [], sessions: [], flags: asOpen(flags) },
      srsRows,
      correctQuestionIds: new Set(),
    });
  const ids = (source: "due" | "new", flags: readonly QuestionFlagRow[]) =>
    queue(flags).items.filter((i) => i.source === source).map((i) => i.questionId);

  it("retired の旧 ID は due でも出ず、新 ID は新規候補になる", () => {
    expect(ids("due", [])).toEqual([EDITED.id]);
    expect(ids("new", [])).toEqual([REPLACEMENT.id]);
  });

  it("rev2 の問題は旧 rev1 フラグだけなら due に出て、rev2 フラグが付くと出ない", () => {
    expect(ids("due", [flagRow(EDITED, 1)])).toEqual([EDITED.id]);
    expect(ids("due", [flagRow(EDITED, 1), flagRow(EDITED, 2)])).toEqual([]);
  });
});

describe("exam_session_answer の question_rev snapshot は deploy 後も不変(03 §exam_session)", () => {
  /**
   * v2: 全問 rev++。うち 1 問は retired、1 問には rev2 の未解決フラグ。
   * 進行中セッションは出題プールを再評価しないので、いずれも継続・提出できなければならない
   */
  const V2 = V1.map(bumpRev).map((q) => (q.id === FORM_V1[1].id || q.id === MINI_V1[1].id ? retire(q) : q));
  const V2_FLAGS = asOpen([flagRow(FORM_V1[0], 2), flagRow(MINI_V1[0], 2)]);

  const startFullV1 = async (store: FakeMockStore) => {
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [], [], mockDeps(store, V1));
    if (r.status !== 201) throw new Error(`開始失敗: ${JSON.stringify(r)}`);
    return r.session;
  };
  const revsOf = (rows: readonly { questionId: string; questionRev: number }[]) => new Set(rows.map((a) => a.questionRev));

  it("full: 開始時に rev1 を snapshot し、deploy 後の復元・回答・位置保存・提出の全経路で rev1 のまま", async () => {
    const store = new FakeMockStore();
    const session = await startFullV1(store);
    expect(revsOf(store.answers.get(session.id)!)).toEqual(new Set([1]));

    // ここで deploy(store はそのまま、バンクだけ v2)
    const d = mockDeps(store, V2, LATER(10));
    // v2 のバンクではこのフォームは新規開始できない(= プールは v2 で評価されている)
    expect(await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [], V2_FLAGS, mockDeps(new FakeMockStore(), V2))).toEqual({
      status: 409,
      error: "form_blocked",
      openFlagCount: 1,
      inactiveCount: 1,
    });

    const restored = await restoreCurrent(d);
    expect(restored.status === 200 && restored.kind === "in_progress" && revsOf(restored.answers)).toEqual(new Set([1]));

    // retired 化した問題・rev2 フラグが付いた問題への回答保存も、プール再評価で弾かれない
    for (const q of [FORM_V1[0], FORM_V1[1], FORM_V1[2]]) {
      expect((await saveAnswer(session.id, q.id, { chosen: ["B"], flagged: true }, d)).status).toBe(200);
    }
    expect((await savePosition(session.id, 59, d)).status).toBe(200);
    expect(revsOf(store.answers.get(session.id)!)).toEqual(new Set([1]));

    const submitted = await submitSession(session.id, d);
    expect(submitted).toMatchObject({ status: 200, replayed: false, session: { status: "submitted", submissionReason: "manual", scoreRaw: 3 } });
    expect(store.attempts).toHaveLength(60);
    expect(revsOf(store.attempts)).toEqual(new Set([1]));
  });

  it("full: 期限超過後の復元(timeout 提出)でも attempt は snapshot rev", async () => {
    const store = new FakeMockStore();
    const session = await startFullV1(store);
    await saveAnswer(session.id, FORM_V1[1].id, { chosen: ["B"] }, mockDeps(store, V2, LATER(30)));
    const restored = await restoreCurrent(mockDeps(store, V2, LATER(121)));
    expect(restored).toMatchObject({ status: 200, kind: "timed_out", session: { id: session.id, submissionReason: "timeout", scoreRaw: 1 } });
    expect(store.attempts).toHaveLength(60);
    expect(revsOf(store.attempts)).toEqual(new Set([1]));
  });

  it("domain mini: 同様に deploy 後も snapshot rev で提出される", async () => {
    const store = new FakeMockStore();
    const started = await startSession(
      { exam: "ccar-f", kind: "domain_mini", formId: null, domainId: "f-d2", questionIds: MINI_V1.map((q) => q.id), durationMin: 30 },
      mockDeps(store, V1),
    );
    if (started.status !== 201) throw new Error(`開始失敗: ${JSON.stringify(started)}`);
    const d = mockDeps(store, V2, LATER(5));
    expect((await saveAnswer(started.session.id, MINI_V1[1].id, { chosen: ["B"] }, d)).status).toBe(200);
    expect((await saveAnswer(started.session.id, MINI_V1[2].id, { chosen: ["B", "A"] }, d)).status).toBe(200);
    const restored = await restoreCurrent(d);
    expect(restored.status === 200 && restored.kind === "in_progress" && revsOf(restored.answers)).toEqual(new Set([1]));
    expect(await submitSession(started.session.id, d)).toMatchObject({ status: 200, session: { scoreRaw: 2 } });
    expect(store.attempts.map((a) => [a.questionId, a.questionRev])).toEqual(MINI_V1.map((q) => [q.id, 1]));
  });

  it("deploy 後に新規開始したセッションは v2 の rev を snapshot する(対照)", async () => {
    const store = new FakeMockStore();
    const V2_ACTIVE = V1.map(bumpRev);
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [], [], mockDeps(store, V2_ACTIVE));
    expect(r.status === 201 && revsOf(r.answers)).toEqual(new Set([2]));
  });
});

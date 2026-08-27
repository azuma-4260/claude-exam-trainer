import { describe, expect, it } from "vitest";
import { mockFormSchema, type MockForm, type Question } from "@/lib/bank/schema";
import type { OpenFlag, PoolSession } from "@/lib/bank/pool";
import type { ExamSessionAnswerRow, ExamSessionRow, SubmissionReason } from "@/db/schema";
import { mcq } from "@/lib/queue/test-fixtures";
import {
  FULL_DURATION_MIN,
  abandonSession,
  gradeMockAnswers,
  restoreCurrent,
  saveAnswer,
  savePosition,
  startFullMock,
  startSession,
  submitSession,
  type AnswerKeyEntry,
  type MockDeps,
  type MockStore,
} from "./lifecycle";

// T-mock: 模試ライフサイクルの状態遷移(specs/03 §exam_session, §Mock の attempt 生成)。
// 実装(D3-1)と同一 worktree で green にしてから main に入れる(09 §1-2)。

const NOW = new Date("2026-08-27T10:00:00+09:00");
const LATER = (min: number) => new Date(NOW.getTime() + min * 60_000);

/** form-a: 60 問(f-d1 16 / f-d2 11 / f-d3 12 / f-d4 12 / f-d5 9)の fixture */
const QUOTA: Record<string, number> = { "f-d1": 16, "f-d2": 11, "f-d3": 12, "f-d4": 12, "f-d5": 9 };
const FORM_QUESTIONS: Question[] = Object.entries(QUOTA).flatMap(([domain, n]) =>
  Array.from({ length: n }, (_, i) =>
    mcq(`${domain}-q${String(i + 1).padStart(3, "0")}`, {
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
  question_ids: FORM_QUESTIONS.map((q) => q.id),
});

/** mini 用の独立 MCQ(3 問) */
const MINI_QUESTIONS: Question[] = [
  mcq("f-d2-q900", { eligible_modes: ["drill", "practice", "mock"] }),
  mcq("f-d2-q901", { eligible_modes: ["drill", "practice", "mock"] }),
  mcq("f-d2-q902", { eligible_modes: ["drill", "practice", "mock"], type: "mcq_multi", answer: ["A", "B"], stem_en: "Select TWO transports." }),
];

const ALL = new Map([...FORM_QUESTIONS, ...MINI_QUESTIONS].map((q) => [q.id, q]));

/**
 * MockStore の in-memory 実装。submit は store 契約(claim 成功時のみ attempt 生成)を
 * gradeMockAnswers で再現する(実 SQL の形は store.test.ts で検証)。
 */
class FakeMockStore implements MockStore {
  sessions = new Map<string, ExamSessionRow>();
  answers = new Map<string, ExamSessionAnswerRow[]>();
  attempts: ReturnType<typeof gradeMockAnswers>["attempts"] = [];

  async findInProgress(): Promise<ExamSessionRow | null> {
    return [...this.sessions.values()].find((s) => s.status === "in_progress") ?? null;
  }
  async findSession(id: string): Promise<ExamSessionRow | null> {
    return this.sessions.get(id) ?? null;
  }
  async listAnswers(sessionId: string): Promise<ExamSessionAnswerRow[]> {
    return this.answers.get(sessionId) ?? [];
  }
  async createSession(session: ExamSessionRow, answers: ExamSessionAnswerRow[]): Promise<boolean> {
    // store 契約: 「進行中は 1 件」のチェックと作成を排他的・原子的に行う
    if ([...this.sessions.values()].some((s) => s.status === "in_progress")) return false;
    this.sessions.set(session.id, session);
    this.answers.set(session.id, answers.map((a) => ({ ...a })));
    return true;
  }
  async patchAnswer(sessionId: string, questionId: string, patch: { chosen?: string[] | null; flagged?: boolean }, now: Date): Promise<boolean> {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== "in_progress") return false; // 条件付き UPDATE: terminal 後は 0 行
    const row = this.answers.get(sessionId)?.find((a) => a.questionId === questionId);
    if (!row) return false;
    if (patch.chosen !== undefined) {
      row.chosen = patch.chosen;
      row.answerUpdatedAt = now;
    }
    if (patch.flagged !== undefined) row.flagged = patch.flagged;
    row.updatedAt = now;
    return true;
  }
  async savePosition(sessionId: string, currentIndex: number): Promise<boolean> {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== "in_progress") return false;
    s.currentIndex = currentIndex;
    return true;
  }
  async submit(sessionId: string, reason: SubmissionReason, finishedAt: Date, key: AnswerKeyEntry[]): Promise<boolean> {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== "in_progress") return false; // claim 0 行 → 副作用なし
    const graded = gradeMockAnswers(this.answers.get(sessionId) ?? [], key, finishedAt);
    s.status = "submitted";
    s.submissionReason = reason;
    s.finishedAt = finishedAt;
    s.scoreRaw = graded.scoreRaw;
    this.attempts.push(...graded.attempts.map((a) => ({ ...a, sessionId })));
    return true;
  }
  async abandon(sessionId: string, finishedAt: Date): Promise<boolean> {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== "in_progress") return false;
    s.status = "abandoned";
    s.finishedAt = finishedAt;
    return true;
  }
}

let seq = 0;
const deps = (store: FakeMockStore, now = NOW): MockDeps => ({
  store,
  findQuestion: (id) => ALL.get(id) ?? null,
  now,
  newSessionId: () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`,
});

const startFull = async (store: FakeMockStore, now = NOW) => {
  const r = await startFullMock("form-a", [FORM_A], [], [], deps(store, now));
  if (r.status !== 201) throw new Error(`開始失敗: ${JSON.stringify(r)}`);
  return r.session;
};
const startMini = async (store: FakeMockStore, now = NOW) => {
  const r = await startSession(
    { exam: "ccar-f", kind: "domain_mini", formId: null, domainId: "f-d2", questionIds: MINI_QUESTIONS.map((q) => q.id), durationMin: 30 },
    deps(store, now),
  );
  if (r.status !== 201) throw new Error(`開始失敗: ${JSON.stringify(r)}`);
  return r.session;
};

describe("開始: 全行一括生成と rev snapshot(03 §exam_session)", () => {
  it("60 問全問の answer 行を chosen=null / flagged=false で生成し、question_rev を snapshot する", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    expect(session.status).toBe("in_progress");
    expect(session.questionIds).toHaveLength(60);
    const answers = await store.listAnswers(session.id);
    expect(answers).toHaveLength(60);
    expect(answers.every((a) => a.chosen === null && !a.flagged && a.answerUpdatedAt === null)).toBe(true);
    expect(answers.every((a) => a.questionRev === ALL.get(a.questionId)?.rev)).toBe(true);
  });
  it("deadline_at はサーバー確定(full = started_at + 120 分)", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    expect(FULL_DURATION_MIN).toBe(120);
    expect(session.startedAt).toEqual(NOW);
    expect(session.deadlineAt).toEqual(LATER(120));
    expect(session.currentIndex).toBe(0);
  });
  it("未知の form / バンクに無い問題は開始不可", async () => {
    const store = new FakeMockStore();
    expect((await startFullMock("form-zz", [FORM_A], [], [], deps(store))).status).toBe(404);
    const broken = { ...FORM_A, question_ids: [...FORM_A.question_ids.slice(0, 59), "f-d1-q999"] };
    const r = await startFullMock("form-a", [broken], [], [], deps(store));
    expect(r.status).toBe(404);
    expect(store.sessions.size).toBe(0);
  });
});

describe("単一進行中の強制(オーナー決定 2026-08-27: 全 kind で 1 件)", () => {
  it("同 kind の再送・二重クリックは 409 + 既存セッション参照", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    const r = await startFullMock("form-a", [FORM_A], [], [], deps(store));
    expect(r).toMatchObject({ status: 409, error: "session_in_progress", session: { id: session.id } });
    expect(store.sessions.size).toBe(1);
  });
  it("交差 kind: full 進行中の mini 開始も 409", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    const r = await startSession(
      { exam: "ccar-f", kind: "domain_mini", formId: null, domainId: "f-d2", questionIds: MINI_QUESTIONS.map((q) => q.id), durationMin: 30 },
      deps(store),
    );
    expect(r).toMatchObject({ status: 409, error: "session_in_progress", session: { id: session.id } });
  });
  it("同時開始の競合: 事前チェックをすり抜けても createSession の原子的排他で 409 になる", async () => {
    const store = new FakeMockStore();
    const winner = await startFull(store);
    // レースを模擬: 負けた側の事前チェック時点では winner がまだ「見えない」
    let first = true;
    const racingStore: MockStore = Object.assign(Object.create(Object.getPrototypeOf(store)) as FakeMockStore, store, {
      findInProgress: async () => {
        if (first) {
          first = false;
          return null;
        }
        return store.findInProgress();
      },
    });
    const r = await startSession(
      { exam: "ccar-f", kind: "domain_mini", formId: null, domainId: "f-d2", questionIds: MINI_QUESTIONS.map((q) => q.id), durationMin: 30 },
      { ...deps(store), store: racingStore },
    );
    expect(r).toMatchObject({ status: 409, error: "session_in_progress", session: { id: winner.id } });
    expect(store.sessions.size).toBe(1);
  });
  it("提出済みになれば次のセッションを開始できる", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    await submitSession(session.id, deps(store, LATER(10)));
    expect((await startMini(store, LATER(20))).status).toBe("in_progress");
  });
});

describe("availability 検証(D3-2, 01 FR-5)", () => {
  const flagOn = (q: Question): OpenFlag => ({ questionId: q.id, questionRev: q.rev, resolvedAt: null });
  const SUBMITTED_A: PoolSession = { exam: "ccar-f", kind: "full", formId: "form-a", status: "submitted" };

  // 全 block 検証用の 2 本目の form(FORM_A と収載重複なし)
  const FORM_B_QUESTIONS: Question[] = Array.from({ length: 60 }, (_, i) =>
    mcq(`f-d3-q${String(500 + i)}`, { scenario_id: "sc-form-b", eligible_modes: ["mock", "practice"], srs_eligible: false }),
  );
  const FORM_B: MockForm = mockFormSchema.parse({
    id: "form-b",
    exam: "ccar-f",
    scenario_ids: ["sc-form-b"],
    question_ids: FORM_B_QUESTIONS.map((q) => q.id),
  });
  const B_MAP = new Map(FORM_B_QUESTIONS.map((q) => [q.id, q]));
  const depsAB = (store: FakeMockStore, now = NOW): MockDeps => ({
    ...deps(store, now),
    findQuestion: (id) => ALL.get(id) ?? B_MAP.get(id) ?? null,
  });

  it("現行 rev の未解決フラグを持つ問題を含む form は 409 form_blocked でセッションを作らない(DoD)", async () => {
    const store = new FakeMockStore();
    const r = await startFullMock("form-a", [FORM_A], [], [flagOn(FORM_QUESTIONS[0])], deps(store));
    expect(r).toEqual({ status: 409, error: "form_blocked", openFlagCount: 1, inactiveCount: 0 });
    expect(store.sessions.size).toBe(0);
  });

  it("status≠active の問題を含む form も 409 form_blocked", async () => {
    const store = new FakeMockStore();
    const retired: Question = { ...FORM_QUESTIONS[0], status: "retired" };
    const d: MockDeps = { ...deps(store), findQuestion: (id) => (id === retired.id ? retired : ALL.get(id) ?? null) };
    const r = await startFullMock("form-a", [FORM_A], [], [], d);
    expect(r).toEqual({ status: 409, error: "form_blocked", openFlagCount: 0, inactiveCount: 1 });
    expect(store.sessions.size).toBe(0);
  });

  it("旧 rev のフラグは superseded として無視され開始できる", async () => {
    const store = new FakeMockStore();
    const stale: OpenFlag = { questionId: FORM_QUESTIONS[0].id, questionRev: FORM_QUESTIONS[0].rev - 1, resolvedAt: null };
    expect((await startFullMock("form-a", [FORM_A], [], [stale], deps(store))).status).toBe(201);
  });

  it("提出済み form の再受験(rehearsal)も明示 form_id なら 201 で開始できる", async () => {
    const store = new FakeMockStore();
    const first = await startFull(store);
    await submitSession(first.id, deps(store, LATER(10)));
    const r = await startFullMock("form-a", [FORM_A], [SUBMITTED_A], [], deps(store, LATER(20)));
    expect(r.status).toBe(201);
  });

  it("全 form が block されていればどの form_id でも 409 form_blocked(DoD: 全 block で開始拒否)", async () => {
    const store = new FakeMockStore();
    const flags = [flagOn(FORM_QUESTIONS[0]), flagOn(FORM_B_QUESTIONS[0])];
    for (const formId of ["form-a", "form-b"]) {
      const r = await startFullMock(formId, [FORM_A, FORM_B], [], flags, depsAB(store));
      expect(r, formId).toMatchObject({ status: 409, error: "form_blocked" });
    }
    expect(store.sessions.size).toBe(0);
  });

  it("開始後にフラグが追加されても進行中セッションの問題集合は固定される(01 FR-5)", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    // フラグ追加後の再送: availability より進行中セッションの解決が先(409 session_in_progress)
    const r = await startFullMock("form-a", [FORM_A], [], [flagOn(FORM_QUESTIONS[0])], deps(store, LATER(5)));
    expect(r).toMatchObject({ status: 409, error: "session_in_progress", session: { id: session.id } });
    expect((await store.findSession(session.id))?.questionIds).toEqual(FORM_A.question_ids);
  });

  it("バンクに無い問題を含む form は flags があっても従来どおり 404 unknown_question(API 契約の回帰なし)", async () => {
    const store = new FakeMockStore();
    const broken: MockForm = { ...FORM_A, question_ids: [...FORM_A.question_ids.slice(0, 59), "f-d1-q999"] };
    const r = await startFullMock("form-a", [broken], [], [flagOn(FORM_QUESTIONS[1])], deps(store));
    expect(r).toMatchObject({ status: 404, error: "unknown_question" });
    expect(store.sessions.size).toBe(0);
  });

  it("未実施フォームは自動選択(定義順先頭の available)以外を開始できない(01 FR-5 の自動選択)", async () => {
    const store = new FakeMockStore();
    const r = await startFullMock("form-b", [FORM_A, FORM_B], [], [], depsAB(store));
    expect(r).toEqual({ status: 409, error: "form_not_next", recommendedFormId: "form-a" });
    expect(store.sessions.size).toBe(0);
    expect((await startFullMock("form-a", [FORM_A, FORM_B], [], [], depsAB(store))).status).toBe(201);
  });

  it("先頭フォームが block なら次の有効な未実施フォームが自動選択になる", async () => {
    const store = new FakeMockStore();
    const flags = [flagOn(FORM_QUESTIONS[0])];
    expect((await startFullMock("form-b", [FORM_A, FORM_B], [], flags, depsAB(store))).status).toBe(201);
  });

  it("提出済みフォームの rehearsal は自動選択の対象外でも開始できる", async () => {
    const store = new FakeMockStore();
    // form-a 提出済み・form-b 未実施: 推奨は form-b だが form-a の再受験は許可
    const r = await startFullMock("form-a", [FORM_A, FORM_B], [SUBMITTED_A], [], depsAB(store));
    expect(r.status).toBe(201);
  });

  it("未実施かつ blocked のフォームは form_not_next ではなく form_blocked を返す(理由の明示)", async () => {
    const store = new FakeMockStore();
    const flags = [flagOn(FORM_B_QUESTIONS[0])];
    const r = await startFullMock("form-b", [FORM_A, FORM_B], [], flags, depsAB(store));
    expect(r).toMatchObject({ status: 409, error: "form_blocked", openFlagCount: 1 });
  });
});

describe("操作ごと保存(03: 回答・見直しフラグ・現在位置)", () => {
  it("回答保存は chosen と answer_updated_at を更新する", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    const r = await saveAnswer(session.id, "f-d1-q001", { chosen: ["B"] }, deps(store, LATER(5)));
    expect(r.status).toBe(200);
    const row = (await store.listAnswers(session.id)).find((a) => a.questionId === "f-d1-q001");
    expect(row).toMatchObject({ chosen: ["B"], answerUpdatedAt: LATER(5) });
  });
  it("フラグのみの変更は answer_updated_at を動かさない(03: 回答変更時のみ更新)", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    await saveAnswer(session.id, "f-d1-q001", { chosen: ["B"] }, deps(store, LATER(5)));
    await saveAnswer(session.id, "f-d1-q001", { flagged: true }, deps(store, LATER(6)));
    const row = (await store.listAnswers(session.id)).find((a) => a.questionId === "f-d1-q001");
    expect(row).toMatchObject({ flagged: true, answerUpdatedAt: LATER(5) });
  });
  it("current_index は範囲検証のうえ保存する", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    expect((await savePosition(session.id, 59, deps(store))).status).toBe(200);
    expect((await store.findSession(session.id))?.currentIndex).toBe(59);
    expect((await savePosition(session.id, 60, deps(store))).status).toBe(400);
    expect((await savePosition(session.id, -1, deps(store))).status).toBe(400);
  });
  it("セッション外の問題・未知セッションへの保存は 404", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    expect((await saveAnswer(session.id, "f-d2-q900", { chosen: ["A"] }, deps(store))).status).toBe(404);
    expect((await saveAnswer("00000000-0000-4000-8000-999999999999", "f-d1-q001", { chosen: ["A"] }, deps(store))).status).toBe(404);
  });
  it("terminal 後の保存は拒否され行が書き換わらない(条件付き更新)", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    await saveAnswer(session.id, "f-d1-q001", { chosen: ["B"] }, deps(store, LATER(5)));
    await submitSession(session.id, deps(store, LATER(10)));
    const r = await saveAnswer(session.id, "f-d1-q001", { chosen: ["A"] }, deps(store, LATER(11)));
    expect(r).toMatchObject({ status: 409, error: "session_terminal" });
    const row = (await store.listAnswers(session.id)).find((a) => a.questionId === "f-d1-q001");
    expect(row?.chosen).toEqual(["B"]);
  });
});

describe("期限超過の収束: 全経路が submitted/timeout に落ちる(01 FR-5, 03)", () => {
  it("期限後の回答保存 → timeout 提出が先に走り、保存は terminal 拒否", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    const r = await saveAnswer(session.id, "f-d1-q001", { chosen: ["B"] }, deps(store, LATER(121)));
    expect(r).toMatchObject({ status: 409, error: "session_terminal" });
    expect(await store.findSession(session.id)).toMatchObject({ status: "submitted", submissionReason: "timeout" });
    const row = (await store.listAnswers(session.id)).find((a) => a.questionId === "f-d1-q001");
    expect(row?.chosen).toBeNull();
  });
  it("期限後の manual submit は timeout として記録される(manual にならない)", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    const r = await submitSession(session.id, deps(store, LATER(121)));
    expect(r.status).toBe(200);
    expect(await store.findSession(session.id)).toMatchObject({ status: "submitted", submissionReason: "timeout" });
  });
  it("期限後の position 保存・abandon も timeout 提出に収束する", async () => {
    const store = new FakeMockStore();
    const session = await startMini(store);
    const r = await savePosition(session.id, 1, deps(store, LATER(31)));
    expect(r).toMatchObject({ status: 409, error: "session_terminal" });
    expect(await store.findSession(session.id)).toMatchObject({ status: "submitted", submissionReason: "timeout" });

    const store2 = new FakeMockStore();
    const s2 = await startMini(store2);
    expect((await abandonSession(s2.id, deps(store2, LATER(31)))).status).toBe(409);
    expect(await store2.findSession(s2.id)).toMatchObject({ status: "submitted", submissionReason: "timeout" });
  });
  it("復元も期限超過を検知して timeout 提出する(クライアント時計に依存しない)", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    const r = await restoreCurrent(deps(store, LATER(121)));
    expect(r).toMatchObject({ status: 200, kind: "timed_out", session: { id: session.id, status: "submitted", submissionReason: "timeout" } });
  });
  it("期限ちょうどまでは in_progress のまま保存できる", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    expect((await saveAnswer(session.id, "f-d1-q001", { chosen: ["B"] }, deps(store, LATER(120)))).status).toBe(200);
  });
});

describe("提出: attempt 一括生成と score_raw(03 §Mock の attempt 生成)", () => {
  it("manual 提出で全問の attempt を一括生成し、terminal 更新する", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    await saveAnswer(session.id, "f-d1-q001", { chosen: ["B"] }, deps(store, LATER(5))); // 正解
    await saveAnswer(session.id, "f-d1-q002", { chosen: ["A"] }, deps(store, LATER(6))); // 誤答
    const r = await submitSession(session.id, deps(store, LATER(10)));
    expect(r).toMatchObject({ status: 200, replayed: false });
    expect(await store.findSession(session.id)).toMatchObject({
      status: "submitted",
      submissionReason: "manual",
      finishedAt: LATER(10),
      scoreRaw: 1,
    });
    expect(store.attempts).toHaveLength(60);
    expect(store.attempts.every((a) => a.mode === "mock" && a.appliedRating === null && a.elapsedMs === null)).toBe(true);
  });
  it("answered_at: 回答済は answer_updated_at、未回答は finished_at(未回答 is_correct=false)", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    await saveAnswer(session.id, "f-d1-q001", { chosen: ["B"] }, deps(store, LATER(5)));
    await submitSession(session.id, deps(store, LATER(10)));
    const answered = store.attempts.find((a) => a.questionId === "f-d1-q001");
    expect(answered).toMatchObject({ isCorrect: true, chosen: ["B"], answeredAt: LATER(5) });
    const unanswered = store.attempts.find((a) => a.questionId === "f-d1-q002");
    expect(unanswered).toMatchObject({ isCorrect: false, chosen: null, answeredAt: LATER(10) });
  });
  it("question_rev は開始時の snapshot 値を使う(提出時のバンク rev ではない)", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    for (const a of store.answers.get(session.id) ?? []) a.questionRev = 7; // 開始時 snapshot を模擬
    await submitSession(session.id, deps(store, LATER(10)));
    expect(store.attempts.every((a) => a.questionRev === 7)).toBe(true);
  });
  it("FSRS は更新されない(04 モード行列): applied_rating は常に null", async () => {
    const store = new FakeMockStore();
    const session = await startMini(store);
    await saveAnswer(session.id, "f-d2-q900", { chosen: ["B"] }, deps(store, LATER(1)));
    await submitSession(session.id, deps(store, LATER(2)));
    expect(store.attempts).toHaveLength(3);
    expect(store.attempts.every((a) => a.appliedRating === null)).toBe(true);
  });
});

describe("提出の冪等性と abandon 競合(03: 再提出 200 / claim 0 行で副作用なし)", () => {
  it("二重 submit: 2 回目は replayed=true の 200 で attempt が増えない", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    await submitSession(session.id, deps(store, LATER(10)));
    const r = await submitSession(session.id, deps(store, LATER(11)));
    expect(r).toMatchObject({ status: 200, replayed: true });
    expect(store.attempts).toHaveLength(60);
    expect(await store.findSession(session.id)).toMatchObject({ finishedAt: LATER(10), submissionReason: "manual" });
  });
  it("abandon 先着後の submit は 409 で attempt を 1 行も残さない", async () => {
    const store = new FakeMockStore();
    const session = await startMini(store);
    await abandonSession(session.id, deps(store, LATER(1)));
    const r = await submitSession(session.id, deps(store, LATER(2)));
    expect(r).toMatchObject({ status: 409, error: "session_abandoned" });
    expect(store.attempts).toHaveLength(0);
    expect(await store.findSession(session.id)).toMatchObject({ status: "abandoned" });
  });
});

describe("abandon: full 不可 / domain_mini 可(01 FR-5)", () => {
  it("full は abandon できない", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    const r = await abandonSession(session.id, deps(store, LATER(1)));
    expect(r).toMatchObject({ status: 409, error: "abandon_not_allowed" });
    expect(await store.findSession(session.id)).toMatchObject({ status: "in_progress" });
  });
  it("mini は abandon でき、attempt は生成されない", async () => {
    const store = new FakeMockStore();
    const session = await startMini(store);
    const r = await abandonSession(session.id, deps(store, LATER(1)));
    expect(r.status).toBe(200);
    expect(await store.findSession(session.id)).toMatchObject({ status: "abandoned", finishedAt: LATER(1) });
    expect(store.attempts).toHaveLength(0);
  });
  it("提出済みセッションの abandon は 409", async () => {
    const store = new FakeMockStore();
    const session = await startMini(store);
    await submitSession(session.id, deps(store, LATER(1)));
    expect((await abandonSession(session.id, deps(store, LATER(2)))).status).toBe(409);
  });
});

describe("復元(05 S-5: 閉じても再開できる)", () => {
  it("進行中セッションと回答状態を返す", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    await saveAnswer(session.id, "f-d1-q001", { chosen: ["B"] }, deps(store, LATER(5)));
    await savePosition(session.id, 3, deps(store, LATER(5)));
    const r = await restoreCurrent(deps(store, LATER(30)));
    expect(r).toMatchObject({ status: 200, kind: "in_progress", session: { id: session.id, currentIndex: 3 } });
    if (r.status === 200 && r.kind === "in_progress") {
      expect(r.answers.find((a) => a.questionId === "f-d1-q001")?.chosen).toEqual(["B"]);
    }
  });
  it("進行中が無ければ 204", async () => {
    const store = new FakeMockStore();
    expect((await restoreCurrent(deps(store))).status).toBe(204);
    const session = await startMini(store);
    await abandonSession(session.id, deps(store, LATER(1)));
    expect((await restoreCurrent(deps(store, LATER(2)))).status).toBe(204);
  });
});

describe("gradeMockAnswers: 採点規則の単一ソース(store 実装の意味論)", () => {
  const key: AnswerKeyEntry[] = [
    { questionId: "f-d2-q900", correct: ["B"] },
    { questionId: "f-d2-q902", correct: ["A", "B"] },
  ];
  const row = (questionId: string, over: Partial<ExamSessionAnswerRow> = {}): ExamSessionAnswerRow => ({
    sessionId: "s1",
    questionId,
    questionRev: 1,
    chosen: null,
    flagged: false,
    answerUpdatedAt: null,
    updatedAt: NOW,
    ...over,
  });
  it("mcq_multi は集合一致(順序不問・部分点なし)", () => {
    const g = gradeMockAnswers(
      [row("f-d2-q902", { chosen: ["B", "A"], answerUpdatedAt: LATER(1) }), row("f-d2-q900", { chosen: ["A"], answerUpdatedAt: LATER(2) })],
      key,
      LATER(9),
    );
    expect(g.scoreRaw).toBe(1);
    expect(g.attempts.find((a) => a.questionId === "f-d2-q902")?.isCorrect).toBe(true);
    expect(g.attempts.find((a) => a.questionId === "f-d2-q900")?.isCorrect).toBe(false);
  });
  it("回答を取り消した(chosen=null だが answer_updated_at が残る)問題は未回答扱いで answered_at=finished_at", () => {
    const g = gradeMockAnswers([row("f-d2-q900", { chosen: null, answerUpdatedAt: LATER(3) })], key, LATER(9));
    expect(g.attempts[0]).toMatchObject({ isCorrect: false, chosen: null, answeredAt: LATER(9) });
  });
  it("正答集合に無い問題は is_correct=false(欠落 key への防御)", () => {
    const g = gradeMockAnswers([row("f-d9-q999", { chosen: ["A"] })], key, LATER(9));
    expect(g.scoreRaw).toBe(0);
    expect(g.attempts[0]).toMatchObject({ isCorrect: false });
  });
});

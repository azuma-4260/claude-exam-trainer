import { describe, expect, it } from "vitest";
import { mockFormSchema, type MockForm, type Question } from "@/lib/bank/schema";
import type { OpenFlag, PoolSession } from "@/lib/bank/pool";
import type { ExamSessionAnswerRow } from "@/db/schema";
import { bundle, mcq, syllabus } from "@/lib/queue/test-fixtures";
import { FakeMockStore } from "./test-store";
import {
  FULL_DURATION_MIN,
  MINI_MINUTES_PER_QUESTION,
  MINI_QUESTION_MAX,
  MINI_QUESTION_MIN,
  abandonSession,
  gradeMockAnswers,
  pickMiniQuestions,
  restoreCurrent,
  saveAnswer,
  savePosition,
  startDomainMini,
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

/** T-bundle: まとめ形式(小問 3 件、answer = A, B, A)。MINI_QUESTIONS とは別に持ち、既存テストの件数を変えない */
const BUNDLE = bundle("f-d2-q910");

/**
 * D4-1: f-d2 の独立 MCQ プール 20 問(mock 適格・scenario_id=null)+ 候補から外れるべき問題群。
 * syllabus fixture は f-d1 / f-d2 の 2 ドメイン
 */
const MOCK_MODES = ["drill", "practice", "mock"] as const;
const D2_POOL: Question[] = Array.from({ length: 20 }, (_, i) =>
  mcq(`f-d2-q${String(500 + i)}`, { eligible_modes: [...MOCK_MODES] }),
);
const D2_EXCLUDED = {
  scenario: mcq("f-d2-q600", { eligible_modes: [...MOCK_MODES], scenario_id: "sc-standalone" }),
  inactive: mcq("f-d2-q601", { eligible_modes: [...MOCK_MODES], status: "retired" }),
  flagged: mcq("f-d2-q602", { eligible_modes: [...MOCK_MODES] }),
  practiceOnly: mcq("f-d2-q603", { eligible_modes: ["practice"] }),
  otherDomain: mcq("f-d1-q700", { eligible_modes: [...MOCK_MODES] }),
};
const D2_FLAG: OpenFlag = { questionId: D2_EXCLUDED.flagged.id, questionRev: D2_EXCLUDED.flagged.rev, resolvedAt: null };
const MINI_BANK: Question[] = [...FORM_QUESTIONS, ...D2_POOL, ...Object.values(D2_EXCLUDED)];
const SUBMITTED_A: PoolSession = { exam: "ccar-f", kind: "full", formId: "form-a", status: "submitted" };
/** 決定的な乱数(常に 0 → シャッフルで各要素が先頭へ順送りされる) */
const zeroRandom = () => 0;

const ALL = new Map([...FORM_QUESTIONS, ...MINI_QUESTIONS, ...MINI_BANK, BUNDLE].map((q) => [q.id, q]));

let seq = 0;
const deps = (store: FakeMockStore, now = NOW): MockDeps => ({
  store,
  findQuestion: (id) => ALL.get(id) ?? null,
  now,
  newSessionId: () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`,
});

const startFull = async (store: FakeMockStore, now = NOW) => {
  const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [], [], deps(store, now));
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

const startMiniD2 = (store: FakeMockStore, over: { sessions?: PoolSession[]; flags?: OpenFlag[]; now?: Date; bank?: Question[] } = {}) =>
  startDomainMini(
    "f-d2",
    over.bank ?? MINI_BANK,
    { forms: [FORM_A], sessions: over.sessions ?? [], flags: over.flags ?? [D2_FLAG] },
    syllabus,
    deps(store, over.now),
    zeroRandom,
  );

describe("domain mini 開始: 独立 MCQ プールのみ(D4-1, 01 FR-5, 03 §出題プールの判定順序)", () => {
  it("フォーム収載問題(未提出・提出済みとも)・シナリオ問題・他ドメイン・inactive・現行 rev フラグ・mock 非適格は候補に 0 件(DoD)", async () => {
    for (const sessions of [[], [SUBMITTED_A]]) {
      const store = new FakeMockStore();
      const r = await startMiniD2(store, { sessions });
      if (r.status !== 201) throw new Error(JSON.stringify(r));
      const ids = new Set(r.session.questionIds);
      expect(FORM_QUESTIONS.some((q) => ids.has(q.id))).toBe(false);
      for (const q of Object.values(D2_EXCLUDED)) expect(ids.has(q.id)).toBe(false);
      expect(r.session.questionIds.every((id) => D2_POOL.some((q) => q.id === id))).toBe(true);
    }
  });

  it("問題数は min(MAX, プール数)、kind=domain_mini / domain_id / form_id=null、deadline は 2 分 × 問題数", async () => {
    const store = new FakeMockStore();
    const r = await startMiniD2(store);
    if (r.status !== 201) throw new Error(JSON.stringify(r));
    expect(r.session.questionIds).toHaveLength(MINI_QUESTION_MAX);
    expect(new Set(r.session.questionIds).size).toBe(MINI_QUESTION_MAX);
    expect(r.session).toMatchObject({ kind: "domain_mini", domainId: "f-d2", formId: null, exam: "ccar-f", status: "in_progress" });
    expect(r.session.deadlineAt).toEqual(LATER(MINI_QUESTION_MAX * MINI_MINUTES_PER_QUESTION));
    expect(r.answers).toHaveLength(MINI_QUESTION_MAX);
    expect(r.answers.every((a) => a.chosen === null && !a.flagged && a.questionRev === 1)).toBe(true);
  });

  it("プールが MAX 未満なら全問(MIN 以上)を出題する", async () => {
    const store = new FakeMockStore();
    const bank = [...FORM_QUESTIONS, ...D2_POOL.slice(0, 12)];
    const r = await startMiniD2(store, { bank });
    if (r.status !== 201) throw new Error(JSON.stringify(r));
    expect(r.session.questionIds).toHaveLength(12);
    expect(r.session.deadlineAt).toEqual(LATER(12 * MINI_MINUTES_PER_QUESTION));
  });

  it("プールが MIN 未満なら 409 domain_pool_short でセッションを作らない", async () => {
    const store = new FakeMockStore();
    const bank = [...FORM_QUESTIONS, ...D2_POOL.slice(0, MINI_QUESTION_MIN - 1)];
    const r = await startMiniD2(store, { bank });
    expect(r).toEqual({ status: 409, error: "domain_pool_short", poolCount: MINI_QUESTION_MIN - 1, minCount: MINI_QUESTION_MIN });
    expect(store.sessions.size).toBe(0);
  });

  it("フラグ追加でプールが MIN を割ればその時点で開始不可になる(実バンクの f-d5 = 10 問ちょうどの形)", async () => {
    const store = new FakeMockStore();
    const bank = [...FORM_QUESTIONS, ...D2_POOL.slice(0, MINI_QUESTION_MIN)];
    expect((await startMiniD2(store, { bank })).status).toBe(201);
    const store2 = new FakeMockStore();
    const flags = [{ questionId: D2_POOL[0].id, questionRev: D2_POOL[0].rev, resolvedAt: null }];
    expect(await startMiniD2(store2, { bank, flags })).toMatchObject({ status: 409, error: "domain_pool_short", poolCount: MINI_QUESTION_MIN - 1 });
  });

  it("未知ドメインは 404 unknown_domain", async () => {
    const store = new FakeMockStore();
    const r = await startDomainMini("f-d7", MINI_BANK, { forms: [FORM_A], sessions: [], flags: [] }, syllabus, deps(store), zeroRandom);
    expect(r).toEqual({ status: 404, error: "unknown_domain" });
    expect(store.sessions.size).toBe(0);
  });

  it("他 exam の問題は候補に 0 件(DoD): exam=ccar-p の問題だけのバンクでは F の mini はプール不足", async () => {
    const store = new FakeMockStore();
    const otherExam = D2_POOL.map((q) => ({ ...q, exam: "ccar-p" as const }));
    const r = await startMiniD2(store, { bank: otherExam });
    expect(r).toEqual({ status: 409, error: "domain_pool_short", poolCount: 0, minCount: MINI_QUESTION_MIN });
    expect(store.sessions.size).toBe(0);
  });

  it("進行中セッション(full)があれば mini も 409 session_in_progress(プール判定より先)", async () => {
    const store = new FakeMockStore();
    const full = await startFull(store);
    const r = await startMiniD2(store, { bank: [...FORM_QUESTIONS, ...D2_POOL.slice(0, 3)] });
    expect(r).toMatchObject({ status: 409, error: "session_in_progress", session: { id: full.id } });
  });

  it("選定は注入乱数で決定的(重複なし・プール内)、乱数が変われば並びが変わる", () => {
    const a = pickMiniQuestions(D2_POOL, zeroRandom);
    const b = pickMiniQuestions(D2_POOL, () => 0.999);
    expect(a).toHaveLength(MINI_QUESTION_MAX);
    expect(new Set(a).size).toBe(a.length);
    expect(a.every((id) => D2_POOL.some((q) => q.id === id))).toBe(true);
    expect(a).not.toEqual(b);
    expect(pickMiniQuestions(D2_POOL.slice(0, 4), zeroRandom)).toHaveLength(4);
  });

  it("startDomainMini で始めた mini は abandon でき status=abandoned・attempt 0 行(DoD)", async () => {
    const store = new FakeMockStore();
    const r = await startMiniD2(store);
    if (r.status !== 201) throw new Error(JSON.stringify(r));
    const ab = await abandonSession(r.session.id, deps(store, LATER(3)));
    expect(ab).toMatchObject({ status: 200, session: { status: "abandoned", finishedAt: LATER(3) } });
    expect(store.attempts).toHaveLength(0);
    expect(await store.findInProgress()).toBeNull();
  });
});

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
    expect((await startFullMock({ exam: "ccar-f", formId: "form-zz" }, [FORM_A], [], [], deps(store))).status).toBe(404);
    const broken = { ...FORM_A, question_ids: [...FORM_A.question_ids.slice(0, 59), "f-d1-q999"] };
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [broken], [], [], deps(store));
    expect(r.status).toBe(404);
    expect(store.sessions.size).toBe(0);
  });
});

describe("単一進行中の強制(オーナー決定 2026-08-27: 全 kind で 1 件)", () => {
  it("同 kind の再送・二重クリックは 409 + 既存セッション参照", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [], [], deps(store));
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
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [], [flagOn(FORM_QUESTIONS[0])], deps(store));
    expect(r).toEqual({ status: 409, error: "form_blocked", openFlagCount: 1, inactiveCount: 0 });
    expect(store.sessions.size).toBe(0);
  });

  it("status≠active の問題を含む form も 409 form_blocked", async () => {
    const store = new FakeMockStore();
    const retired: Question = { ...FORM_QUESTIONS[0], status: "retired" };
    const d: MockDeps = { ...deps(store), findQuestion: (id) => (id === retired.id ? retired : ALL.get(id) ?? null) };
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [], [], d);
    expect(r).toEqual({ status: 409, error: "form_blocked", openFlagCount: 0, inactiveCount: 1 });
    expect(store.sessions.size).toBe(0);
  });

  it("旧 rev のフラグは superseded として無視され開始できる", async () => {
    const store = new FakeMockStore();
    const stale: OpenFlag = { questionId: FORM_QUESTIONS[0].id, questionRev: FORM_QUESTIONS[0].rev - 1, resolvedAt: null };
    expect((await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [], [stale], deps(store))).status).toBe(201);
  });

  it("提出済み form の再受験(rehearsal)も明示 form_id なら 201 で開始できる", async () => {
    const store = new FakeMockStore();
    const first = await startFull(store);
    await submitSession(first.id, deps(store, LATER(10)));
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [SUBMITTED_A], [], deps(store, LATER(20)));
    expect(r.status).toBe(201);
  });

  it("全 form が block されていればどの form_id でも 409 form_blocked(DoD: 全 block で開始拒否)", async () => {
    const store = new FakeMockStore();
    const flags = [flagOn(FORM_QUESTIONS[0]), flagOn(FORM_B_QUESTIONS[0])];
    for (const formId of ["form-a", "form-b"]) {
      const r = await startFullMock({ exam: "ccar-f", formId }, [FORM_A, FORM_B], [], flags, depsAB(store));
      expect(r, formId).toMatchObject({ status: 409, error: "form_blocked" });
    }
    expect(store.sessions.size).toBe(0);
  });

  it("開始後にフラグが追加されても進行中セッションの問題集合は固定される(01 FR-5)", async () => {
    const store = new FakeMockStore();
    const session = await startFull(store);
    // フラグ追加後の再送: availability より進行中セッションの解決が先(409 session_in_progress)
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A], [], [flagOn(FORM_QUESTIONS[0])], deps(store, LATER(5)));
    expect(r).toMatchObject({ status: 409, error: "session_in_progress", session: { id: session.id } });
    expect((await store.findSession(session.id))?.questionIds).toEqual(FORM_A.question_ids);
  });

  it("バンクに無い問題を含む form は flags があっても従来どおり 404 unknown_question(API 契約の回帰なし)", async () => {
    const store = new FakeMockStore();
    const broken: MockForm = { ...FORM_A, question_ids: [...FORM_A.question_ids.slice(0, 59), "f-d1-q999"] };
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [broken], [], [flagOn(FORM_QUESTIONS[1])], deps(store));
    expect(r).toMatchObject({ status: 404, error: "unknown_question" });
    expect(store.sessions.size).toBe(0);
  });

  it("未実施フォームは自動選択(定義順先頭の available)以外を開始できない(01 FR-5 の自動選択)", async () => {
    const store = new FakeMockStore();
    const r = await startFullMock({ exam: "ccar-f", formId: "form-b" }, [FORM_A, FORM_B], [], [], depsAB(store));
    expect(r).toEqual({ status: 409, error: "form_not_next", recommendedFormId: "form-a" });
    expect(store.sessions.size).toBe(0);
    expect((await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A, FORM_B], [], [], depsAB(store))).status).toBe(201);
  });

  it("先頭フォームが block なら次の有効な未実施フォームが自動選択になる", async () => {
    const store = new FakeMockStore();
    const flags = [flagOn(FORM_QUESTIONS[0])];
    expect((await startFullMock({ exam: "ccar-f", formId: "form-b" }, [FORM_A, FORM_B], [], flags, depsAB(store))).status).toBe(201);
  });

  it("提出済みフォームの rehearsal は自動選択の対象外でも開始できる", async () => {
    const store = new FakeMockStore();
    // form-a 提出済み・form-b 未実施: 推奨は form-b だが form-a の再受験は許可
    const r = await startFullMock({ exam: "ccar-f", formId: "form-a" }, [FORM_A, FORM_B], [SUBMITTED_A], [], depsAB(store));
    expect(r.status).toBe(201);
  });

  it("未実施かつ blocked のフォームは form_not_next ではなく form_blocked を返す(理由の明示)", async () => {
    const store = new FakeMockStore();
    const flags = [flagOn(FORM_B_QUESTIONS[0])];
    const r = await startFullMock({ exam: "ccar-f", formId: "form-b" }, [FORM_A, FORM_B], [], flags, depsAB(store));
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
  it("half も abandon できない(03: domain mini のみ abandon 可)", async () => {
    const store = new FakeMockStore();
    const r = await startSession(
      { exam: "ccar-f", kind: "half", formId: null, domainId: null, questionIds: MINI_QUESTIONS.map((q) => q.id), durationMin: 60 },
      deps(store),
    );
    if (r.status !== 201) throw new Error(JSON.stringify(r));
    expect(await abandonSession(r.session.id, deps(store, LATER(1)))).toMatchObject({ status: 409, error: "abandon_not_allowed" });
    expect(await store.findSession(r.session.id)).toMatchObject({ status: "in_progress" });
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
    { questionId: "f-d2-q900", correct: ["B"], ordered: false },
    { questionId: "f-d2-q902", correct: ["A", "B"], ordered: false },
    { questionId: "f-d2-q910", correct: ["A", "B", "A"], ordered: true },
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

describe("T-bundle: mcq_bundle の Mock 保存・採点(specs/03 §1、§Mock の attempt 生成)", () => {
  const startMixed = async (store: FakeMockStore, now = NOW) => {
    const r = await startSession(
      { exam: "ccar-f", kind: "domain_mini", formId: null, domainId: "f-d2", questionIds: ["f-d2-q910", "f-d2-q900", "f-d2-q902"], durationMin: 30 },
      deps(store, now),
    );
    if (r.status !== 201) throw new Error(`開始失敗: ${JSON.stringify(r)}`);
    return r.session;
  };
  const chosenOf = async (store: FakeMockStore, sid: string, qid: string) => (await store.listAnswers(sid)).find((a) => a.questionId === qid)?.chosen;

  it("小問順・重複ありの chosen を保存でき、一部未回答(空文字)は保持される", async () => {
    const store = new FakeMockStore();
    const s = await startMixed(store);
    expect((await saveAnswer(s.id, "f-d2-q910", { chosen: ["A", "A", "A"] }, deps(store, LATER(1)))).status).toBe(200);
    expect(await chosenOf(store, s.id, "f-d2-q910")).toEqual(["A", "A", "A"]);
    expect((await saveAnswer(s.id, "f-d2-q910", { chosen: ["A", "", "B"] }, deps(store, LATER(2)))).status).toBe(200);
    expect(await chosenOf(store, s.id, "f-d2-q910")).toEqual(["A", "", "B"]);
  });
  it("全小問が空文字の chosen は null に正規化(未回答 = null の既存規則)。answer_updated_at は回答操作として更新される", async () => {
    const store = new FakeMockStore();
    const s = await startMixed(store);
    await saveAnswer(s.id, "f-d2-q910", { chosen: ["A", "B", "A"] }, deps(store, LATER(1)));
    await saveAnswer(s.id, "f-d2-q910", { chosen: ["", "", ""] }, deps(store, LATER(2)));
    expect(await chosenOf(store, s.id, "f-d2-q910")).toBeNull();
    await submitSession(s.id, deps(store, LATER(5)));
    expect(store.attempts.find((a) => a.questionId === "f-d2-q910")).toMatchObject({ chosen: null, isCorrect: false, answeredAt: LATER(5) });
  });
  it("長さが小問数と違う・選択肢に無いラベルは 400 invalid_chosen で保存しない。mcq_single / mcq_multi の重複・空文字も 400", async () => {
    const store = new FakeMockStore();
    const s = await startMixed(store);
    const d = deps(store, LATER(1));
    expect(await saveAnswer(s.id, "f-d2-q910", { chosen: ["A", "B"] }, d)).toMatchObject({ status: 400, error: "invalid_chosen" });
    expect(await saveAnswer(s.id, "f-d2-q910", { chosen: ["A", "B", "F"] }, d)).toMatchObject({ status: 400, error: "invalid_chosen" });
    expect(await saveAnswer(s.id, "f-d2-q902", { chosen: ["A", "A"] }, d)).toMatchObject({ status: 400, error: "invalid_chosen" });
    expect(await saveAnswer(s.id, "f-d2-q900", { chosen: [""] }, d)).toMatchObject({ status: 400, error: "invalid_chosen" });
    expect(await chosenOf(store, s.id, "f-d2-q910")).toBeNull();
  });
  it("提出: 全小問一致のみ正解(部分一致・順序違いは不正解)、answered_at は chosen あり = answer_updated_at。MCQ は従来どおり集合一致", async () => {
    const store = new FakeMockStore();
    const s = await startMixed(store);
    await saveAnswer(s.id, "f-d2-q910", { chosen: ["A", "B", "A"] }, deps(store, LATER(1)));
    await saveAnswer(s.id, "f-d2-q902", { chosen: ["B", "A"] }, deps(store, LATER(2)));
    await submitSession(s.id, deps(store, LATER(9)));
    expect(store.sessions.get(s.id)?.scoreRaw).toBe(2);
    expect(store.attempts.find((a) => a.questionId === "f-d2-q910")).toMatchObject({ isCorrect: true, chosen: ["A", "B", "A"], answeredAt: LATER(1) });

    const store2 = new FakeMockStore();
    const s2 = await startMixed(store2, LATER(20));
    await saveAnswer(s2.id, "f-d2-q910", { chosen: ["A", "B", "B"] }, deps(store2, LATER(21)));
    await submitSession(s2.id, deps(store2, LATER(29)));
    expect(store2.attempts.find((a) => a.questionId === "f-d2-q910")).toMatchObject({ isCorrect: false, chosen: ["A", "B", "B"], answeredAt: LATER(21) });
    expect(store2.sessions.get(s2.id)?.scoreRaw).toBe(0);
  });
  it("timeout 提出でも同じ key(ordered)で採点される", async () => {
    const store = new FakeMockStore();
    const s = await startMixed(store);
    await saveAnswer(s.id, "f-d2-q910", { chosen: ["A", "B", "A"] }, deps(store, LATER(1)));
    await submitSession(s.id, deps(store, LATER(31)));
    expect(store.sessions.get(s.id)).toMatchObject({ submissionReason: "timeout", scoreRaw: 1 });
  });
});

describe("T-bundle: gradeMockAnswers(SQL 実装 buildSubmitFinalize と同じ意味論の単一ソース)", () => {
  const row = (chosen: string[] | null): ExamSessionAnswerRow => ({
    sessionId: "s1", questionId: "f-d2-q910", questionRev: 1, chosen, flagged: false, answerUpdatedAt: chosen ? LATER(1) : null, updatedAt: NOW,
  });
  const key: AnswerKeyEntry[] = [{ questionId: "f-d2-q910", correct: ["A", "B", "A"], ordered: true }];
  const cases: [string[] | null, boolean][] = [
    [["A", "B", "A"], true],
    [["A", "A", "B"], false], // 同じ集合でも順序違いは不正解
    [["A", "B", ""], false], // 一部未回答
    [["A", "B"], false], // 長さ不足
    [["A", "B", "A", "A"], false], // 過剰
    [null, false],
  ];
  it.each(cases)("chosen=%j → is_correct=%s", (chosen, expected) => {
    expect(gradeMockAnswers([row(chosen)], key, LATER(9)).attempts[0].isCorrect).toBe(expected);
  });
});

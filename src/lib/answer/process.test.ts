import { describe, expect, it } from "vitest";
import { Rating, State } from "ts-fsrs";
import type { AttemptRow } from "@/db/schema";
import type { PoolContext } from "@/lib/bank/pool";
import { questionSchema, type MockForm, type Question } from "@/lib/bank/schema";
import type { SrsStateUpsert } from "@/lib/srs/card-row";
import { AttemptPkConflictError, processAnswer, type AnswerDeps, type AnswerStore } from "./process";
import { answerRequestSchema, type AnswerRequest } from "./schema";

// T-write: 学習回答の書込プロトコル(specs/03 §学習回答の書込プロトコル、04 §モード行列、06 §接続方式)。
// DB の代わりに in-memory store を使い、同 attempt_id 再送 / 不一致 / PK 競合 / srs_state lazy create /
// srs_eligible=false → applied_rating=null を検証する。D1-3 の processAnswer を対象とする。

const jst = (iso: string) => new Date(`${iso}+09:00`);
const NOW = jst("2026-08-27T07:30:00");
const UUID = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";

const base = {
  id: "f-d2-q001",
  exam: "ccar-f",
  domain_id: "f-d2",
  primary_topic_id: "f-d2-t1-03",
  secondary_topic_ids: [],
  type: "mcq_single",
  scenario_id: null,
  eligible_modes: ["drill", "practice"],
  srs_eligible: true,
  stem_en: "Which transport should the MCP server use?",
  choices: [
    { label: "A", text_en: "stdio" },
    { label: "B", text_en: "Streamable HTTP" },
    { label: "C", text_en: "WebSocket" },
    { label: "D", text_en: "gRPC" },
  ],
  answer: ["B"],
  answer_en: null,
  explanation_ja: "リモート公開には Streamable HTTP が適切。",
  refs: ["https://docs.claude.com/en/docs/mcp"],
  difficulty: 2,
  status: "active",
  rev: 1,
} as const;
const q = (over: Record<string, unknown> = {}): Question => questionSchema.parse({ ...base, ...over });
const flash = (over: Record<string, unknown> = {}): Question =>
  q({ id: "f-d2-q002", type: "flash", choices: null, answer: null, answer_en: "stdio", eligible_modes: ["drill"], ...over });
const multi = (over: Record<string, unknown> = {}): Question =>
  q({ id: "f-d2-q003", type: "mcq_multi", answer: ["A", "B"], stem_en: "Select TWO transports.", ...over });

/** in-memory store。commit は attempt PK 競合を DB と同様に検出し、両テーブルとも書かない */
class FakeStore implements AnswerStore {
  attempts = new Map<string, AttemptRow>();
  srs = new Map<string, SrsStateUpsert>();
  commits = 0;
  /** 次の commit 直前に「別リクエストが先に同 attempt を書いた」状況を作る */
  raceBeforeCommit: (() => void) | null = null;

  async findAttempt(id: string) {
    return this.attempts.get(id) ?? null;
  }
  async findSrsState(qid: string) {
    return this.srs.get(qid) ?? null;
  }
  async commit(attempt: AttemptRow, srs: SrsStateUpsert | null) {
    this.raceBeforeCommit?.();
    this.raceBeforeCommit = null;
    if (this.attempts.has(attempt.attemptId)) throw new AttemptPkConflictError();
    this.commits++;
    this.attempts.set(attempt.attemptId, attempt);
    if (srs) this.srs.set(srs.questionId, srs);
  }
}

const deps = (store: FakeStore, questions: Question[], ctx: Partial<PoolContext> = {}, now = NOW): AnswerDeps => ({
  store,
  findQuestion: (id) => questions.find((x) => x.id === id) ?? null,
  poolContext: async () => ({ forms: [], sessions: [], flags: [], ...ctx }),
  now,
});

const mcqReq = (over: Partial<Extract<AnswerRequest, { kind: "mcq" }>> = {}): AnswerRequest =>
  answerRequestSchema.parse({
    kind: "mcq",
    attempt_id: UUID,
    question_id: "f-d2-q001",
    question_rev: 1,
    mode: "drill",
    chosen: ["B"],
    elapsed_ms: 4200,
    ...over,
  });
const flashReq = (over: Partial<Extract<AnswerRequest, { kind: "flash" }>> = {}): AnswerRequest =>
  answerRequestSchema.parse({ kind: "flash", attempt_id: UUID, question_id: "f-d2-q002", question_rev: 1, mode: "drill", rating: 3, ...over });

describe("入力検証(answerRequestSchema)", () => {
  it("attempt_id は UUID、mode は drill | practice のみ(mock は別経路)", () => {
    expect(answerRequestSchema.safeParse({ ...mcqReq(), attempt_id: "abc" }).success).toBe(false);
    expect(answerRequestSchema.safeParse({ ...mcqReq(), mode: "mock" }).success).toBe(false);
  });
  it("flash は rating 1..4 必須、mcq は chosen 必須。未知キーは拒否", () => {
    expect(answerRequestSchema.safeParse({ ...flashReq(), rating: 0 }).success).toBe(false);
    expect(answerRequestSchema.safeParse({ ...flashReq(), rating: 5 }).success).toBe(false);
    expect(answerRequestSchema.safeParse({ ...mcqReq(), chosen: [] }).success).toBe(false);
    expect(answerRequestSchema.safeParse({ ...mcqReq(), applied_rating: 3 }).success).toBe(false);
  });
});

describe("初回回答: srs_state lazy create と採点(03 §srs_state 生成タイミング、04 §モード行列)", () => {
  it("srs_state が無い問題は createEmptyCard から 1 回だけ適用され、attempt と同時に commit される", async () => {
    const store = new FakeStore();
    const res = await processAnswer(mcqReq(), deps(store, [q()]));
    expect(res.status).toBe(200);
    if (res.status !== 200) return;
    expect(res.replayed).toBe(false);
    expect(res.attempt).toMatchObject({ attemptId: UUID, questionId: "f-d2-q001", questionRev: 1, exam: "ccar-f", mode: "drill", sessionId: null, isCorrect: true, appliedRating: Rating.Good, chosen: ["B"], elapsedMs: 4200 });
    expect(res.attempt.answeredAt).toEqual(NOW);
    const srs = store.srs.get("f-d2-q001")!;
    expect(srs).toBeDefined();
    expect(srs.reps).toBe(1);
    expect(srs.state).not.toBe(State.New);
    expect(srs.lastReviewAt).toEqual(NOW);
    expect(store.commits).toBe(1);
  });

  it("MCQ 不正解は Again、is_correct=false", async () => {
    const store = new FakeStore();
    const res = await processAnswer(mcqReq({ chosen: ["A"] }), deps(store, [q()]));
    expect(res.status === 200 && res.attempt).toMatchObject({ isCorrect: false, appliedRating: Rating.Again });
    expect(store.srs.get("f-d2-q001")!.lapses + store.srs.get("f-d2-q001")!.reps).toBeGreaterThan(0);
  });

  it("mcq_multi は集合一致・部分点なし(順序は問わない)", async () => {
    const ok = await processAnswer(mcqReq({ question_id: "f-d2-q003", chosen: ["B", "A"] }), deps(new FakeStore(), [multi()]));
    expect(ok.status === 200 && ok.attempt.isCorrect).toBe(true);
    const partial = await processAnswer(mcqReq({ question_id: "f-d2-q003", chosen: ["A"] }), deps(new FakeStore(), [multi()]));
    expect(partial.status === 200 && partial.attempt.isCorrect).toBe(false);
    const extra = await processAnswer(mcqReq({ question_id: "f-d2-q003", chosen: ["A", "B", "C"] }), deps(new FakeStore(), [multi()]));
    expect(extra.status === 200 && extra.attempt.isCorrect).toBe(false);
  });

  it("flash は利用者の rating をそのまま適用。Again のみ is_correct=false", async () => {
    for (const [rating, correct] of [[1, false], [2, true], [3, true], [4, true]] as const) {
      const store = new FakeStore();
      const res = await processAnswer(flashReq({ rating }), deps(store, [flash()]));
      expect(res.status === 200 && res.attempt).toMatchObject({ appliedRating: rating, isCorrect: correct, chosen: null });
      expect(store.srs.has("f-d2-q002")).toBe(true);
    }
  });

  it("2 回目の回答は既存 srs_state から続きを計算する(createEmptyCard に戻らない)", async () => {
    const store = new FakeStore();
    await processAnswer(mcqReq(), deps(store, [q()]));
    const first = store.srs.get("f-d2-q001")!;
    const later = new Date(NOW.getTime() + 86_400_000);
    await processAnswer(mcqReq({ attempt_id: UUID2 }), deps(store, [q()], {}, later));
    const second = store.srs.get("f-d2-q001")!;
    expect(second.reps).toBe(first.reps + 1);
    expect(second.lastReviewAt).toEqual(later);
  });
});

describe("冪等性: 同 attempt_id の再送(03 手順 2・6)", () => {
  it("同 payload の再送は 200 で SRS を再適用しない(srs_state が完全に同一)", async () => {
    const store = new FakeStore();
    await processAnswer(mcqReq(), deps(store, [q()]));
    const before = structuredClone(store.srs.get("f-d2-q001")!);
    const res = await processAnswer(mcqReq(), deps(store, [q()], {}, new Date(NOW.getTime() + 60_000)));
    expect(res.status).toBe(200);
    expect(res.status === 200 && res.replayed).toBe(true);
    expect(store.srs.get("f-d2-q001")).toEqual(before);
    expect(store.commits).toBe(1);
  });

  it("同 attempt_id で payload 不一致は 409(chosen / question_id / mode / elapsed)", async () => {
    const store = new FakeStore();
    await processAnswer(mcqReq(), deps(store, [q()]));
    for (const over of [{ chosen: ["A"] }, { mode: "practice" as const }, { elapsed_ms: 1 }, { question_id: "f-d2-q003" }]) {
      const res = await processAnswer(mcqReq(over), deps(store, [q(), multi()]));
      expect(res).toMatchObject({ status: 409, error: "attempt_payload_mismatch" });
    }
    expect(store.commits).toBe(1);
  });

  it("PK 競合後は既存 attempt を再取得し、同 payload なら 200・SRS 二重適用なし(03 手順 6)", async () => {
    const store = new FakeStore();
    const d = deps(store, [q()]);
    // 読み取り時には無かった attempt が commit 直前に別リクエストで書かれる(ACK 喪失リトライの並走)
    store.raceBeforeCommit = () => {
      store.attempts.set(UUID, { attemptId: UUID, questionId: "f-d2-q001", questionRev: 1, exam: "ccar-f", mode: "drill", sessionId: null, appliedRating: Rating.Good, isCorrect: true, chosen: ["B"], elapsedMs: 4200, answeredAt: NOW });
      store.srs.set("f-d2-q001", { questionId: "f-d2-q001", exam: "ccar-f", dueAt: NOW, stability: 1, difficulty: 5, elapsedDays: 0, scheduledDays: 0, reps: 1, lapses: 0, learningSteps: 1, state: State.Learning, lastReviewAt: NOW });
    };
    const res = await processAnswer(mcqReq(), d);
    expect(res.status).toBe(200);
    expect(res.status === 200 && res.replayed).toBe(true);
    expect(store.srs.get("f-d2-q001")!.reps).toBe(1);
    expect(store.commits).toBe(0);
  });

  it("PK 競合後に再取得した payload が不一致なら 409", async () => {
    const store = new FakeStore();
    store.raceBeforeCommit = () => {
      store.attempts.set(UUID, { attemptId: UUID, questionId: "f-d2-q001", questionRev: 1, exam: "ccar-f", mode: "drill", sessionId: null, appliedRating: Rating.Again, isCorrect: false, chosen: ["A"], elapsedMs: 4200, answeredAt: NOW });
    };
    const res = await processAnswer(mcqReq(), deps(store, [q()]));
    expect(res).toMatchObject({ status: 409, error: "attempt_payload_mismatch" });
  });
});

describe("Practice と srs_eligible=false(04 §モード行列)", () => {
  it("srs_eligible=false の Practice 回答は attempt のみ・applied_rating=null・srs_state を作らない", async () => {
    const store = new FakeStore();
    const released = q({ id: "f-d2-q010", eligible_modes: ["mock", "practice"], srs_eligible: false, scenario_id: "sc-1" });
    const res = await processAnswer(mcqReq({ question_id: "f-d2-q010", mode: "practice" }), deps(store, [released]));
    expect(res.status).toBe(200);
    expect(res.status === 200 && res.attempt).toMatchObject({ appliedRating: null, isCorrect: true, mode: "practice" });
    expect(res.status === 200 && res.srs).toBeNull();
    expect(store.srs.size).toBe(0);
    expect(store.commits).toBe(1);
  });

  it("srs_eligible=true の Practice 回答は自動レーティングで SRS 更新する", async () => {
    const store = new FakeStore();
    const res = await processAnswer(mcqReq({ mode: "practice" }), deps(store, [q()]));
    expect(res.status === 200 && res.attempt.appliedRating).toBe(Rating.Good);
    expect(store.srs.has("f-d2-q001")).toBe(true);
  });

  it("srs_eligible=false の問題への Drill 回答は拒否される(drill は常に FSRS 更新対象)", async () => {
    const notSrs = q({ srs_eligible: false });
    const res = await processAnswer(mcqReq(), deps(new FakeStore(), [notSrs]));
    expect(res).toMatchObject({ status: 409, error: "not_eligible", reason: "srs" });
  });
});

describe("書込経路でも出題判定を適用(03 §出題プールの判定順序、holdout 最優先)", () => {
  const formIds = Array.from({ length: 60 }, (_, i) => `f-d1-q${String(100 + i).padStart(3, "0")}`);
  const formA: MockForm = { id: "form-a", exam: "ccar-f", scenario_ids: ["sc-1"], question_ids: formIds };
  const formQ = q({ id: formIds[0], domain_id: "f-d1", primary_topic_id: "f-d1-t1-01", scenario_id: "sc-1", eligible_modes: ["mock", "practice"], srs_eligible: false });

  it("未提出 form 収載問題は Practice でも記録しない(holdout)", async () => {
    const store = new FakeStore();
    const res = await processAnswer(mcqReq({ question_id: formIds[0], mode: "practice" }), deps(store, [formQ], { forms: [formA] }));
    expect(res).toMatchObject({ status: 409, error: "not_eligible", reason: "holdout" });
    expect(store.commits).toBe(0);
  });

  it("提出済み form の問題は Practice で記録される(解放)が applied_rating=null", async () => {
    const store = new FakeStore();
    const res = await processAnswer(
      mcqReq({ question_id: formIds[0], mode: "practice" }),
      deps(store, [formQ], { forms: [formA], sessions: [{ exam: "ccar-f", formId: "form-a", kind: "full", status: "submitted" }] }),
    );
    expect(res.status).toBe(200);
    expect(res.status === 200 && res.attempt.appliedRating).toBeNull();
  });

  it("現行 rev の未解決フラグがある問題・retired・mode 不一致は拒否", async () => {
    const flagged = await processAnswer(mcqReq(), deps(new FakeStore(), [q()], { flags: [{ questionId: "f-d2-q001", questionRev: 1, resolvedAt: null }] }));
    expect(flagged).toMatchObject({ status: 409, reason: "open_flag" });
    const retired = await processAnswer(mcqReq(), deps(new FakeStore(), [q({ status: "retired" })]));
    expect(retired).toMatchObject({ status: 409, reason: "status" });
    const wrongMode = await processAnswer(flashReq({ mode: "practice" }), deps(new FakeStore(), [flash()]));
    expect(wrongMode).toMatchObject({ status: 409, reason: "mode" });
  });

  it("旧 rev のフラグは superseded で記録できる", async () => {
    const res = await processAnswer(mcqReq({ question_rev: 2 }), deps(new FakeStore(), [q({ rev: 2 })], { flags: [{ questionId: "f-d2-q001", questionRev: 1, resolvedAt: null }] }));
    expect(res.status).toBe(200);
  });
});

describe("バンクとの整合", () => {
  it("バンクに無い問題は 404、rev 不一致(deploy 跨ぎ)は 409 で記録しない", async () => {
    const store = new FakeStore();
    expect(await processAnswer(mcqReq({ question_id: "f-d2-q999" }), deps(store, [q()]))).toMatchObject({ status: 404 });
    expect(await processAnswer(mcqReq({ question_rev: 2 }), deps(store, [q()]))).toMatchObject({ status: 409, error: "stale_question_rev" });
    expect(store.commits).toBe(0);
  });

  it("chosen の重複は入力で拒否、選択肢に無いラベルは採点せず拒否", async () => {
    expect(answerRequestSchema.safeParse({ ...mcqReq(), chosen: ["B", "B"] }).success).toBe(false);
    const store = new FakeStore();
    expect(await processAnswer(mcqReq({ chosen: ["E"] }), deps(store, [q()]))).toMatchObject({ status: 409, reason: "unknown_choice" });
    expect(await processAnswer(mcqReq({ chosen: ["B", "E"] }), deps(store, [q()]))).toMatchObject({ status: 409, reason: "unknown_choice" });
    expect(store.commits).toBe(0);
  });

  it("問題種別と入力 kind の不一致は拒否(flash に chosen / MCQ に rating)", async () => {
    expect(await processAnswer(mcqReq({ question_id: "f-d2-q002" }), deps(new FakeStore(), [flash()]))).toMatchObject({ status: 409, reason: "kind" });
    expect(await processAnswer(flashReq({ question_id: "f-d2-q001" }), deps(new FakeStore(), [q()]))).toMatchObject({ status: 409, reason: "kind" });
  });
});

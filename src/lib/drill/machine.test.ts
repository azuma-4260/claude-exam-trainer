import { describe, expect, it } from "vitest";
import { answerRequestSchema } from "@/lib/answer/schema";
import type { DrillItem } from "@/lib/queue/serve";
import {
  canNext,
  classifyAnswerResponse,
  drillReducer,
  initialDrillState,
  initialStepFor,
  summarize,
  toAnswerRequest,
  type DrillEvent,
  type DrillState,
} from "./machine";

// S-3 の厳密 ACK 状態機械(specs/05 S-3、03 §書込プロトコル)。実装前に作成(README 常時遵守 2)
// D4-4: flash の評価は Next(COMMIT)まで変更可。COMMIT で送信し、SAVE_OK で自動的に次問へ進む

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const UUID2 = "123e4567-e89b-42d3-a456-426614174001";

const flashItem = (n: number): DrillItem => ({
  questionId: `f-d1-q90000${n}`,
  rev: 1,
  type: "flash",
  stemEn: "What transport?",
  choices: null,
  answer: null,
  answerEn: "Streamable HTTP",
  explanationJa: "解説",
  refs: ["https://docs.claude.com/en/docs/mcp"],
  source: "due",
  estSec: 20,
});

const singleItem = (n: number): DrillItem => ({
  ...flashItem(n),
  type: "mcq_single",
  choices: [
    { label: "A", textEn: "stdio" },
    { label: "B", textEn: "Streamable HTTP" },
  ],
  answer: ["B"],
  answerEn: null,
  estSec: 60,
});

const multiItem = (n: number): DrillItem => ({
  ...singleItem(n),
  type: "mcq_multi",
  choices: [
    { label: "A", textEn: "stdio" },
    { label: "B", textEn: "Streamable HTTP" },
    { label: "C", textEn: "SSE" },
  ],
  answer: ["B", "C"],
});

const dispatch = (state: DrillState, ...events: DrillEvent[]): DrillState =>
  events.reduce(drillReducer, state);

describe("初期状態", () => {
  it("flash は front、MCQ は choosing から始まる", () => {
    expect(initialStepFor(flashItem(1))).toEqual({ step: "front" });
    expect(initialStepFor(singleItem(1))).toEqual({ step: "choosing", chosen: [] });
    const s = initialDrillState([flashItem(1), singleItem(2)]);
    expect(s.index).toBe(0);
    expect(s.phase).toBe("running");
    expect(s.current).toEqual({ step: "front" });
  });
});

describe("flash: FLIP → RATE(評価はローカル保持・変更可)→ COMMIT(Next で送信)", () => {
  const s0 = initialDrillState([flashItem(1), flashItem(2)]);

  it("FLIP で裏面へ。front で RATE / COMMIT は無効", () => {
    expect(drillReducer(s0, { type: "RATE", rating: 3, elapsedMs: 100 })).toBe(s0);
    expect(drillReducer(s0, { type: "COMMIT", attemptId: UUID })).toBe(s0);
    const s1 = drillReducer(s0, { type: "FLIP" });
    expect(s1.current).toEqual({ step: "back" });
    expect(drillReducer(s1, { type: "COMMIT", attemptId: UUID })).toBe(s1); // 評価前は送信できない
  });

  it("RATE で rated(未送信)になり Next(= COMMIT)が可能。解説閲覧後に再 RATE で評価を差し替えられる", () => {
    const s = dispatch(s0, { type: "FLIP" }, { type: "RATE", rating: 3, elapsedMs: 500 });
    expect(s.current).toEqual({ step: "rated", rating: 3, elapsedMs: 500 });
    expect(canNext(s)).toBe(true);
    const changed = drillReducer(s, { type: "RATE", rating: 1, elapsedMs: 9000 });
    // 経過時間は最初の評価時点(思い出すまでの時間)を保持し、解説を読んだ時間は含めない
    expect(changed.current).toEqual({ step: "rated", rating: 1, elapsedMs: 500 });
  });

  it("COMMIT で answered(saving, autoAdvance)。saving 中の RATE / COMMIT は無効", () => {
    const s = dispatch(s0, { type: "FLIP" }, { type: "RATE", rating: 3, elapsedMs: 500 }, { type: "RATE", rating: 2, elapsedMs: 800 });
    const committed = drillReducer(s, { type: "COMMIT", attemptId: UUID });
    expect(committed.current).toEqual({
      step: "answered",
      local: { kind: "flash", rating: 2 },
      attemptId: UUID,
      elapsedMs: 500,
      save: "saving",
      autoAdvance: true,
    });
    expect(canNext(committed)).toBe(false);
    expect(drillReducer(committed, { type: "RATE", rating: 4, elapsedMs: 1 })).toBe(committed);
    expect(drillReducer(committed, { type: "COMMIT", attemptId: UUID2 })).toBe(committed);
  });

  it("SAVE_OK で自動的に次問へ進み、確定後の rating を results に積む(二度押し不要)", () => {
    const s = dispatch(
      s0,
      { type: "FLIP" },
      { type: "RATE", rating: 3, elapsedMs: 500 },
      { type: "RATE", rating: 2, elapsedMs: 800 },
      { type: "COMMIT", attemptId: UUID },
      { type: "SAVE_OK" },
    );
    expect(s.index).toBe(1);
    expect(s.current).toEqual({ step: "front" });
    expect(s.results).toEqual([{ questionId: "f-d1-q900001", kind: "flash", rating: 2 }]);
  });

  it("最終問の SAVE_OK で phase=summary", () => {
    const s = dispatch(
      initialDrillState([flashItem(1)]),
      { type: "FLIP" },
      { type: "RATE", rating: 4, elapsedMs: null },
      { type: "COMMIT", attemptId: UUID },
      { type: "SAVE_OK" },
    );
    expect(s.phase).toBe("summary");
    expect(s.results).toEqual([{ questionId: "f-d1-q900001", kind: "flash", rating: 4 }]);
  });

  it("SAVE_FAIL では現在問題に留まり評価を保持。RETRY で同 attemptId のまま saving に戻り、SAVE_OK で次問へ", () => {
    const failed = dispatch(
      s0,
      { type: "FLIP" },
      { type: "RATE", rating: 1, elapsedMs: 100 },
      { type: "COMMIT", attemptId: UUID },
      { type: "SAVE_FAIL", message: "network" },
    );
    expect(failed.index).toBe(0);
    expect(failed.current).toMatchObject({ step: "answered", save: "failed", local: { rating: 1 }, autoAdvance: true });
    expect(canNext(failed)).toBe(false);
    const retried = drillReducer(failed, { type: "RETRY" });
    expect(retried.current).toMatchObject({ step: "answered", save: "saving", attemptId: UUID });
    expect(drillReducer(retried, { type: "SAVE_OK" }).index).toBe(1);
  });
});

describe("mcq_single: CHOOSE(選択 = 即採点 = 送信、評価ボタンなし)", () => {
  const s0 = initialDrillState([singleItem(1)]);

  it("正解選択は isCorrect=true で answered(saving)", () => {
    const s = drillReducer(s0, { type: "CHOOSE", label: "B", attemptId: UUID, elapsedMs: null });
    expect(s.current).toMatchObject({
      step: "answered",
      local: { kind: "mcq", chosen: ["B"], isCorrect: true },
      save: "saving",
    });
  });

  it("不正解選択は isCorrect=false", () => {
    const s = drillReducer(s0, { type: "CHOOSE", label: "A", attemptId: UUID, elapsedMs: null });
    expect(s.current).toMatchObject({ local: { isCorrect: false } });
  });

  it("mcq_single に TOGGLE / SUBMIT は無効", () => {
    expect(drillReducer(s0, { type: "TOGGLE", label: "A" })).toBe(s0);
    expect(drillReducer(s0, { type: "SUBMIT", attemptId: UUID, elapsedMs: null })).toBe(s0);
  });
});

describe("mcq_multi: TOGGLE → SUBMIT(Answer ボタン必須)", () => {
  const s0 = initialDrillState([multiItem(1)]);

  it("TOGGLE で選択をトグルし、SUBMIT で集合一致採点", () => {
    const s1 = dispatch(s0, { type: "TOGGLE", label: "B" }, { type: "TOGGLE", label: "C" });
    expect(s1.current).toEqual({ step: "choosing", chosen: ["B", "C"] });
    const s2 = drillReducer(s1, { type: "SUBMIT", attemptId: UUID, elapsedMs: 1200 });
    expect(s2.current).toMatchObject({ local: { kind: "mcq", chosen: ["B", "C"], isCorrect: true } });
  });

  it("再 TOGGLE で解除。順序が違っても集合一致で正解", () => {
    const s1 = dispatch(
      s0,
      { type: "TOGGLE", label: "A" },
      { type: "TOGGLE", label: "A" },
      { type: "TOGGLE", label: "C" },
      { type: "TOGGLE", label: "B" },
    );
    const s2 = drillReducer(s1, { type: "SUBMIT", attemptId: UUID, elapsedMs: null });
    expect(s2.current).toMatchObject({ local: { isCorrect: true } });
  });

  it("部分一致は不正解(部分点なし)、選択 0 件では SUBMIT 無効", () => {
    expect(drillReducer(s0, { type: "SUBMIT", attemptId: UUID, elapsedMs: null })).toBe(s0);
    const s = dispatch(s0, { type: "TOGGLE", label: "B" }, { type: "SUBMIT", attemptId: UUID, elapsedMs: null });
    expect(s.current).toMatchObject({ local: { isCorrect: false } });
  });

  it("mcq_multi に CHOOSE は無効", () => {
    expect(drillReducer(s0, { type: "CHOOSE", label: "B", attemptId: UUID, elapsedMs: null })).toBe(s0);
  });
});

describe("保存 ACK(MCQ: SAVE_OK まで Next 不可、失敗は Retry・巻き戻しなし。自動 advance しない)", () => {
  const answered = dispatch(initialDrillState([singleItem(1), singleItem(2)]), {
    type: "CHOOSE",
    label: "B",
    attemptId: UUID,
    elapsedMs: 100,
  });

  it("SAVE_OK で saved になり Next 活性(次問へは進まない)", () => {
    const s = drillReducer(answered, { type: "SAVE_OK" });
    expect(s.index).toBe(0);
    expect(s.current).toMatchObject({ step: "answered", save: "saved", autoAdvance: false });
    expect(canNext(s)).toBe(true);
  });

  it("SAVE_FAIL で failed(回答状態は保持・巻き戻さない)。RETRY で attemptId を保持したまま saving に戻る", () => {
    const failed = drillReducer(answered, { type: "SAVE_FAIL", message: "network" });
    expect(failed.current).toMatchObject({ step: "answered", save: "failed", local: { chosen: ["B"] } });
    expect(canNext(failed)).toBe(false);
    const retried = drillReducer(failed, { type: "RETRY" });
    expect(retried.current).toMatchObject({ step: "answered", save: "saving", attemptId: UUID });
  });

  it("saving 中の RETRY / saved 後の SAVE_FAIL は無効", () => {
    expect(drillReducer(answered, { type: "RETRY" })).toBe(answered);
    const saved = drillReducer(answered, { type: "SAVE_OK" });
    expect(drillReducer(saved, { type: "SAVE_FAIL" })).toBe(saved);
  });

  it("SAVE_REJECTED で rejected(恒久エラー、Retry を出さない)", () => {
    const s = drillReducer(answered, { type: "SAVE_REJECTED", reason: "stale_question_rev" });
    expect(s.current).toEqual({ step: "rejected", reason: "stale_question_rev" });
  });
});

describe("NEXT / SKIP と summary 遷移", () => {
  const items = [singleItem(1), flashItem(2)];

  it("NEXT は saved のみ。次 item の初期 step へ進み results に積む", () => {
    const saved = dispatch(
      initialDrillState(items),
      { type: "CHOOSE", label: "A", attemptId: UUID, elapsedMs: null },
      { type: "SAVE_OK" },
    );
    const s = drillReducer(saved, { type: "NEXT" });
    expect(s.index).toBe(1);
    expect(s.current).toEqual({ step: "front" });
    expect(s.results).toEqual([{ questionId: "f-d1-q900001", kind: "mcq", chosen: ["A"], isCorrect: false }]);
  });

  it("rated(未送信)の flash に NEXT は無効(送信は COMMIT で行う)", () => {
    const rated = dispatch(initialDrillState([flashItem(1)]), { type: "FLIP" }, { type: "RATE", rating: 2, elapsedMs: null });
    expect(drillReducer(rated, { type: "NEXT" })).toBe(rated);
  });

  it("saving / failed / rejected では NEXT 無効", () => {
    const saving = dispatch(initialDrillState(items), { type: "CHOOSE", label: "A", attemptId: UUID, elapsedMs: null });
    expect(drillReducer(saving, { type: "NEXT" })).toBe(saving);
    const rejected = drillReducer(saving, { type: "SAVE_REJECTED", reason: "not_eligible" });
    expect(drillReducer(rejected, { type: "NEXT" })).toBe(rejected);
  });

  it("SKIP は rejected のみ。skipped を積んで次問へ", () => {
    const s0 = initialDrillState(items);
    expect(drillReducer(s0, { type: "SKIP" })).toBe(s0); // rejected 以外では無効
    const rejected = dispatch(
      s0,
      { type: "CHOOSE", label: "A", attemptId: UUID, elapsedMs: null },
      { type: "SAVE_REJECTED", reason: "not_eligible" },
    );
    const s = drillReducer(rejected, { type: "SKIP" });
    expect(s.index).toBe(1);
    expect(s.results).toEqual([{ questionId: "f-d1-q900001", kind: "skipped" }]);
  });

  it("flash も COMMIT 後の SAVE_REJECTED で rejected になり SKIP で進める", () => {
    const rejected = dispatch(
      initialDrillState(items),
      { type: "CHOOSE", label: "A", attemptId: UUID, elapsedMs: null },
      { type: "SAVE_OK" },
      { type: "NEXT" },
      { type: "FLIP" },
      { type: "RATE", rating: 2, elapsedMs: null },
      { type: "COMMIT", attemptId: UUID2 },
      { type: "SAVE_REJECTED", reason: "not_eligible" },
    );
    expect(rejected.current).toEqual({ step: "rejected", reason: "not_eligible" });
    expect(drillReducer(rejected, { type: "SKIP" }).phase).toBe("summary");
  });

  it("最終問の NEXT / SKIP で phase=summary", () => {
    const last = dispatch(
      initialDrillState([singleItem(1)]),
      { type: "CHOOSE", label: "B", attemptId: UUID, elapsedMs: null },
      { type: "SAVE_OK" },
      { type: "NEXT" },
    );
    expect(last.phase).toBe("summary");
  });
});

describe("FLAGGED(QuestionMenu の悪問フラグ)", () => {
  it("未回答でフラグ → rejected(not_eligible)になり SKIP で進める", () => {
    const s = dispatch(initialDrillState([flashItem(1), flashItem(2)]), { type: "FLAGGED" });
    expect(s.current).toEqual({ step: "rejected", reason: "not_eligible" });
    expect(drillReducer(s, { type: "SKIP" }).index).toBe(1);
  });

  it("rated(未送信)でフラグ → rejected(not_eligible)。未保存なので巻き戻し不要", () => {
    const rated = dispatch(initialDrillState([flashItem(1), flashItem(2)]), { type: "FLIP" }, { type: "RATE", rating: 3, elapsedMs: null });
    const s = drillReducer(rated, { type: "FLAGGED" });
    expect(s.current).toEqual({ step: "rejected", reason: "not_eligible" });
    expect(drillReducer(s, { type: "SKIP" }).results).toEqual([{ questionId: "f-d1-q900001", kind: "skipped" }]);
  });

  it("送信中(saving)・保存済み(saved)では no-op(送信した結果は巻き戻さない)", () => {
    const saving = dispatch(
      initialDrillState([flashItem(1), flashItem(2)]),
      { type: "FLIP" },
      { type: "RATE", rating: 3, elapsedMs: null },
      { type: "COMMIT", attemptId: UUID },
    );
    expect(drillReducer(saving, { type: "FLAGGED" })).toBe(saving);
    const saved = dispatch(
      initialDrillState([singleItem(1)]),
      { type: "CHOOSE", label: "B", attemptId: UUID, elapsedMs: null },
      { type: "SAVE_OK" },
    );
    expect(drillReducer(saved, { type: "FLAGGED" })).toBe(saved);
  });
});

describe("toAnswerRequest(POST /api/answers の payload。schema に適合すること)", () => {
  it("flash: kind=flash + 確定後の rating、elapsed_ms は初回評価時点、mode は常に drill", () => {
    const s = dispatch(
      initialDrillState([flashItem(1)]),
      { type: "FLIP" },
      { type: "RATE", rating: 3, elapsedMs: 800 },
      { type: "RATE", rating: 2, elapsedMs: 5000 },
      { type: "COMMIT", attemptId: UUID },
    );
    if (s.current.step !== "answered") throw new Error("unreachable");
    const req = toAnswerRequest(flashItem(1), s.current);
    expect(answerRequestSchema.parse(req)).toEqual({
      attempt_id: UUID,
      question_id: "f-d1-q900001",
      question_rev: 1,
      mode: "drill",
      elapsed_ms: 800,
      kind: "flash",
      rating: 2,
    });
  });

  it("mcq: kind=mcq + chosen", () => {
    const s = dispatch(initialDrillState([singleItem(1)]), {
      type: "CHOOSE",
      label: "A",
      attemptId: UUID2,
      elapsedMs: null,
    });
    if (s.current.step !== "answered") throw new Error("unreachable");
    const req = toAnswerRequest(singleItem(1), s.current);
    expect(answerRequestSchema.parse(req)).toMatchObject({
      attempt_id: UUID2,
      kind: "mcq",
      chosen: ["A"],
      elapsed_ms: null,
    });
  });
});

describe("classifyAnswerResponse(HTTP → イベントの全ステータス網羅)", () => {
  it("200 → SAVE_OK(replayed も成功)", () => {
    expect(classifyAnswerResponse(200, { replayed: true })).toEqual({ type: "SAVE_OK" });
  });

  it("400 / 401 / 404 → 恒久拒否", () => {
    expect(classifyAnswerResponse(400, { error: "invalid_request" })).toEqual({
      type: "SAVE_REJECTED",
      reason: "bad_request",
    });
    expect(classifyAnswerResponse(401, {})).toEqual({ type: "SAVE_REJECTED", reason: "unauthorized" });
    expect(classifyAnswerResponse(404, { error: "unknown_question" })).toEqual({
      type: "SAVE_REJECTED",
      reason: "unknown_question",
    });
  });

  it("409 は body.error で振り分ける", () => {
    for (const error of ["stale_question_rev", "attempt_payload_mismatch", "not_eligible"] as const) {
      expect(classifyAnswerResponse(409, { error })).toEqual({ type: "SAVE_REJECTED", reason: error });
    }
    expect(classifyAnswerResponse(409, {})).toEqual({ type: "SAVE_REJECTED", reason: "bad_request" });
  });

  it("その他 4xx → 安全側の恒久拒否、5xx → SAVE_FAIL(Retry 可能)", () => {
    expect(classifyAnswerResponse(403, {})).toEqual({ type: "SAVE_REJECTED", reason: "bad_request" });
    expect(classifyAnswerResponse(500, {})).toMatchObject({ type: "SAVE_FAIL" });
    expect(classifyAnswerResponse(503, {})).toMatchObject({ type: "SAVE_FAIL" });
  });
});

describe("summarize(flash: rating 分布 / MCQ: 正答率。skipped は分母から除外)", () => {
  it("分布と正答率を集計する", () => {
    const summary = summarize([
      { questionId: "a", kind: "flash", rating: 1 },
      { questionId: "b", kind: "flash", rating: 3 },
      { questionId: "c", kind: "flash", rating: 3 },
      { questionId: "d", kind: "mcq", chosen: ["B"], isCorrect: true },
      { questionId: "e", kind: "mcq", chosen: ["A"], isCorrect: false },
      { questionId: "f", kind: "skipped" },
    ]);
    expect(summary.flashRatings).toEqual({ 1: 1, 2: 0, 3: 2, 4: 0 });
    expect(summary.mcqTotal).toBe(2);
    expect(summary.mcqCorrect).toBe(1);
    expect(summary.skipped).toBe(1);
  });
});

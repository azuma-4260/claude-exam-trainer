import { describe, expect, it } from "vitest";
import {
  canNext,
  initialPracticeState,
  practiceReducer,
  toAnswerRequest,
  type PracticeState,
} from "./machine";
import type { PracticeItem } from "./serve";

// D2-1: S-4 Practice の ACK 状態機械(specs/05 S-4、03 §学習回答の書込プロトコル)。
// S-3 との差分 = 単一選択でも明示 Answer が必要(選択即送信しない)。ACK 意味論は S-3 と同一。

const item = (id: string, over: Partial<PracticeItem> = {}): PracticeItem => ({
  questionId: id,
  rev: 1,
  type: "mcq_single",
  scenarioId: null,
  stemEn: "Which transport should the MCP server use?",
  choices: [
    { label: "A", textEn: "stdio" },
    { label: "B", textEn: "Streamable HTTP" },
  ],
  answer: ["B"],
  explanationJa: "解説",
  refs: ["https://docs.claude.com/en/docs/mcp"],
  released: false,
  source: "pool",
  ...over,
});

const multiItem = (id: string): PracticeItem =>
  item(id, { type: "mcq_multi", answer: ["A", "B"], choices: [
    { label: "A", textEn: "a" },
    { label: "B", textEn: "b" },
    { label: "C", textEn: "c" },
  ] });

const UUID = "11111111-1111-4111-8111-111111111111";
const answerEvent = { type: "ANSWER", attemptId: UUID, elapsedMs: 1200 } as const;

const answered = (s: PracticeState, labels: string[] = ["B"]): PracticeState => {
  let st = s;
  for (const l of labels) st = practiceReducer(st, { type: "TOGGLE", label: l });
  return practiceReducer(st, answerEvent);
};

describe("initialPracticeState", () => {
  it("空バッチは呼び出し側の empty state 責務(throw)", () => {
    expect(() => initialPracticeState([])).toThrow();
  });
});

describe("選択と Answer(S-4: 単一選択でも明示 Answer 必須)", () => {
  it("mcq_single の TOGGLE は選択を置換する(即送信しない)", () => {
    let s = initialPracticeState([item("f-d1-q001")]);
    s = practiceReducer(s, { type: "TOGGLE", label: "A" });
    expect(s.current).toEqual({ step: "choosing", chosen: ["A"] });
    s = practiceReducer(s, { type: "TOGGLE", label: "B" });
    expect(s.current).toEqual({ step: "choosing", chosen: ["B"] });
  });

  it("mcq_multi の TOGGLE は追加/削除", () => {
    let s = initialPracticeState([multiItem("f-d1-q001")]);
    s = practiceReducer(s, { type: "TOGGLE", label: "A" });
    s = practiceReducer(s, { type: "TOGGLE", label: "C" });
    expect(s.current).toEqual({ step: "choosing", chosen: ["A", "C"] });
    s = practiceReducer(s, { type: "TOGGLE", label: "C" });
    expect(s.current).toEqual({ step: "choosing", chosen: ["A"] });
  });

  it("未選択の ANSWER は no-op(採点されない)", () => {
    const s = initialPracticeState([item("f-d1-q001")]);
    expect(practiceReducer(s, answerEvent)).toBe(s);
  });

  it("ANSWER で即時採点(集合一致・部分点なし)+ saving へ", () => {
    const correct = answered(initialPracticeState([item("f-d1-q001")]), ["B"]);
    expect(correct.current).toMatchObject({ step: "answered", isCorrect: true, save: "saving", attemptId: UUID });
    const wrong = answered(initialPracticeState([multiItem("f-d1-q002")]), ["A"]);
    expect(wrong.current).toMatchObject({ step: "answered", isCorrect: false });
    const multiOk = answered(initialPracticeState([multiItem("f-d1-q003")]), ["B", "A"]);
    expect(multiOk.current).toMatchObject({ step: "answered", isCorrect: true });
  });

  it("answered 後の TOGGLE / ANSWER は no-op(回答確定後に選択を変えられない)", () => {
    const s = answered(initialPracticeState([item("f-d1-q001")]));
    expect(practiceReducer(s, { type: "TOGGLE", label: "A" })).toBe(s);
    expect(practiceReducer(s, answerEvent)).toBe(s);
  });
});

describe("厳密 ACK(S-3 と同一ルール)", () => {
  it("SAVE_OK まで Next 不可、SAVE_OK で活性化", () => {
    const saving = answered(initialPracticeState([item("f-d1-q001")]));
    expect(canNext(saving)).toBe(false);
    expect(practiceReducer(saving, { type: "NEXT" })).toBe(saving);
    const saved = practiceReducer(saving, { type: "SAVE_OK" });
    expect(canNext(saved)).toBe(true);
  });

  it("SAVE_FAIL は回答状態を保持し、RETRY で同一 attemptId のまま saving に戻る", () => {
    const saving = answered(initialPracticeState([item("f-d1-q001")]));
    const failed = practiceReducer(saving, { type: "SAVE_FAIL", message: "HTTP 500" });
    expect(failed.current).toMatchObject({ step: "answered", save: "failed", failMessage: "HTTP 500", chosen: ["B"] });
    expect(canNext(failed)).toBe(false);
    const retried = practiceReducer(failed, { type: "RETRY" });
    expect(retried.current).toMatchObject({ step: "answered", save: "saving", attemptId: UUID });
  });

  it("SAVE_REJECTED(not_eligible)→ SKIP で次問へ、結果は skipped", () => {
    let s = answered(initialPracticeState([item("f-d1-q001"), item("f-d1-q002")]));
    s = practiceReducer(s, { type: "SAVE_REJECTED", reason: "not_eligible" });
    expect(s.current).toEqual({ step: "rejected", reason: "not_eligible" });
    s = practiceReducer(s, { type: "SKIP" });
    expect(s.index).toBe(1);
    expect(s.results).toEqual([{ questionId: "f-d1-q001", kind: "skipped" }]);
  });

  it("NEXT で結果が積まれ、最終問の NEXT で done", () => {
    let s = answered(initialPracticeState([item("f-d1-q001"), item("f-d1-q002")]));
    s = practiceReducer(practiceReducer(s, { type: "SAVE_OK" }), { type: "NEXT" });
    expect(s.index).toBe(1);
    expect(s.phase).toBe("running");
    expect(s.results).toEqual([{ questionId: "f-d1-q001", kind: "mcq", isCorrect: true }]);
    s = answered(s, ["A"]);
    s = practiceReducer(practiceReducer(s, { type: "SAVE_OK" }), { type: "NEXT" });
    expect(s.phase).toBe("done");
    expect(s.results).toHaveLength(2);
  });

  it("FLAGGED は未回答時のみ rejected(not_eligible)にする(回答保存済みは巻き戻さない)", () => {
    const choosing = initialPracticeState([item("f-d1-q001")]);
    expect(practiceReducer(choosing, { type: "FLAGGED" }).current).toEqual({ step: "rejected", reason: "not_eligible" });
    const saved = practiceReducer(answered(initialPracticeState([item("f-d1-q001")])), { type: "SAVE_OK" });
    expect(practiceReducer(saved, { type: "FLAGGED" })).toBe(saved);
  });
});

describe("toAnswerRequest", () => {
  it("mode=practice の mcq payload を組む(03 の書込プロトコルに適合)", () => {
    const s = answered(initialPracticeState([item("f-d1-q001")]));
    if (s.current.step !== "answered") throw new Error("answered のはず");
    expect(toAnswerRequest(s.items[0], s.current)).toEqual({
      attempt_id: UUID,
      question_id: "f-d1-q001",
      question_rev: 1,
      mode: "practice",
      elapsed_ms: 1200,
      kind: "mcq",
      chosen: ["B"],
    });
  });
});

import { describe, expect, it } from "vitest";
import type { MockForm, Question } from "@/lib/bank/schema";
import { mcq } from "@/lib/queue/test-fixtures";
import {
  assembleMistakesView,
  deriveMistakeSummaries,
  type MistakeAttempt,
} from "./derive";

// D4-2: 間違いノートの状態遷移(specs/03 §間違いノート、05 S-7)。
// 永続状態は持たず、practice / mock attempt を時系列に走査して毎回導出する。

const START = new Date("2026-09-07T09:00:00+09:00");
let sequence = 0;

function att(
  questionId: string,
  isCorrect: boolean,
  minute: number,
  mode: MistakeAttempt["mode"] = "practice",
): MistakeAttempt {
  sequence += 1;
  return {
    attemptId: `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    questionId,
    mode,
    isCorrect,
    answeredAt: new Date(START.getTime() + minute * 60_000),
  };
}

const bankOf = (questions: Question[], forms: MockForm[] = []) => ({
  questions,
  forms,
  byId: new Map(questions.map((q) => [q.id, q])),
});

describe("deriveMistakeSummaries", () => {
  it("誤答すると掲載される", () => {
    expect(deriveMistakeSummaries([att("f-d1-q001", false, 0)])).toMatchObject([
      { questionId: "f-d1-q001", wrongCount: 1, correctStreak: 0 },
    ]);
  });

  it("誤答後の 3 連続正解で自然消滅する", () => {
    const id = "f-d1-q001";
    const attempts = [att(id, false, 0), att(id, true, 1), att(id, true, 2), att(id, true, 3)];
    expect(deriveMistakeSummaries(attempts)).toEqual([]);
  });

  it("卒業後の再誤答で自然復帰し、連続正解数は 0 に戻る", () => {
    const id = "f-d1-q001";
    const attempts = [
      att(id, false, 0),
      att(id, true, 1),
      att(id, true, 2),
      att(id, true, 3),
      att(id, false, 4),
    ];
    expect(deriveMistakeSummaries(attempts)).toMatchObject([
      { questionId: id, wrongCount: 2, correctStreak: 0 },
    ]);
  });

  it("入力順ではなく answered_at 順で走査し、practice / mock だけを対象にする", () => {
    const id = "f-d1-q001";
    const attempts = [
      att(id, true, 3, "mock"),
      att(id, false, 0, "practice"),
      att(id, false, 4, "drill"),
      att(id, true, 1, "practice"),
      att(id, true, 2, "mock"),
    ];
    expect(deriveMistakeSummaries(attempts)).toEqual([]);
  });

  it("誤答回数の降順で並べ、同数なら最新回答、question id の順で決定的にする", () => {
    const attempts = [
      att("f-d1-q001", false, 0),
      att("f-d1-q002", false, 1),
      att("f-d1-q002", false, 2),
      att("f-d1-q003", false, 3),
    ];
    expect(deriveMistakeSummaries(attempts).map((x) => x.questionId)).toEqual([
      "f-d1-q002",
      "f-d1-q003",
      "f-d1-q001",
    ]);
  });
});

describe("assembleMistakesView", () => {
  const question = mcq("f-d1-q001", { scenario_id: "sc-a" });

  it("一覧と総ざらいを同じ誤答回数順で組み立て、総ざらい項目は practice 回答として提示する", () => {
    const second = mcq("f-d1-q002");
    const view = assembleMistakesView({
      bank: bankOf([question, second]),
      poolCtx: { forms: [], sessions: [], flags: [] },
      scenarios: [{ id: "sc-a", title_en: "Scenario A", context_en: "Context A" } as never],
      attempts: [att(question.id, false, 0, "mock"), att(second.id, false, 1), att(second.id, false, 2)],
    });
    expect(view.kind).toBe("ok");
    if (view.kind !== "ok") return;
    expect(view.items.map((x) => [x.questionId, x.wrongCount, x.correctStreak])).toEqual([
      [second.id, 2, 0],
      [question.id, 1, 0],
    ]);
    expect(view.review.items.map((x) => [x.questionId, x.source])).toEqual([
      [second.id, "mistake"],
      [question.id, "mistake"],
    ]);
    expect(view.review.scenarios).toEqual([{ id: "sc-a", title_en: "Scenario A", context_en: "Context A" }]);
  });

  it("未提出 full form の収載問題は attempt があっても掲載しない。提出後は掲載する", () => {
    const formIds = Array.from({ length: 60 }, (_, i) => `f-d1-q${String(100 + i)}`);
    const form: MockForm = { id: "form-a", exam: "ccar-f", scenario_ids: ["sc-a"], question_ids: formIds };
    const formQuestion = mcq(formIds[0], {
      scenario_id: "sc-a",
      eligible_modes: ["mock", "practice"],
      srs_eligible: false,
    });
    const attempts = [att(formQuestion.id, false, 0, "mock")];
    const bank = bankOf([formQuestion], [form]);

    expect(
      assembleMistakesView({ bank, attempts, scenarios: null, poolCtx: { forms: [form], sessions: [], flags: [] } }),
    ).toEqual({ kind: "empty" });

    const submitted = { exam: "ccar-f", formId: "form-a", kind: "full", status: "submitted" } as const;
    const released = assembleMistakesView({
      bank,
      attempts,
      scenarios: null,
      poolCtx: { forms: [form], sessions: [submitted], flags: [] },
    });
    expect(released.kind).toBe("ok");
    if (released.kind !== "ok") return;
    expect(released.items[0]).toMatchObject({ questionId: formQuestion.id, released: true });
  });

  it("retired・現行 rev の未解決フラグ・practice mode 不適格・バンク欠落は掲載しない", () => {
    const retired = mcq("f-d1-q002", { status: "retired" });
    const flagged = mcq("f-d1-q003");
    const mockOnly = mcq("f-d1-q004", { eligible_modes: ["mock"] });
    const bank = bankOf([question, retired, flagged, mockOnly]);
    const view = assembleMistakesView({
      bank,
      scenarios: null,
      attempts: [question, retired, flagged, mockOnly].map((q, i) => att(q.id, false, i)).concat(att("f-d1-q999", false, 5)),
      poolCtx: {
        forms: [],
        sessions: [],
        flags: [{ questionId: flagged.id, questionRev: flagged.rev, resolvedAt: null }],
      },
    });
    expect(view.kind).toBe("ok");
    if (view.kind !== "ok") return;
    expect(view.items.map((x) => x.questionId)).toEqual([question.id]);
  });

  it("20 問超の総ざらいは、その周回で提示済みの ID を除いて後続バッチへ進む", () => {
    const questions = Array.from({ length: 23 }, (_, i) => mcq(`f-d1-q${String(100 + i)}`));
    const attempts = questions.map((q, i) => att(q.id, false, i));
    const first = assembleMistakesView({
      bank: bankOf(questions),
      poolCtx: { forms: [], sessions: [], flags: [] },
      scenarios: null,
      attempts,
    });
    if (first.kind !== "ok") throw new Error("ok のはず");
    expect(first.review.items).toHaveLength(20);
    expect(first.review.remainingAfterBatch).toBe(3);

    const seen = new Set(first.review.items.map((item) => item.questionId));
    const second = assembleMistakesView({
      bank: bankOf(questions),
      poolCtx: { forms: [], sessions: [], flags: [] },
      scenarios: null,
      attempts,
      reviewExcludeIds: seen,
    });
    if (second.kind !== "ok") throw new Error("ok のはず");
    expect(second.items).toHaveLength(23); // 一覧自体は周回位置で減らさない
    expect(second.review.items.map((item) => item.questionId)).toEqual(
      questions.slice(0, 3).reverse().map((q) => q.id),
    );
    expect(second.review.remainingAfterBatch).toBe(0);
  });
});

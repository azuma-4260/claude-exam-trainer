import { describe, expect, it } from "vitest";
import type { Bank } from "@/lib/bank/load";
import type { Question } from "@/lib/bank/schema";
import type { MistakeAttempt } from "@/lib/mistakes/derive";
import { leadingRun, selectDMinus1Items } from "./d-minus-1";
import { emptyCtx, holdoutForm, pflash, pmcq, srsRow } from "./test-fixtures";

const formIds = (first: string) => [first, ...Array.from({ length: 59 }, (_, i) => `f-d1-q${900 + i}`)];

// D5-1: D-1 セレクタ(specs/04 §直前期と D-1)。間違いノート → low-stability 順、当日回答済み除外

const bankOf = (questions: Question[], forms: Bank["forms"] = []): Bank => ({
  questions,
  forms,
  byId: new Map(questions.map((q) => [q.id, q])),
});

const wrong = (questionId: string, n = 1): MistakeAttempt[] =>
  Array.from({ length: n }, (_, i) => ({
    attemptId: `${questionId}-w${i}`,
    questionId,
    mode: "practice",
    isCorrect: false,
    answeredAt: new Date(`2026-12-0${i + 1}T09:00:00+09:00`),
  }));

const run = (over: Partial<Parameters<typeof selectDMinus1Items>[0]> & { bank: Bank }) =>
  selectDMinus1Items({
    poolCtx: emptyCtx(over.bank.forms),
    srsRows: [],
    mistakeAttempts: [],
    answeredTodayIds: new Set(),
    ...over,
  });

const prow = (id: string, stability: number) => srsRow(id, { exam: "ccar-p", stability });

describe("selectDMinus1Items", () => {
  it("間違いノート(誤答回数降順)→ stability 昇順。重複は間違いノート側だけに出る", () => {
    const qs = ["p-d1-q001", "p-d1-q002", "p-d1-q003", "p-d1-q004"].map((id) => pmcq(id));
    const items = run({
      bank: bankOf(qs),
      mistakeAttempts: [...wrong("p-d1-q002", 1), ...wrong("p-d1-q001", 2)],
      srsRows: [prow("p-d1-q004", 9), prow("p-d1-q003", 2), prow("p-d1-q001", 1)],
    });
    expect(items.map((i) => i.questionId)).toEqual(["p-d1-q001", "p-d1-q002", "p-d1-q003", "p-d1-q004"]);
  });

  it("stability 同値は id 昇順。due 済みかどうかは順序に影響しない", () => {
    const qs = ["p-d1-q001", "p-d1-q002", "p-d1-q003"].map((id) => pflash(id));
    const items = run({
      bank: bankOf(qs),
      srsRows: [
        prow("p-d1-q003", 3),
        prow("p-d1-q002", 3),
        { ...prow("p-d1-q001", 8), dueAt: new Date("2030-01-01T00:00:00+09:00") },
      ],
    });
    expect(items.map((i) => i.questionId)).toEqual(["p-d1-q002", "p-d1-q003", "p-d1-q001"]);
  });

  it("当日すでに回答した問題は間違いノートからも stability 側からも除く", () => {
    const qs = ["p-d1-q001", "p-d1-q002"].map((id) => pmcq(id));
    const items = run({
      bank: bankOf(qs),
      mistakeAttempts: wrong("p-d1-q001"),
      srsRows: [prow("p-d1-q002", 1)],
      answeredTodayIds: new Set(["p-d1-q001"]),
    });
    expect(items.map((i) => i.questionId)).toEqual(["p-d1-q002"]);
  });

  it("mode: drill 可なら drill、practice 専用なら practice。間違いノートの flash は除外", () => {
    const qs = [
      pmcq("p-d1-q001", { eligible_modes: ["practice"] }),
      pmcq("p-d1-q002"),
      pflash("p-d1-q003"),
    ];
    const items = run({
      bank: bankOf(qs),
      mistakeAttempts: [...wrong("p-d1-q001"), ...wrong("p-d1-q002"), ...wrong("p-d1-q003")],
    });
    expect(items.map((i) => [i.questionId, i.mode])).toEqual([
      ["p-d1-q001", "practice"],
      ["p-d1-q002", "drill"],
    ]);
  });

  it("出題不可(holdout 未提出フォーム収載・バンク外)は出さない", () => {
    const form = holdoutForm("form-a", formIds("f-d1-q001"));
    const inForm = pmcq("f-d1-q001", { exam: "ccar-f", eligible_modes: ["mock", "practice"], srs_eligible: false });
    const items = run({
      bank: bankOf([inForm], [form]),
      mistakeAttempts: [...wrong("f-d1-q001"), ...wrong("p-gone-q999")],
      srsRows: [prow("p-gone-q998", 1)],
    });
    expect(items).toEqual([]);
  });
});

describe("leadingRun", () => {
  const it_ = (mode: "drill" | "practice") => ({ mode });
  it("先頭と同じ mode の連続区間だけ返す", () => {
    expect(leadingRun([it_("practice"), it_("practice"), it_("drill"), it_("practice")])).toHaveLength(2);
    expect(leadingRun([it_("drill"), it_("practice")])).toHaveLength(1);
    expect(leadingRun([it_("drill"), it_("drill")])).toHaveLength(2);
    expect(leadingRun([])).toEqual([]);
  });
});

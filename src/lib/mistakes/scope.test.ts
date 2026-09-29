import { describe, expect, it } from "vitest";
import { combineExamBanks, scopeBank } from "@/lib/bank/runtime";
import { mcq, pmcq } from "@/lib/queue/test-fixtures";
import { assembleMistakesView, type MistakeAttempt } from "./derive";

// T-exam: 間違いノートは学習スコープ内 exam の attempt のみ(specs/03 §間違いノート v1.3、01 FR-7)

const f1 = mcq("f-d1-q001");
const p1 = pmcq("p-d1-q001");
const multi = combineExamBanks([
  { exam: "ccar-f", questions: [f1], forms: [], syllabus: null, scenarios: null },
  { exam: "ccar-p", questions: [p1], forms: [], syllabus: null, scenarios: null },
]);
const at = new Date("2026-10-01T09:00:00+09:00");
const attempts: MistakeAttempt[] = [
  { attemptId: "00000000-0000-4000-8000-000000000001", questionId: "f-d1-q001", mode: "practice", isCorrect: false, answeredAt: at },
  { attemptId: "00000000-0000-4000-8000-000000000002", questionId: "p-d1-q001", mode: "practice", isCorrect: false, answeredAt: at },
];
const ids = (scope: "ccar-f" | "ccar-p" | "both") => {
  const view = assembleMistakesView({
    bank: scopeBank(multi, scope).bank,
    poolCtx: { forms: [], sessions: [], flags: [] },
    scenarios: null,
    attempts,
  });
  return view.kind === "ok" ? view.items.map((i) => i.questionId) : [];
};

describe("間違いノートのスコープ絞り込み", () => {
  it("ccar-f は F だけ、ccar-p は P だけ、both は両方", () => {
    expect(ids("ccar-f")).toEqual(["f-d1-q001"]);
    expect(ids("ccar-p")).toEqual(["p-d1-q001"]);
    expect(ids("both").sort()).toEqual(["f-d1-q001", "p-d1-q001"]);
  });
});

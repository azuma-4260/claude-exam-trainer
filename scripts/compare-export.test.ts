import { describe, expect, it } from "vitest";
import type { ExportData } from "../src/lib/export/filter";
import { compareExamExports } from "./compare-export";

// D6-1 DoD: deploy 前の全体 export(study_setting なし)と deploy 後の ?exam=ccar-f の比較(specs/06 v1.3)

const T = "2026-09-20T00:00:00.000Z";
const before: ExportData = {
  srs_state: [
    { questionId: "f-d1-q002", exam: "ccar-f", dueAt: T, stability: 3.5 },
    { questionId: "f-d1-q001", exam: "ccar-f", dueAt: T, stability: 1.2 },
  ],
  attempt: [{ attemptId: "a1", questionId: "f-d1-q001", exam: "ccar-f", answeredAt: T }],
  exam_session: [{ id: "s1", exam: "ccar-f", formId: "form-a" }],
  exam_session_answer: [{ sessionId: "s1", questionId: "f-d1-q100", chosen: ["A"] }],
  question_flag: [{ id: "g1", questionId: "f-d1-q001", questionRev: 1 }],
};

describe("compareExamExports", () => {
  it("行順が違っても、全体 export と ?exam=ccar-f の出力(study_setting / P 行の有無)が同じ F 行なら一致", () => {
    const after: ExportData = {
      ...before,
      srs_state: [...before.srs_state].reverse(),
      attempt: [...before.attempt, { attemptId: "a2", questionId: "p-d1-q001", exam: "ccar-p", answeredAt: T }],
      study_setting: [{ id: 1, scope: "ccar-p", updatedAt: T }],
    };
    expect(compareExamExports(before, after, "ccar-f").ok).toBe(true);
  });

  it("F 行の中身が 1 列でも変わる・消える・増えると不一致", () => {
    const changed = { ...before, srs_state: [{ ...before.srs_state[0], stability: 9 }, before.srs_state[1]] };
    const r = compareExamExports(before, changed, "ccar-f");
    expect(r.ok).toBe(false);
    expect(r.tables.find((t) => t.table === "srs_state")?.changed).toEqual(["f-d1-q002"]);

    const removed = { ...before, exam_session_answer: [] };
    expect(compareExamExports(before, removed, "ccar-f").tables.find((t) => t.table === "exam_session_answer")?.missing).toEqual([
      "s1|f-d1-q100",
    ]);

    const added = { ...before, question_flag: [...before.question_flag, { id: "g2", questionId: "f-d1-q002", questionRev: 1 }] };
    expect(compareExamExports(before, added, "ccar-f").ok).toBe(false);
  });
});

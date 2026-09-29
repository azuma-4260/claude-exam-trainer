import { describe, expect, it } from "vitest";
import { filterExportByExam, type ExportData } from "./filter";

// T-exam: /api/export?exam= の絞り込み規則(specs/03 §3 v1.3)
//   exam 列を持つテーブルはその exam の行 / exam_session_answer は親 session の exam /
//   question_flag は question_id の exam 接頭辞 / study_setting は含めない

const T = "2026-10-01T00:00:00.000Z";
const data: ExportData = {
  srs_state: [
    { questionId: "f-d1-q001", exam: "ccar-f" },
    { questionId: "p-d1-q001", exam: "ccar-p" },
  ],
  attempt: [
    { attemptId: "a1", questionId: "f-d1-q001", exam: "ccar-f" },
    { attemptId: "a2", questionId: "p-d1-q001", exam: "ccar-p" },
  ],
  exam_session: [
    { id: "s-f", exam: "ccar-f" },
    { id: "s-p", exam: "ccar-p" },
  ],
  exam_session_answer: [
    { sessionId: "s-f", questionId: "f-d1-q100" },
    { sessionId: "s-p", questionId: "p-d1-q100" },
  ],
  question_flag: [
    { id: "g1", questionId: "f-d1-q001", questionRev: 1 },
    { id: "g2", questionId: "p-d1-q001", questionRev: 1 },
  ],
  study_setting: [{ id: 1, scope: "both", updatedAt: T }],
};

describe("filterExportByExam", () => {
  it("ccar-f: 各テーブルを F の行に絞り、study_setting を含めない", () => {
    const f = filterExportByExam(data, "ccar-f");
    expect(Object.keys(f)).toEqual(["srs_state", "attempt", "exam_session", "exam_session_answer", "question_flag"]);
    expect(f.srs_state).toEqual([data.srs_state[0]]);
    expect(f.attempt).toEqual([data.attempt[0]]);
    expect(f.exam_session).toEqual([data.exam_session[0]]);
    expect(f.exam_session_answer).toEqual([data.exam_session_answer[0]]);
    expect(f.question_flag).toEqual([data.question_flag[0]]);
  });

  it("ccar-p: P の行だけ(exam_session_answer は親 session の exam で判定)", () => {
    const p = filterExportByExam(data, "ccar-p");
    expect(p.exam_session_answer).toEqual([{ sessionId: "s-p", questionId: "p-d1-q100" }]);
    expect(p.question_flag.map((r) => r.id)).toEqual(["g2"]);
  });

  it("冪等(絞り込み済みの export に再適用しても変わらない)。study_setting 無しの旧形式 export にも適用できる", () => {
    const once = filterExportByExam(data, "ccar-f");
    expect(filterExportByExam({ ...once }, "ccar-f")).toEqual(once);
    const { study_setting: _omit, ...legacy } = data;
    void _omit;
    expect(filterExportByExam(legacy, "ccar-f")).toEqual(once);
  });
});

import type { Exam } from "@/lib/bank/schema";
import { examOfQuestionId } from "@/lib/exam/dates";

/**
 * /api/export?exam= の絞り込み(specs/03 §3 v1.3)。DB から読んだ全体 export に純関数で適用する
 * (行の直列化を全体 export と同一に保ち、deploy 前の全体 export から同じ規則で F を抽出して比較できるように)。
 * - exam 列を持つテーブル(srs_state / attempt / exam_session)はその exam の行
 * - exam_session_answer は親 session の exam
 * - question_flag は question_id の exam 接頭辞
 * - study_setting は含めない
 */

type Row = Record<string, unknown>;

export type ExportData = {
  srs_state: Row[];
  attempt: Row[];
  exam_session: Row[];
  exam_session_answer: Row[];
  question_flag: Row[];
  /** 全体 export のみ(D6-1 以前の export には無い) */
  study_setting?: Row[];
};

export type ExamExportData = Omit<ExportData, "study_setting">;

export function filterExportByExam(data: ExportData, exam: Exam): ExamExportData {
  const sessions = data.exam_session.filter((s) => s.exam === exam);
  const sessionIds = new Set(sessions.map((s) => s.id));
  return {
    srs_state: data.srs_state.filter((r) => r.exam === exam),
    attempt: data.attempt.filter((r) => r.exam === exam),
    exam_session: sessions,
    exam_session_answer: data.exam_session_answer.filter((r) => sessionIds.has(r.sessionId)),
    question_flag: data.question_flag.filter((r) => examOfQuestionId(String(r.questionId)) === exam),
  };
}

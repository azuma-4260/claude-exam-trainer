import { EXAM_PREFIX, EXAMS, type Exam } from "@/lib/bank/schema";

/**
 * exam ごとの試験日(specs/04 §試験日対応 v1.3、01 FR-10)。Asia/Tokyo 暦日のコード定数。
 * null = 未設定。未設定の exam を含む学習スコープは選べない(specs/03 §study_setting)。
 */
export type ExamDates = Readonly<Record<Exam, string | null>>;

export const EXAM_DATE_JST: ExamDates = {
  "ccar-f": "2026-09-27",
  "ccar-p": "2026-12-12",
};

/** exam の試験日。未設定なら throw(未定義の試験日でスケジューリングしない) */
export function examDateOf(exam: Exam, dates: ExamDates = EXAM_DATE_JST): string {
  const d = dates[exam];
  if (!d) throw new Error(`試験日が未設定の exam: ${exam}`);
  return d;
}

/** question id の接頭辞(f- / p-)から exam を引く(id は exam 接頭辞で全体一意、specs/03 §1) */
export function examOfQuestionId(questionId: string): Exam {
  const prefix = questionId.split("-", 1)[0];
  const exam = EXAMS.find((e) => EXAM_PREFIX[e] === prefix);
  if (!exam) throw new Error(`exam 接頭辞が不明な question id: ${questionId}`);
  return exam;
}

import type { Exam } from "@/lib/bank/schema";
import { EXAM_DATE_JST, examDateOf, type ExamDates } from "@/lib/exam/dates";
import type { StudyScope } from "@/lib/scope/scope";
import { daysUntilExam } from "@/lib/srs/scheduler";

/**
 * 直前期(試験日 − 7 日〜前日)の局面。単独スコープのときだけ、そのスコープの exam の試験日で判定する
 * (specs/04 §直前期と D-1。`both` は常に通常。05 S-1 の推奨行動カードの出し分け)。
 */
export type PreExamPhase = { exam: Exam; daysLeft: number; phase: "freeze" | "d_minus_1" };

export function preExamPhase(now: Date, scope: StudyScope, examDates: ExamDates = EXAM_DATE_JST): PreExamPhase | null {
  if (scope === "both") return null;
  const daysLeft = daysUntilExam(now, examDateOf(scope, examDates));
  if (daysLeft < 1 || daysLeft > 7) return null;
  return { exam: scope, daysLeft, phase: daysLeft === 1 ? "d_minus_1" : "freeze" };
}

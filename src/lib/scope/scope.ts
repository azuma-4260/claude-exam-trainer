import { z } from "zod";
import { EXAMS, type Exam } from "@/lib/bank/schema";
import { EXAM_DATE_JST, type ExamDates } from "@/lib/exam/dates";

/**
 * 学習スコープ(specs/01 FR-10、03 §study_setting v1.3)。
 * 出題・キュー・習熟度・間違いノート・Stats・模試の開始候補はスコープ内の exam に絞る。
 * 進行中の模試セッション・フラグ一覧・export・readiness 判定はスコープに依存しない。
 */

export const STUDY_SCOPES = ["ccar-f", "ccar-p", "both"] as const;
export const studyScopeSchema = z.enum(STUDY_SCOPES);
export type StudyScope = z.infer<typeof studyScopeSchema>;

/** study_setting 行が無い場合の実効値(S-3 以前の挙動と同一) */
export const DEFAULT_STUDY_SCOPE: StudyScope = "ccar-f";

/** スコープに含まれる exam(EXAMS の定義順) */
export function scopeExams(scope: StudyScope): Exam[] {
  return scope === "both" ? [...EXAMS] : [scope];
}

export function inScope(scope: StudyScope, exam: Exam): boolean {
  return scope === "both" || scope === exam;
}

/** DB 行 → 実効スコープ。行なしは既定値、不正値は fail closed(書込は Zod で検証済みのはず) */
export function scopeFromRow(row: { scope: string } | undefined): StudyScope {
  if (!row) return DEFAULT_STUDY_SCOPE;
  return studyScopeSchema.parse(row.scope);
}

export type ScopeValidation = { ok: true } | { ok: false; missingExamDates: Exam[] };

/** 試験日が未設定の exam を含むスコープは選択不可(fail closed) */
export function validateScope(scope: StudyScope, dates: ExamDates = EXAM_DATE_JST): ScopeValidation {
  const missingExamDates = scopeExams(scope).filter((e) => !dates[e]);
  return missingExamDates.length === 0 ? { ok: true } : { ok: false, missingExamDates };
}

/** 選択肢に出すスコープ(試験日未設定の exam を含むものは出さない。サーバーも 409 で拒否する) */
export function selectableScopes(dates: ExamDates = EXAM_DATE_JST): StudyScope[] {
  return STUDY_SCOPES.filter((s) => validateScope(s, dates).ok);
}

/** 問題・フォーム・ドメインに exam ラベル(F / P)を付けるか(05 全体構造: both のときのみ) */
export function showExamLabel(scope: StudyScope): boolean {
  return scope === "both";
}

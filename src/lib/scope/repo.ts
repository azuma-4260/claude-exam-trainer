import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { studySetting } from "@/db/schema";
import { EXAM_DATE_JST, type ExamDates } from "@/lib/exam/dates";
import { scopeFromRow, validateScope, type StudyScope } from "./scope";

/**
 * study_setting の読み書き(specs/03 §study_setting)。
 * 書込は study_setting の 1 行だけ(srs_state / attempt / exam_session / exam_session_answer /
 * question_flag には一切触れない)。初回は INSERT、以後は同じ行の UPDATE。
 */

export function buildScopeSelect(db: Db) {
  return db.select({ scope: studySetting.scope }).from(studySetting).where(eq(studySetting.id, 1));
}

export async function getStudyScope(db: Db): Promise<StudyScope> {
  const rows = await buildScopeSelect(db);
  return scopeFromRow(rows[0]);
}

export function buildSetScopeUpsert(db: Db, scope: StudyScope, now: Date) {
  return db
    .insert(studySetting)
    .values({ id: 1, scope, updatedAt: now })
    .onConflictDoUpdate({ target: studySetting.id, set: { scope, updatedAt: now } });
}

export type SetScopeResult =
  | { ok: true; scope: StudyScope }
  | { ok: false; error: "exam_date_unset"; exams: string[] };

/** サーバー側で試験日未設定の exam を含むスコープを拒否してから書く(fail closed) */
export async function setStudyScope(
  db: Db,
  scope: StudyScope,
  now: Date,
  dates: ExamDates = EXAM_DATE_JST,
): Promise<SetScopeResult> {
  const v = validateScope(scope, dates);
  if (!v.ok) return { ok: false, error: "exam_date_unset", exams: v.missingExamDates };
  await buildSetScopeUpsert(db, scope, now);
  return { ok: true, scope };
}

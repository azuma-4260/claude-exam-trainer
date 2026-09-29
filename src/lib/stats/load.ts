import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attempt, examSession, srsState } from "@/db/schema";
import { loadMultiBank, scopeBank } from "@/lib/bank/runtime";
import { getStudyScope } from "@/lib/scope/repo";
import { buildScopedStatsViews, type ExamStatsSection } from "./derive";

/**
 * S-8 用の読み取り。個人利用で行数が限定的なため並列発行する。
 * 学習スコープ内の exam ごとに section を返す(01 FR-8 v1.3)。
 */
export async function loadStatsViews(db: Db, now: Date = new Date()): Promise<ExamStatsSection[]> {
  const [scope, srsRows, attempts, sessions] = await Promise.all([
    getStudyScope(db),
    db.select().from(srsState),
    db
      .select({
        questionId: attempt.questionId,
        isCorrect: attempt.isCorrect,
        answeredAt: attempt.answeredAt,
        mode: attempt.mode,
        chosen: attempt.chosen,
        sessionId: attempt.sessionId,
      })
      .from(attempt),
    db.select().from(examSession).where(eq(examSession.status, "submitted")),
  ]);
  return buildScopedStatsViews({
    exams: scopeBank(loadMultiBank(), scope).exams,
    srsRows,
    attempts,
    sessions,
    now,
  });
}

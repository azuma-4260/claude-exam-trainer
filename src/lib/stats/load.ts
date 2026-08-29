import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attempt, examSession, srsState } from "@/db/schema";
import { loadBank } from "@/lib/bank/load";
import { loadSyllabusCached } from "@/lib/mock/server";
import { buildStatsView, type StatsView } from "./derive";

/** S-8 用の読み取り。個人利用で行数が限定的なため 3 クエリを並列発行する。 */
export async function loadStatsView(db: Db, now: Date = new Date()): Promise<StatsView> {
  const [srsRows, attempts, sessions] = await Promise.all([
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
  const bank = loadBank();
  return buildStatsView({
    questions: bank.questions,
    syllabus: loadSyllabusCached(),
    srsRows,
    attempts,
    sessions,
    now,
  });
}

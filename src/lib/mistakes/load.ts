import { asc, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attempt } from "@/db/schema";
import { loadPoolContext } from "@/lib/answer/store";
import { bankDir, loadBank } from "@/lib/bank/load";
import { loadScenarios } from "@/lib/bank/syllabus";
import { assembleMistakesView, type MistakeAttempt, type MistakesView } from "./derive";

/** practice / mock attempt だけを時系列で取得する。derive 側も対象 mode を再確認する。 */
export function buildMistakeAttemptsSelect(db: Db) {
  return db
    .select({
      attemptId: attempt.attemptId,
      questionId: attempt.questionId,
      mode: attempt.mode,
      isCorrect: attempt.isCorrect,
      answeredAt: attempt.answeredAt,
    })
    .from(attempt)
    .where(inArray(attempt.mode, ["practice", "mock"]))
    .orderBy(asc(attempt.answeredAt), asc(attempt.attemptId));
}

export async function loadMistakesView(
  db: Db,
  options: { reviewExcludeIds?: ReadonlySet<string> } = {},
): Promise<MistakesView> {
  const bank = loadBank();
  const [poolCtx, attempts] = await Promise.all([loadPoolContext(db, bank.forms), buildMistakeAttemptsSelect(db)]);
  return assembleMistakesView({
    bank,
    poolCtx,
    scenarios: loadScenarios(bankDir()),
    attempts: attempts satisfies MistakeAttempt[],
    reviewExcludeIds: options.reviewExcludeIds,
  });
}

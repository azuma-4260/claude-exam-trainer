import { asc, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attempt } from "@/db/schema";
import { loadPoolContext } from "@/lib/answer/store";
import { loadMultiBank, scopeBank } from "@/lib/bank/runtime";
import { getStudyScope } from "@/lib/scope/repo";
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
  // 表示対象は学習スコープ内 exam の問題のみ(specs/03 §間違いノート v1.3)。
  // scoped.bank.byId に無い(スコープ外 exam の)問題の attempt は掲載されない
  const [scope, poolCtx, attempts] = await Promise.all([
    getStudyScope(db),
    loadPoolContext(db, loadMultiBank().all.forms),
    buildMistakeAttemptsSelect(db),
  ]);
  const scoped = scopeBank(loadMultiBank(), scope);
  return assembleMistakesView({
    bank: scoped.bank,
    poolCtx,
    scenarios: scoped.scenarios,
    attempts: attempts satisfies MistakeAttempt[],
    reviewExcludeIds: options.reviewExcludeIds,
  });
}

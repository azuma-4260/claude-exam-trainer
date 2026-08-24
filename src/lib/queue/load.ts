import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attempt, srsState } from "@/db/schema";
import type { SrsStateUpsert } from "@/lib/srs/card-row";

/**
 * キュー生成・習熟度集計に使う DB 読み取り(D1-4)。
 * due 判定・new 判定はメモリ側(build.ts)で行うため、srs_state は全行を読む
 * (個人利用アプリで行数は高々バンク問題数。specs/06 の neon-http 前提で 2 クエリを並列発行)。
 */

export function buildSrsRowsSelect(db: Db) {
  return db.select().from(srsState);
}

/** coverage(specs/04)用: 1 回以上正解(is_correct=true)した question_id の集合 */
export function buildCorrectIdsSelect(db: Db) {
  return db.selectDistinct({ questionId: attempt.questionId }).from(attempt).where(eq(attempt.isCorrect, true));
}

export type QueueSignals = {
  srsRows: SrsStateUpsert[];
  correctQuestionIds: Set<string>;
};

export async function loadQueueSignals(db: Db): Promise<QueueSignals> {
  const [rows, corrects] = await Promise.all([buildSrsRowsSelect(db), buildCorrectIdsSelect(db)]);
  return {
    srsRows: rows.map(({ updatedAt: _u, ...rest }) => {
      void _u;
      return rest;
    }),
    correctQuestionIds: new Set(corrects.map((c) => c.questionId)),
  };
}

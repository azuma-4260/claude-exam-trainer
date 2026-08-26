import { and, eq, gte, inArray, isNotNull, lt } from "drizzle-orm";
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

/**
 * 消費シグナル用の当日 attempt(specs/04 §同日内リビルドの消費シグナル導出)。
 * 当日(>= todayStart)の drill / practice attempt を全件読む(mock は除外)。
 */
export function buildTodayLearnAttemptsSelect(db: Db, todayStart: Date) {
  return db
    .select({ questionId: attempt.questionId, appliedRating: attempt.appliedRating, mode: attempt.mode })
    .from(attempt)
    .where(and(inArray(attempt.mode, ["drill", "practice"]), gte(attempt.answeredAt, todayStart)));
}

/** 当日より前に applied_rating 非 null の attempt を持つ question_id(= 当日より前に FSRS 導入済み) */
export function buildIntroducedBeforeSelect(db: Db, todayStart: Date) {
  return db
    .selectDistinct({ questionId: attempt.questionId })
    .from(attempt)
    .where(and(isNotNull(attempt.appliedRating), lt(attempt.answeredAt, todayStart)));
}

export type ConsumptionRows = {
  todayRows: { questionId: string; appliedRating: number | null; mode: string }[];
  introducedBefore: Set<string>;
};

export async function loadConsumptionRows(db: Db, todayStart: Date): Promise<ConsumptionRows> {
  const [todayRows, before] = await Promise.all([
    buildTodayLearnAttemptsSelect(db, todayStart),
    buildIntroducedBeforeSelect(db, todayStart),
  ]);
  return { todayRows, introducedBefore: new Set(before.map((r) => r.questionId)) };
}

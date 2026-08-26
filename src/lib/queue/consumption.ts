/**
 * 同日内リビルドの消費シグナル導出(specs/04 §同日内リビルドの消費シグナル導出、B-T-queue-1)。
 * DB 行 → buildDailyQueue の spentTodaySec / introducedTodayCount への純関数変換。
 *
 * - spentTodaySec: 当日 drill/practice attempt の全件に Σ EST_SEC(回答回数ぶん加算、distinct にしない)。
 *   バンクに無い question(retired 済み等)は 0 扱い
 * - introducedTodayCount: 「applied_rating IS NOT NULL の最初の attempt が当日」の distinct question 数
 *   (= 当日の applied_rating 非 null attempt を持ち、かつ当日より前に導入されていない question)
 */

export type ConsumptionInput = {
  /** 当日(00:00 JST 以降)の drill / practice attempt(mock 除外) */
  todayRows: readonly { questionId: string; appliedRating: number | null }[];
  /** 当日より前に applied_rating 非 null の attempt を持つ question_id 集合 */
  introducedBefore: ReadonlySet<string>;
  /** question_id → EST_SEC。バンクに無ければ null */
  estOf: (questionId: string) => number | null;
};

export type Consumption = { spentTodaySec: number; introducedTodayCount: number };

export function deriveConsumption(input: ConsumptionInput): Consumption {
  let spentTodaySec = 0;
  const introducedToday = new Set<string>();
  for (const row of input.todayRows) {
    spentTodaySec += input.estOf(row.questionId) ?? 0;
    if (row.appliedRating !== null && !input.introducedBefore.has(row.questionId)) {
      introducedToday.add(row.questionId);
    }
  }
  return { spentTodaySec, introducedTodayCount: introducedToday.size };
}

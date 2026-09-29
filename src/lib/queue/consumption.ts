import type { Exam } from "@/lib/bank/schema";
import { examOfQuestionId } from "@/lib/exam/dates";

/**
 * 同日内リビルドの消費シグナル導出(specs/04 §同日内リビルドの消費シグナル導出、B-T-queue-1)。
 * DB 行 → buildDailyQueue の spentTodaySec / introducedToday への純関数変換。
 *
 * - spentTodaySec: 当日 drill/practice attempt の全件に Σ EST_SEC(回答回数ぶん加算、distinct にしない)。
 *   バンクに無い question(retired 済み等)は 0 扱い
 * - introducedTodayCount: 「applied_rating IS NOT NULL の最初の attempt が当日」の distinct question 数
 *   (= 当日の applied_rating 非 null attempt を持ち、かつ当日より前に導入されていない question)
 * - 学習スコープ(v1.3): spentTodaySec は全 exam(同日にスコープを切り替えても予算は戻らない)。
 *   新規枠は exam ごとなので introducedTodayByExam を exam 別に数える(exam は question id の接頭辞)
 */


export type ConsumptionInput = {
  /** 当日(00:00 JST 以降)の drill / practice attempt(mock 除外) */
  todayRows: readonly { questionId: string; appliedRating: number | null }[];
  /** 当日より前に applied_rating 非 null の attempt を持つ question_id 集合 */
  introducedBefore: ReadonlySet<string>;
  /** question_id → EST_SEC。バンクに無ければ null */
  estOf: (questionId: string) => number | null;
};

export type Consumption = {
  spentTodaySec: number;
  introducedTodayCount: number;
  introducedTodayByExam: Partial<Record<Exam, number>>;
};

export function deriveConsumption(input: ConsumptionInput): Consumption {
  let spentTodaySec = 0;
  const introducedToday = new Set<string>();
  for (const row of input.todayRows) {
    spentTodaySec += input.estOf(row.questionId) ?? 0;
    if (row.appliedRating !== null && !input.introducedBefore.has(row.questionId)) {
      introducedToday.add(row.questionId);
    }
  }
  const introducedTodayByExam: Partial<Record<Exam, number>> = {};
  for (const id of introducedToday) {
    const exam = examOfQuestionId(id);
    introducedTodayByExam[exam] = (introducedTodayByExam[exam] ?? 0) + 1;
  }
  return { spentTodaySec, introducedTodayCount: introducedToday.size, introducedTodayByExam };
}

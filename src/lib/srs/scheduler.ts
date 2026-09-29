import {
  fsrs,
  generatorParameters,
  type Card,
  type FSRS,
  type Grade,
  type RecordLogItem,
} from "ts-fsrs";
import { daysBetweenJstDates, jstCalendarDate } from "./jst";

/**
 * ts-fsrs 5.4.1 ラッパー(specs/04)。
 * 設計書で固定するパラメータは request_retention と maximum_interval のみで、
 * それ以外はライブラリ既定値(enable_fuzz=false 含む)を使う。
 * 返却 Card の個別フィールド書換は禁止 — next の結果をそのまま返す。
 */

export const REQUEST_RETENTION = 0.9;

/**
 * 試験日は exam ごと(specs/04 §試験日対応 v1.3)。呼び出し側がカードの exam の試験日
 * (`@/lib/exam/dates` の examDateOf)を必ず渡す。既定値で特定 exam に落とさない。
 */

/** 試験日までの残日数(Asia/Tokyo 暦日。当日 0、通過後は負) */
export function daysUntilExam(now: Date, examDateJst: string): number {
  return daysBetweenJstDates(jstCalendarDate(now), examDateJst);
}

/**
 * maximum_interval = max(1, days_until_exam - 1)。これ以外の間隔上限は設けない。
 * 試験日を過ぎた exam(days < 0)は undefined = 指定しない(ts-fsrs 5.4.1 の既定値。上限なし)
 */
export function maximumIntervalFor(now: Date, examDateJst: string): number | undefined {
  const days = daysUntilExam(now, examDateJst);
  if (days < 0) return undefined;
  return Math.max(1, days - 1);
}

/** 残日数は日々変わるため、scheduler はリクエスト時刻ごとに生成する */
export function createScheduler(now: Date, examDateJst: string): FSRS {
  const maximumInterval = maximumIntervalFor(now, examDateJst);
  return fsrs(
    generatorParameters(
      maximumInterval === undefined
        ? { request_retention: REQUEST_RETENTION }
        : { request_retention: REQUEST_RETENTION, maximum_interval: maximumInterval },
    ),
  );
}

/** rating を適用した次の Card と ReviewLog を返す(結果は無改変) */
export function applyRating(
  card: Card,
  grade: Grade,
  now: Date,
  examDateJst: string,
): RecordLogItem {
  return createScheduler(now, examDateJst).next(card, now, grade);
}

/** retrievability は number で受ける(specs/04: get_retrievability(card, now, false)) */
export function getRetrievability(
  card: Card,
  now: Date,
  examDateJst: string,
): number {
  return createScheduler(now, examDateJst).get_retrievability(card, now, false);
}

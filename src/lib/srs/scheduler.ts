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

/** CCAR-F 試験日(JST 暦日)。CCAR-P は F 合格後に確定するため examDateJst 引数で渡す */
export const CCAR_F_EXAM_DATE_JST = "2026-09-27";

export const REQUEST_RETENTION = 0.9;

/** 試験日までの残日数(Asia/Tokyo 暦日。当日 0、通過後は負) */
export function daysUntilExam(now: Date, examDateJst: string = CCAR_F_EXAM_DATE_JST): number {
  return daysBetweenJstDates(jstCalendarDate(now), examDateJst);
}

/** maximum_interval = max(1, days_until_exam - 1)。これ以外の間隔上限は設けない */
export function maximumIntervalFor(now: Date, examDateJst: string = CCAR_F_EXAM_DATE_JST): number {
  return Math.max(1, daysUntilExam(now, examDateJst) - 1);
}

/** 残日数は日々変わるため、scheduler はリクエスト時刻ごとに生成する */
export function createScheduler(now: Date, examDateJst: string = CCAR_F_EXAM_DATE_JST): FSRS {
  return fsrs(
    generatorParameters({
      request_retention: REQUEST_RETENTION,
      maximum_interval: maximumIntervalFor(now, examDateJst),
    }),
  );
}

/** rating を適用した次の Card と ReviewLog を返す(結果は無改変) */
export function applyRating(
  card: Card,
  grade: Grade,
  now: Date,
  examDateJst: string = CCAR_F_EXAM_DATE_JST,
): RecordLogItem {
  return createScheduler(now, examDateJst).next(card, now, grade);
}

/** retrievability は number で受ける(specs/04: get_retrievability(card, now, false)) */
export function getRetrievability(
  card: Card,
  now: Date,
  examDateJst: string = CCAR_F_EXAM_DATE_JST,
): number {
  return createScheduler(now, examDateJst).get_retrievability(card, now, false);
}

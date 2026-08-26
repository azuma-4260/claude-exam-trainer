/**
 * Asia/Tokyo の暦日ロジック(規約: 全日付ロジックは JST、日次リセット 00:00 JST)。
 * JST は UTC+9 固定(DST なし)なので、オフセット加算で暦日を求める。
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const JST_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 時刻を JST の暦日(YYYY-MM-DD)に変換する */
export function jstCalendarDate(at: Date): string {
  return new Date(at.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** at が属する JST 暦日の 00:00 JST を指す時刻(= UTC では前日 15:00)。日次リセット境界 */
export function jstStartOfDay(at: Date): Date {
  return new Date(Date.parse(jstCalendarDate(at)) - JST_OFFSET_MS);
}

/** JST 暦日 2 つの差(to - from、日数)。形式不正は fail closed */
export function daysBetweenJstDates(from: string, to: string): number {
  for (const d of [from, to]) {
    if (!JST_DATE_RE.test(d)) throw new Error(`JST 暦日は YYYY-MM-DD 形式で渡す: ${d}`);
  }
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

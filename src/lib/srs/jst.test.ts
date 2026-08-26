import { describe, expect, it } from "vitest";
import { jstCalendarDate, jstStartOfDay } from "./jst";

// 日次リセット境界(00:00 JST = 前日 15:00 UTC)の判定が正しいことを固定時刻で検証する
describe("jstStartOfDay", () => {
  it("JST 23:59(UTC 14:59)はその日の 00:00 JST に丸まる", () => {
    const at = new Date("2026-08-27T14:59:00Z"); // JST 2026-08-27 23:59
    expect(jstCalendarDate(at)).toBe("2026-08-27");
    expect(jstStartOfDay(at).toISOString()).toBe("2026-08-26T15:00:00.000Z"); // 8/27 00:00 JST
  });

  it("JST 翌日 00:00(UTC 15:00)は翌日の境界に切り替わる", () => {
    const at = new Date("2026-08-27T15:00:00Z"); // JST 2026-08-28 00:00
    expect(jstCalendarDate(at)).toBe("2026-08-28");
    expect(jstStartOfDay(at).toISOString()).toBe("2026-08-27T15:00:00.000Z"); // 8/28 00:00 JST
  });

  it("境界そのものは自分の日に属する(at >= 戻り値 が常に成立)", () => {
    const at = new Date("2026-08-27T15:00:00Z");
    expect(jstStartOfDay(at).getTime()).toBeLessThanOrEqual(at.getTime());
  });
});

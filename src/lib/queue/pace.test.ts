import { describe, expect, it } from "vitest";
import { BUFFER_DAYS, DAILY_NEW_CAP, computeNewPace } from "./pace";

// T-queue: 新規カード導入ペース(specs/04 §新規カード導入ペース)

describe("computeNewPace", () => {
  it("remaining_new=0 なら 0 / 0 / warning なし", () => {
    expect(computeNewPace(0, 30)).toEqual({ remainingNew: 0, requiredNew: 0, newPerDay: 0, paceWarning: false });
  });

  it("days_left <= buffer_days(7)なら新規導入 0(直前期は逆算式により自動 0)", () => {
    for (const daysLeft of [7, 3, 1, 0, -1]) {
      expect(computeNewPace(100, daysLeft)).toEqual({ remainingNew: 100, requiredNew: 0, newPerDay: 0, paceWarning: false });
    }
  });

  it("required_new = ceil(remaining_new / (days_left - buffer_days))", () => {
    // 100 問 / (34 - 7) = 3.70… → 4
    expect(computeNewPace(100, 34)).toEqual({ remainingNew: 100, requiredNew: 4, newPerDay: 4, paceWarning: false });
    // 割り切れる場合はそのまま: 54 / 27 = 2
    expect(computeNewPace(54, 34)).toEqual({ remainingNew: 54, requiredNew: 2, newPerDay: 2, paceWarning: false });
    // days_left = 8(境界): 分母 1
    expect(computeNewPace(5, 8)).toEqual({ remainingNew: 5, requiredNew: 5, newPerDay: 5, paceWarning: false });
  });

  it("new_per_day は DAILY_NEW_CAP(40)で頭打ち、超過時のみ pace_warning", () => {
    // 1080 / 27 = 40 ちょうど → warning なし
    expect(computeNewPace(1080, 34)).toEqual({ remainingNew: 1080, requiredNew: 40, newPerDay: 40, paceWarning: false });
    // 1081 / 27 = 40.03… → 41 > 40 → cap + warning
    expect(computeNewPace(1081, 34)).toEqual({ remainingNew: 1081, requiredNew: 41, newPerDay: 40, paceWarning: true });
  });

  it("定数は specs/04 の値", () => {
    expect(BUFFER_DAYS).toBe(7);
    expect(DAILY_NEW_CAP).toBe(40);
  });
});

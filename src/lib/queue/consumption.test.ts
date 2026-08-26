import { describe, expect, it } from "vitest";
import { deriveConsumption } from "./consumption";

const EST: Record<string, number> = { "f-d1-q001": 20, "f-d1-q002": 60, "f-d1-q003": 120 };
const estOf = (id: string) => EST[id] ?? null;

describe("deriveConsumption(specs/04 §消費シグナル導出)", () => {
  it("spentTodaySec は回答回数ぶん加算する(同一問題の再回答も 1 回ずつ)", () => {
    const { spentTodaySec } = deriveConsumption({
      todayRows: [
        { questionId: "f-d1-q001", appliedRating: 1 },
        { questionId: "f-d1-q001", appliedRating: 3 }, // learning steps による同日再回答
        { questionId: "f-d1-q002", appliedRating: 3 },
      ],
      introducedBefore: new Set(),
      estOf,
    });
    expect(spentTodaySec).toBe(20 + 20 + 60);
  });

  it("バンクに無い question は 0 秒扱いで skip する", () => {
    const { spentTodaySec } = deriveConsumption({
      todayRows: [
        { questionId: "f-d9-retired", appliedRating: 3 },
        { questionId: "f-d1-q003", appliedRating: 3 },
      ],
      introducedBefore: new Set(),
      estOf,
    });
    expect(spentTodaySec).toBe(120);
  });

  it("introducedTodayCount は当日初導入の distinct question 数(同日 2 回目は数えない)", () => {
    const { introducedTodayCount } = deriveConsumption({
      todayRows: [
        { questionId: "f-d1-q001", appliedRating: 1 },
        { questionId: "f-d1-q001", appliedRating: 3 }, // 同日 2 回目 → distinct で 1
        { questionId: "f-d1-q002", appliedRating: 3 },
      ],
      introducedBefore: new Set(),
      estOf,
    });
    expect(introducedTodayCount).toBe(2);
  });

  it("当日より前に導入済み(introducedBefore)の question は導入数に数えない", () => {
    const { introducedTodayCount } = deriveConsumption({
      todayRows: [
        { questionId: "f-d1-q001", appliedRating: 3 }, // 過去導入済みカードの当日復習
        { questionId: "f-d1-q002", appliedRating: 3 },
      ],
      introducedBefore: new Set(["f-d1-q001"]),
      estOf,
    });
    expect(introducedTodayCount).toBe(1);
  });

  it("applied_rating が null の attempt(srs_eligible=false の practice)は導入に数えない", () => {
    const { introducedTodayCount, spentTodaySec } = deriveConsumption({
      todayRows: [{ questionId: "f-d1-q002", appliedRating: null }],
      introducedBefore: new Set(),
      estOf,
    });
    expect(introducedTodayCount).toBe(0);
    expect(spentTodaySec).toBe(60); // 時間は消費している
  });

  it("空入力は 0 / 0", () => {
    expect(deriveConsumption({ todayRows: [], introducedBefore: new Set(), estOf })).toEqual({
      spentTodaySec: 0,
      introducedTodayCount: 0,
    });
  });
});

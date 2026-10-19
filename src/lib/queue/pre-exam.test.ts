import { describe, expect, it } from "vitest";
import { preExamPhase } from "./pre-exam";

// D5-1: 直前期の局面(単独スコープのみ・その exam の試験日基準)。P 試験日 2026-12-12 / F 2026-09-27
const at = (d: string) => new Date(`${d}T12:00:00+09:00`);

describe("preExamPhase", () => {
  it("P: 8 日前 null / 7 日前〜2 日前 freeze / 前日 d_minus_1 / 当日・通過後 null", () => {
    expect(preExamPhase(at("2026-12-04"), "ccar-p")).toBeNull();
    expect(preExamPhase(at("2026-12-05"), "ccar-p")).toEqual({ exam: "ccar-p", daysLeft: 7, phase: "freeze" });
    expect(preExamPhase(at("2026-12-10"), "ccar-p")).toEqual({ exam: "ccar-p", daysLeft: 2, phase: "freeze" });
    expect(preExamPhase(at("2026-12-11"), "ccar-p")).toEqual({ exam: "ccar-p", daysLeft: 1, phase: "d_minus_1" });
    expect(preExamPhase(at("2026-12-12"), "ccar-p")).toBeNull();
    expect(preExamPhase(at("2026-12-13"), "ccar-p")).toBeNull();
  });

  it("スコープ both では P 前日でも null。F の前日(9/26)に P スコープは反応しない", () => {
    expect(preExamPhase(at("2026-12-11"), "both")).toBeNull();
    expect(preExamPhase(at("2026-09-26"), "ccar-p")).toBeNull();
    expect(preExamPhase(at("2026-09-26"), "ccar-f")).toEqual({ exam: "ccar-f", daysLeft: 1, phase: "d_minus_1" });
  });

  it("JST 暦日で判定する(前日 23:59 JST は d_minus_1、翌 00:00 JST は当日)", () => {
    expect(preExamPhase(new Date("2026-12-11T23:59:59+09:00"), "ccar-p")?.phase).toBe("d_minus_1");
    expect(preExamPhase(new Date("2026-12-12T00:00:00+09:00"), "ccar-p")).toBeNull();
  });
});

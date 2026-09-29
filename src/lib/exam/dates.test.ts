import { describe, expect, it } from "vitest";
import { EXAM_DATE_JST, examDateOf, examOfQuestionId } from "./dates";

// T-exam: 試験日は exam ごとのコード定数(specs/04 §試験日対応、01 FR-10)

describe("exam 別試験日", () => {
  it("CCAR-F = 2026-09-27 / CCAR-P = 2026-12-12", () => {
    expect(EXAM_DATE_JST).toEqual({ "ccar-f": "2026-09-27", "ccar-p": "2026-12-12" });
    expect(examDateOf("ccar-p")).toBe("2026-12-12");
  });

  it("未設定の exam の試験日は取得できない(fail closed)", () => {
    expect(() => examDateOf("ccar-p", { "ccar-f": "2026-09-27", "ccar-p": null })).toThrow(/ccar-p/);
  });
});

describe("question id の exam 接頭辞", () => {
  it("f- は ccar-f、p- は ccar-p、それ以外は拒否", () => {
    expect(examOfQuestionId("f-d1-q001")).toBe("ccar-f");
    expect(examOfQuestionId("p-d3-q010")).toBe("ccar-p");
    expect(() => examOfQuestionId("x-d1-q001")).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { flagRequestSchema } from "./schema";

// D1-6: 悪問フラグ入力の検証(specs/03 §question_flag、01 FR-9)

const valid = { question_id: "f-d2-q014", question_rev: 2, reason: "ambiguous", memo: "選択肢 B と C が両方正しく読める" } as const;

describe("flagRequestSchema", () => {
  it("正常入力を受理する", () => {
    expect(flagRequestSchema.parse(valid)).toEqual(valid);
  });

  it("memo は任意(省略・null とも受理)", () => {
    const { memo: _m, ...noMemo } = valid;
    void _m;
    expect(flagRequestSchema.safeParse(noMemo).success).toBe(true);
    expect(flagRequestSchema.safeParse({ ...valid, memo: null }).success).toBe(true);
  });

  it("reason は ambiguous | wrong | outdated のみ", () => {
    expect(flagRequestSchema.safeParse({ ...valid, reason: "typo" }).success).toBe(false);
    for (const r of ["ambiguous", "wrong", "outdated"]) {
      expect(flagRequestSchema.safeParse({ ...valid, reason: r }).success).toBe(true);
    }
  });

  it("question_rev は 1 以上の整数", () => {
    expect(flagRequestSchema.safeParse({ ...valid, question_rev: 0 }).success).toBe(false);
    expect(flagRequestSchema.safeParse({ ...valid, question_rev: 1.5 }).success).toBe(false);
    expect(flagRequestSchema.safeParse({ ...valid, question_rev: "1" }).success).toBe(false);
  });

  it("question_id の形式とスキーマ外キーを拒否する", () => {
    expect(flagRequestSchema.safeParse({ ...valid, question_id: "q14" }).success).toBe(false);
    expect(flagRequestSchema.safeParse({ ...valid, resolved_at: null }).success).toBe(false);
  });
});

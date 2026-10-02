import { describe, expect, it } from "vitest";
import { flash, mcq, structuredPmcq } from "@/lib/queue/test-fixtures";
import { isRationaleOpen, LIFECYCLE_PHASE_LABEL, structuredOf, toChoiceView } from "./structured";

// specs/03 §1 構造化解説フィールド / 05 §解説の表示(D6-9)

describe("structuredOf", () => {
  it("フィールドがある問題は値を返す", () => {
    expect(structuredOf(structuredPmcq())).toEqual({ bindingConstraintJa: "支払いは取り消せない", lifecyclePhase: "deployment" });
  });

  it("フィールドが無い問題(F・既存 P)と flash は null", () => {
    expect(structuredOf(mcq("f-d1-q001"))).toEqual({ bindingConstraintJa: null, lifecyclePhase: null });
    expect(structuredOf(mcq("p-d1-q002", { exam: "ccar-p" }))).toEqual({ bindingConstraintJa: null, lifecyclePhase: null });
    expect(structuredOf(flash("f-d1-q003"))).toEqual({ bindingConstraintJa: null, lifecyclePhase: null });
  });

  it("lifecycle_phase だけの問題はフェーズだけ返す", () => {
    expect(structuredOf(mcq("f-d1-q004", { lifecycle_phase: "discovery" }))).toEqual({
      bindingConstraintJa: null,
      lifecyclePhase: "discovery",
    });
  });
});

describe("toChoiceView", () => {
  it("label / textEn と、正解でない選択肢の plausibleJa / notBestJa を明示的に詰める", () => {
    const q = structuredPmcq();
    if (q.type === "flash") throw new Error("mcq のはず");
    expect(q.choices.map(toChoiceView)).toEqual([
      { label: "A", textEn: "a", plausibleJa: "事後監査が目的なら妥当", notBestJa: "支払い後では手遅れ" },
      { label: "B", textEn: "b", plausibleJa: null, notBestJa: null },
      { label: "C", textEn: "c", plausibleJa: "C の条件", notBestJa: "C の理由" },
      { label: "D", textEn: "d", plausibleJa: "D の条件", notBestJa: "D の理由" },
    ]);
  });
});

describe("isRationaleOpen(05 §解説の表示: 選んだ誤答は最初から開く)", () => {
  it("選んだ誤答は開き、選ばなかった誤答と正解は閉じる", () => {
    expect(isRationaleOpen("A", ["B"], ["A"])).toBe(true);
    expect(isRationaleOpen("C", ["B"], ["A"])).toBe(false);
    expect(isRationaleOpen("B", ["B"], ["B"])).toBe(false);
  });

  it("multi: 選んだうち正解でないものだけ開く", () => {
    expect(isRationaleOpen("A", ["A", "C"], ["A", "D"])).toBe(false);
    expect(isRationaleOpen("D", ["A", "C"], ["A", "D"])).toBe(true);
  });

  it("未回答(chosen 空)はすべて閉じる", () => {
    expect(isRationaleOpen("A", ["B"], [])).toBe(false);
  });
});

describe("LIFECYCLE_PHASE_LABEL", () => {
  it("5 フェーズすべての表示名を持つ", () => {
    expect(LIFECYCLE_PHASE_LABEL).toEqual({
      discovery: "Discovery",
      design: "Design",
      deployment: "Deployment",
      monitoring: "Monitoring",
      iteration: "Iteration",
    });
  });
});

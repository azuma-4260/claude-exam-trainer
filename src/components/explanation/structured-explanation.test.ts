import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BindingConstraintBox, ChoiceRationale } from "./structured-explanation";

// D6-9: 05 §解説の表示の部品。DOM テスト環境が無いので SSR の出力で検証する(hooks を使わない部品)

const box = (bindingConstraintJa: string | null, lifecyclePhase: "discovery" | null) =>
  renderToStaticMarkup(createElement(BindingConstraintBox, { bindingConstraintJa, lifecyclePhase }));
const rationale = (plausibleJa: string | null, notBestJa: string | null, defaultOpen: boolean) =>
  renderToStaticMarkup(createElement(ChoiceRationale, { plausibleJa, notBestJa, defaultOpen }));

describe("BindingConstraintBox", () => {
  it("フィールドが無い問題は何も描かない(従来の表示を変えない)", () => {
    expect(box(null, null)).toBe("");
  });

  it("拘束条件の枠とフェーズのタグを描く", () => {
    const html = box("支払いは取り消せない", "discovery");
    expect(html).toContain("拘束条件");
    expect(html).toContain("支払いは取り消せない");
    expect(html).toContain("フェーズ: Discovery");
  });

  it("lifecycle_phase だけの問題はタグだけ描く", () => {
    const html = box(null, "discovery");
    expect(html).toContain("フェーズ: Discovery");
    expect(html).not.toContain("拘束条件");
  });
});

describe("ChoiceRationale", () => {
  it("値の無い選択肢(正解・フィールド無し)は何も描かない", () => {
    expect(rationale(null, null, false)).toBe("");
  });

  it("選んだ誤答は open で描き、ほかは閉じて描く", () => {
    const open = rationale("監査目的なら妥当", "手遅れ", true);
    expect(open).toMatch(/<details open=""/);
    expect(open).toContain("こういう条件なら正解");
    expect(open).toContain("監査目的なら妥当");
    expect(open).toContain("ここで BEST でない理由");
    expect(open).toContain("手遅れ");
    expect(rationale("監査目的なら妥当", "手遅れ", false)).not.toMatch(/<details open/);
  });
});

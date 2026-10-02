import type { Choice, LifecyclePhase, Question } from "@/lib/bank/schema";

/**
 * 構造化解説フィールド(specs/03 §1、v1.3.3・S-4)の DTO 射影と表示判定(specs/05 §解説の表示。D6-9)。
 * - Drill / Practice / 総ざらい / 模試レポートの DTO はここを通して明示 pick する(バンクの Choice を丸ごと渡さない)
 * - Mock の試験中 DTO(src/lib/mock/dto.ts)はここを使わない: フィールドの有無で正解が分かるため提出まで渡さない
 */

export type StructuredFields = {
  /** 決め手になる制約。null なら従来の解説表示(explanation_ja + refs のみ) */
  bindingConstraintJa: string | null;
  /** フェーズのタグ。binding_constraint_ja とは独立に設定できる */
  lifecyclePhase: LifecyclePhase | null;
};

/** クライアントへ渡す選択肢。plausibleJa / notBestJa は正解でない選択肢にだけ値がある */
export type ChoiceView = {
  label: string;
  textEn: string;
  plausibleJa: string | null;
  notBestJa: string | null;
};

export function structuredOf(q: Question): StructuredFields {
  if (q.type === "flash") return { bindingConstraintJa: null, lifecyclePhase: null };
  return { bindingConstraintJa: q.binding_constraint_ja ?? null, lifecyclePhase: q.lifecycle_phase ?? null };
}

export function toChoiceView(c: Choice): ChoiceView {
  return { label: c.label, textEn: c.text_en, plausibleJa: c.plausible_ja ?? null, notBestJa: c.not_best_ja ?? null };
}

/** 05 §解説の表示: 利用者が選んだ誤答の選択肢は最初から開き、ほかの誤答は折りたたむ */
export function isRationaleOpen(label: string, answer: readonly string[], chosen: readonly string[]): boolean {
  return chosen.includes(label) && !answer.includes(label);
}

export const LIFECYCLE_PHASE_LABEL: Readonly<Record<LifecyclePhase, string>> = {
  discovery: "Discovery",
  design: "Design",
  deployment: "Deployment",
  monitoring: "Monitoring",
  iteration: "Iteration",
};

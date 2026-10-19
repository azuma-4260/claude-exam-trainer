import type { Question } from "@/lib/bank/schema";

/**
 * MCQ の採点・chosen 規則の単一ソース(specs/03 §1 mcq_bundle)。
 * - mcq_single / mcq_multi: 集合一致・部分点なし(順序・重複は見ない)
 * - mcq_bundle: 小問順の位置比較。全小問が一致したときだけ正解(chosen[i] = i 番目の小問に選んだラベル、重複可、未回答の小問は "")
 * Mock 提出 SQL(src/lib/mock/store.ts)はこの意味論と一致しなければならない(`ordered` フラグ)
 */

export type ChoiceQuestion = Exclude<Question, { type: "flash" }>;

export const isOrderedAnswer = (q: Pick<Question, "type">): boolean => q.type === "mcq_bundle";

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((v) => sb.has(v));
}

function samePositions(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** chosen が正答と一致するか(形式別の比較規則) */
export function matchesAnswer(ordered: boolean, chosen: readonly string[], answer: readonly string[]): boolean {
  return ordered ? samePositions(chosen, answer) : sameSet(chosen, answer);
}

/** 全小問が未回答("")か。空配列も未回答 */
export function isAllBlank(chosen: readonly string[]): boolean {
  return chosen.every((c) => c === "");
}

/**
 * Mock の保存時正規化: mcq_bundle で全小問が空なら null(未回答)にする。
 * 他の形式・一部回答はそのまま(chosen の空文字は mcq_bundle の未回答小問だけが持つ)
 */
export function normalizeMockChosen(q: Pick<Question, "type">, chosen: readonly string[] | null | undefined): string[] | null | undefined {
  if (chosen === undefined || chosen === null) return chosen;
  if (q.type === "mcq_bundle" && isAllBlank(chosen)) return null;
  return [...chosen];
}

/** 小問ごとの正誤(解説表示用。chosen と answer の位置比較から導出する。attempt には保存しない) */
export function subQuestionResults(chosen: readonly string[] | null, answer: readonly string[]): boolean[] {
  return answer.map((a, i) => chosen !== null && chosen[i] === a);
}

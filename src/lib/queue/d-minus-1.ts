import type { Bank } from "@/lib/bank/load";
import { evaluatePool, type PoolContext } from "@/lib/bank/pool";
import type { Question } from "@/lib/bank/schema";
import { deriveMistakeSummaries, type MistakeAttempt } from "@/lib/mistakes/derive";
import type { SrsStateUpsert } from "@/lib/srs/card-row";
import type { DMinus1Item } from "./build";
import { estSec } from "./estimate";

/**
 * D-1(単独スコープの試験日前日)のセレクタ(specs/04 §直前期と D-1、D5-1)。
 * 「間違いノート → low-stability 順」。due は見ない(返却された将来 due は試験前の選定に使わない)。
 *
 * 1. 間違いノート: deriveMistakeSummaries の既存順(誤答回数降順 → 直近 → id)
 * 2. SRS 導入済みカードを stability 昇順(同値は id 昇順)。1 と重複する問題は除く
 *
 * 当日すでに回答した問題は除く。D-1 は due が動かないため、除かないと回答後のリビルドで
 * 同じ問題が先頭に再出現し続ける。
 */
export type DMinus1Inputs = {
  /** 学習スコープで絞ったバンク */
  bank: Bank;
  poolCtx: PoolContext;
  srsRows: readonly SrsStateUpsert[];
  mistakeAttempts: readonly MistakeAttempt[];
  answeredTodayIds: ReadonlySet<string>;
};

export function selectDMinus1Items(inputs: DMinus1Inputs): DMinus1Item[] {
  const { bank, poolCtx, srsRows, mistakeAttempts, answeredTodayIds } = inputs;
  const seen = new Set<string>();
  const items: DMinus1Item[] = [];
  const push = (q: Question, mode: "drill" | "practice") => {
    seen.add(q.id);
    items.push({ questionId: q.id, estSec: estSec(q), mode });
  };

  for (const m of deriveMistakeSummaries(mistakeAttempts)) {
    const q = bank.byId.get(m.questionId);
    if (!q || seen.has(q.id) || answeredTodayIds.has(q.id)) continue;
    // 間違いノートは MCQ のみ(assembleMistakesView と同じ。flash は除外)
    if (q.type === "flash") continue;
    if (evaluatePool(q, { mode: "drill" }, poolCtx).allowed) push(q, "drill");
    else if (evaluatePool(q, { mode: "practice" }, poolCtx).allowed) push(q, "practice");
  }

  const bySrs = [...srsRows].sort((a, b) => a.stability - b.stability || a.questionId.localeCompare(b.questionId));
  for (const row of bySrs) {
    const q = bank.byId.get(row.questionId);
    if (!q || seen.has(q.id) || answeredTodayIds.has(q.id)) continue;
    if (evaluatePool(q, { mode: "drill" }, poolCtx).allowed) push(q, "drill");
    else if (evaluatePool(q, { mode: "practice", srs: true }, poolCtx).allowed) push(q, "practice");
  }
  return items;
}

/** 連続する同 mode の先頭区間(run)。D-1 の画面は先頭 run だけを提示して順序を保証する */
export function leadingRun<T extends { mode: "drill" | "practice" }>(items: readonly T[]): T[] {
  if (items.length === 0) return [];
  const mode = items[0].mode;
  const end = items.findIndex((i) => i.mode !== mode);
  return items.slice(0, end === -1 ? items.length : end);
}

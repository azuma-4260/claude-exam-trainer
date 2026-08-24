import type { Question } from "@/lib/bank/schema";

/**
 * 日次キューの固定コスト(specs/04 §日次キュー)。
 * item 数 cap は廃止済みで、この見積り秒数だけで予算管理する(実測からの自動調整は実装しない)。
 */

export const EST_SEC_FLASH = 20;
export const EST_SEC_SHORT_MCQ = 60;
export const EST_SEC_SCENARIO_MCQ = 120;

/** 45 分。残り 15 分は間違いノート・refs 確認等のバッファ */
export const DAILY_QUEUE_BUDGET_SEC = 2700;

/** 新規導入用に最大 10 分を予約 */
export const NEW_RESERVED_SEC = 600;

/**
 * 問題種別 → 見積り秒数。
 * バンクの type は flash / mcq_single / mcq_multi の 3 値で、specs/04 の short_mcq / scenario_mcq の
 * 区別は specs/07 のとおりシナリオ帰属(scenario_id)で決まる。
 */
export function estSec(q: Question): number {
  if (q.type === "flash") return EST_SEC_FLASH;
  return q.scenario_id === null ? EST_SEC_SHORT_MCQ : EST_SEC_SCENARIO_MCQ;
}

/**
 * 新規カード導入ペース(specs/04 §新規カード導入ペース(target))。
 * new_per_day は達成目標であり hard guarantee ではない(時間予算が優先)。
 * 実導入数が target 未満でも翌日 remaining_new から再計算されて自己補正する。
 */

export const BUFFER_DAYS = 7;
export const DAILY_NEW_CAP = 40;

export type NewPace = {
  remainingNew: number;
  requiredNew: number;
  newPerDay: number;
  paceWarning: boolean;
};

/**
 * remainingNew: 「status=active AND srs_eligible=true AND holdout 非該当」で srs_state 行なしの問題数
 * daysLeft: 試験日までの残日数(Asia/Tokyo 暦日)
 */
export function computeNewPace(remainingNew: number, daysLeft: number): NewPace {
  if (remainingNew === 0 || daysLeft <= BUFFER_DAYS) {
    return { remainingNew, requiredNew: 0, newPerDay: 0, paceWarning: false };
  }
  const requiredNew = Math.ceil(remainingNew / (daysLeft - BUFFER_DAYS));
  return {
    remainingNew,
    requiredNew,
    newPerDay: Math.min(requiredNew, DAILY_NEW_CAP),
    paceWarning: requiredNew > DAILY_NEW_CAP,
  };
}

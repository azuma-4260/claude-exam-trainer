/**
 * ドメイン別ミニ模試の定数(01 FR-5: 独立 MCQ プールのみ、10〜15 問 / 20〜30 分、abandon 可)。
 * 問題数はプール実測に合わせて min(MAX, プール数)、プールが MIN 未満なら開始不可。
 * 制限時間は 1 問 2 分(10 問 = 20 分、15 問 = 30 分)。
 * lifecycle(開始)と availability(開始画面の選択肢)の両方が参照するため独立ファイルに置く
 */
export const MINI_QUESTION_MIN = 10;
export const MINI_QUESTION_MAX = 15;
export const MINI_MINUTES_PER_QUESTION = 2;

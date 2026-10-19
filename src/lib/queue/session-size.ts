/**
 * FR-3: 1 セッション 5〜20 問。
 * serve.ts と mistakes/derive.ts の双方が使うため、循環 import を避けて独立ファイルに置く。
 */
export const SESSION_MIN = 5;
export const SESSION_MAX = 20;

/**
 * 悪問フラグの reason(specs/03 §question_flag、01 FR-9)。
 * クライアント(右上メニュー)からも参照するため、DB スキーマ(Drizzle / ts-fsrs を引き込む)とは
 * 分離した軽量モジュールに置く。src/db/schema.ts の CHECK 制約はここを import して同じ値を使う。
 */
export const FLAG_REASONS = ["ambiguous", "wrong", "outdated"] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];

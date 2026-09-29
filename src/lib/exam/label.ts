/**
 * exam・学習スコープの表示ラベル(05 全体構造 v1.3、D6-2)。
 * client component からも import するため依存を持たない(型のみ)。
 */
import type { Exam } from "@/lib/bank/schema";
import type { StudyScope } from "@/lib/scope/scope";

export const EXAM_LABEL: Readonly<Record<Exam, string>> = { "ccar-f": "CCAR-F", "ccar-p": "CCAR-P" };

/** both のとき問題・フォーム・ドメインに付ける短縮ラベル */
export const EXAM_SHORT: Readonly<Record<Exam, string>> = { "ccar-f": "F", "ccar-p": "P" };

export const SCOPE_LABEL: Readonly<Record<StudyScope, string>> = {
  "ccar-f": "F のみ",
  "ccar-p": "P のみ",
  both: "F+P",
};

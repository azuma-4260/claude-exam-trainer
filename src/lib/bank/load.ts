import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { mockFormsFileSchema, questionsFileSchema, type MockForm, type Question } from "./schema";

/**
 * バンク(content/<exam>/)の読込(specs/03 §1)。静的ファイルをビルド成果物と同じプロセスで読む。
 * - questions/*.json は questionsFileSchema、mock_forms.yaml は mockFormsFileSchema で検証(単一ソース)
 * - content/ が未整備(ファイル無し)でも空バンクとして動く(D1-3 の DoD: フォーム未存在でも完全形)
 * - 本格的な整合検証(topic / scenario / form 配分)は validate-bank.ts(D0-3)の責務
 */

export interface Bank {
  questions: readonly Question[];
  forms: readonly MockForm[];
  byId: ReadonlyMap<string, Question>;
}

export function bankDir(exam = "ccar-f"): string {
  return path.join(process.cwd(), "content", exam);
}

export function loadBankFrom(dir: string): Bank {
  const questions: Question[] = [];
  const qDir = path.join(dir, "questions");
  if (existsSync(qDir)) {
    for (const f of readdirSync(qDir).filter((n) => n.endsWith(".json")).sort()) {
      questions.push(...questionsFileSchema.parse(JSON.parse(readFileSync(path.join(qDir, f), "utf8"))));
    }
  }
  const formsPath = path.join(dir, "mock_forms.yaml");
  const forms: MockForm[] = existsSync(formsPath)
    ? mockFormsFileSchema.parse(parseYaml(readFileSync(formsPath, "utf8")) ?? { forms: [] }).forms
    : [];
  const byId = new Map<string, Question>();
  for (const q of questions) {
    if (byId.has(q.id)) throw new Error(`question id 重複: ${q.id}`);
    byId.set(q.id, q);
  }
  return { questions, forms, byId };
}

let cached: Bank | null = null;

/** プロセス内キャッシュ(バンクは deploy 単位で不変) */
export function loadBank(): Bank {
  cached ??= loadBankFrom(bankDir());
  return cached;
}

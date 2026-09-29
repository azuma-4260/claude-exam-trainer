import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { EXAMS, mockFormsFileSchema, questionsFileSchema, type Exam, type MockForm, type Question } from "./schema";

/**
 * バンク(content/<exam>/)の読込(specs/03 §1)。静的ファイルをビルド成果物と同じプロセスで読む。
 * - loadBank() は CCAR-F のみ(既存の利用側は exam 絞り込みと (exam, form_id) 解決が未対応のため。D6-1 / D6-4 で移行)
 * - loadBankAll() は全 exam(EXAMS)のディレクトリを合成する(D6-3)。exam の絞り込みは利用側(学習スコープ)の責務
 * - questions/*.json は questionsFileSchema、mock_forms.yaml は mockFormsFileSchema で検証(単一ソース)
 * - content/ が未整備(ファイル無し)でも空バンクとして動く(D1-3 の DoD: フォーム未存在でも完全形)
 * - 本格的な整合検証(topic / scenario / form 配分)は validate-bank.ts(D0-3)の責務
 */

export interface Bank {
  questions: readonly Question[];
  forms: readonly MockForm[];
  byId: ReadonlyMap<string, Question>;
}

/**
 * development 限定の検証支援: BANK_DIR をコンテンツルートとして <BANK_DIR>/<exam>/ を使う
 * (フィクスチャ専用バンクでの手動検証・実機 DoD 用)。production では必ず無視する。
 * 旧用法(BANK_DIR が exam ディレクトリ自体)は黙って空バンクにならないよう throw する。
 * 既定 exam=ccar-f は syllabus / scenarios を F 固定で読む既存呼び出しのため(exam 別化は D6-1 / D6-4)
 */
export function bankDir(exam: Exam = "ccar-f"): string {
  const override = process.env.BANK_DIR;
  if (override && process.env.NODE_ENV !== "production") {
    const root = path.resolve(override);
    if (existsSync(path.join(root, "syllabus.yaml")) || existsSync(path.join(root, "questions")))
      throw new Error(`BANK_DIR はコンテンツルート(<root>/<exam>/)を指すこと: ${root} は exam ディレクトリに見える`);
    return path.join(root, exam);
  }
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

/** exam ごとのディレクトリを合成する。question / form の exam はディレクトリの exam と一致しなければ throw */
export function loadBankFromDirs(dirs: Readonly<Record<Exam, string>>): Bank {
  const questions: Question[] = [];
  const forms: MockForm[] = [];
  for (const exam of EXAMS) {
    const b = loadBankFrom(dirs[exam]);
    for (const q of b.questions)
      if (q.exam !== exam) throw new Error(`${q.id}: exam=${q.exam} が content/${exam}/ と不一致`);
    for (const f of b.forms)
      if (f.exam !== exam) throw new Error(`${f.id}: exam=${f.exam} が content/${exam}/ と不一致`);
    questions.push(...b.questions);
    forms.push(...b.forms);
  }
  // id は exam 接頭辞で全体一意(schema が強制)。念のため合成後も重複を拒否する
  const byId = new Map<string, Question>();
  for (const q of questions) {
    if (byId.has(q.id)) throw new Error(`question id 重複: ${q.id}`);
    byId.set(q.id, q);
  }
  return { questions, forms, byId };
}

let cached: Bank | null = null;
let cachedAll: Bank | null = null;

/**
 * CCAR-F のバンク(プロセス内キャッシュ。バンクは deploy 単位で不変)。
 * P の問題・同名 form を既存の F 前提の出題経路に混ぜないため、全 exam 版(loadBankAll)とは分ける(B-D6-3-1)
 */
export function loadBank(): Bank {
  cached ??= loadBankFrom(bankDir("ccar-f"));
  return cached;
}

/** 全 exam の合成バンク(プロセス内キャッシュ)。exam 絞り込み・(exam, form_id) 解決ができる利用側だけが使う */
export function loadBankAll(): Bank {
  cachedAll ??= loadBankFromDirs(Object.fromEntries(EXAMS.map((e) => [e, bankDir(e)])) as Record<Exam, string>);
  return cachedAll;
}

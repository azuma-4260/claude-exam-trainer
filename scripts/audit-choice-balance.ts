// MCQ 選択肢バランス監査 `npm run audit:choices -- [--dir <path>] [--file <name.json>] [--status active]`
// 正解の選択肢だけが「明らかに長い」「独特の記法(コロン・セミコロン・カンマ・括弧)を含む」と、
// 内容ではなく形で正解が推測できてしまい学習にならない(オーナー指摘 2026-09-19)。
// validate-bank(Zod スキーマ検証)は形の偏りを見ないので、別スクリプトで fail closed にする
// (汎用 validator に足すと受理集合が変わるため audit-* と同じ方針で分離。specs/07 Step 3b 品質ルール)。
//   対象: status が --status(既定 active)の mcq_single / mcq_multi 全件(eligible_modes は問わない)。
//         --file <name.json> で questions/ 内の 1 ファイルに絞れる(書き直し作業中の部分確認用)
//   per item(error):
//     1. 長さ: 各正解の文字数 ≤ LENGTH_RATIO_MAX × 最長誤答の文字数
//     2. 記法: 正解が記法クラス(colon: `:` `;` ダッシュ / comma: `,` / paren: `(` `)`)を含むなら、
//        同じクラスを含む誤答が 1 つ以上ある
//   per item(warning):
//     3. 各正解の文字数 ≥ LENGTH_RATIO_MIN × 最短誤答の文字数(正解だけ極端に短いのも手掛かりになる)
//   aggregate(対象 ≥ AGGREGATE_MIN_ITEMS のときのみ):
//     4. error: 「最長の選択肢が正解」である問題の比率 ≤ LONGEST_SHARE_MAX(4 択 1 正解の期待値は 25%)
//     5. warning: 手掛かり語(TELL_WORDS)の出現率が正解側で誤答側の TELL_RATIO_WARN 倍超、かつ正解側 ≥ TELL_MIN_SHARE
// 違反(1・2・4)は fail closed(非 0)。warning のみなら 0。
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { questionsFileSchema, type Question } from "../src/lib/bank/schema";

/** 正解の文字数が最長誤答の何倍まで許容されるか */
export const LENGTH_RATIO_MAX = 1.25;
/** 正解の文字数が最短誤答の何倍を下回ると warning か */
export const LENGTH_RATIO_MIN = 0.75;
/** 「最長の選択肢が正解」の比率の上限(aggregate error) */
export const LONGEST_SHARE_MAX = 0.45;
/** aggregate 検査を行う最小件数(--file で数問だけ見るときは比率検査を省く) */
export const AGGREGATE_MIN_ITEMS = 20;
/** 手掛かり語 warning: 正解側出現率 / 誤答側出現率 の閾値 */
export const TELL_RATIO_WARN = 2;
/** 手掛かり語 warning: 正解側出現率の下限(希少語のノイズ除け) */
export const TELL_MIN_SHARE = 0.1;

export interface MarkerClass {
  readonly key: string;
  readonly label: string;
  readonly re: RegExp;
}
/** 正解だけに現れると手掛かりになる記法クラス */
export const MARKER_CLASSES: readonly MarkerClass[] = [
  { key: "colon", label: "コロン・セミコロン・ダッシュ", re: /[:;—–]|\s-\s/ },
  { key: "comma", label: "カンマ", re: /,/ },
  { key: "paren", label: "括弧", re: /[()]/ },
];

/** 出現率の偏りを見る手掛かり語(小文字・部分一致) */
export const TELL_WORDS: readonly string[] = [
  "instead of",
  "rather than",
  "so that",
  "not ",
  "never",
  "only",
  "before",
  "always",
  "every",
  "and ",
  "while",
  "without",
];

export interface ChoiceBalanceOptions {
  /** 監査対象の status */
  status: string;
  /** questions/ 内のファイル名(例 d1-mcq.json)。null なら全ファイル */
  file: string | null;
}

export interface ChoiceBalanceResult {
  errors: string[];
  warnings: string[];
  /** 監査した MCQ 件数 */
  total: number;
  /** 「最長の選択肢が正解」だった件数 */
  longestIsCorrect: number;
}

interface LoadedQuestions {
  questions: Question[];
  errors: string[];
}

/** questions/*.json を読み、ファイル名でのフィルタを適用する(validate-bank の loader はファイル名を返さないため独自に読む) */
export function loadQuestions(dir: string, file: string | null): LoadedQuestions {
  const errors: string[] = [];
  const questions: Question[] = [];
  const qDir = path.join(dir, "questions");
  if (!existsSync(qDir)) return { questions, errors: [`${qDir} が存在しない`] };
  const names = readdirSync(qDir)
    .filter((n) => n.endsWith(".json"))
    .sort();
  if (file !== null && !names.includes(file)) errors.push(`--file ${file} が questions/ に存在しない`);
  for (const f of names) {
    if (file !== null && f !== file) continue;
    try {
      const r = questionsFileSchema.safeParse(JSON.parse(readFileSync(path.join(qDir, f), "utf8")));
      if (r.success) questions.push(...r.data);
      else errors.push(`questions/${f}: スキーマ違反(validate-bank を先に通すこと)`);
    } catch (e) {
      errors.push(`questions/${f}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { questions, errors };
}

interface SplitChoices {
  correct: { label: string; text: string }[];
  distractors: { label: string; text: string }[];
}

function splitChoices(q: Question): SplitChoices | null {
  if (q.choices === null || q.answer === null) return null;
  const answer = new Set(q.answer);
  const all = q.choices.map((c) => ({ label: c.label, text: c.text_en.trim() }));
  return {
    correct: all.filter((c) => answer.has(c.label)),
    distractors: all.filter((c) => !answer.has(c.label)),
  };
}

/** 1 問分の per-item 検査。errors / warnings を返す(aggregate は呼び出し側) */
export function auditQuestionChoices(q: Question): { errors: string[]; warnings: string[]; longestIsCorrect: boolean } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const split = splitChoices(q);
  if (split === null || split.correct.length === 0 || split.distractors.length === 0)
    return { errors, warnings, longestIsCorrect: false };

  const dLens = split.distractors.map((c) => c.text.length);
  const maxD = Math.max(...dLens);
  const minD = Math.min(...dLens);
  for (const c of split.correct) {
    const len = c.text.length;
    if (len > LENGTH_RATIO_MAX * maxD)
      errors.push(`${q.id}: 正解 ${c.label} の文字数 ${len} が最長誤答 ${maxD} の ${LENGTH_RATIO_MAX} 倍(${Math.ceil(LENGTH_RATIO_MAX * maxD)})を超える`);
    if (len < LENGTH_RATIO_MIN * minD)
      warnings.push(`${q.id}: 正解 ${c.label} の文字数 ${len} が最短誤答 ${minD} の ${LENGTH_RATIO_MIN} 倍(${Math.floor(LENGTH_RATIO_MIN * minD)})を下回る`);
    for (const m of MARKER_CLASSES) {
      if (m.re.test(c.text) && !split.distractors.some((d) => m.re.test(d.text)))
        errors.push(`${q.id}: 正解 ${c.label} だけが${m.label}(${m.key})を含む`);
    }
  }

  const maxAll = Math.max(maxD, ...split.correct.map((c) => c.text.length));
  const longestIsCorrect = split.correct.some((c) => c.text.length === maxAll) && maxD < maxAll;
  return { errors, warnings, longestIsCorrect };
}

export function runAuditChoiceBalance(dir: string, opts: ChoiceBalanceOptions): ChoiceBalanceResult {
  const loaded = loadQuestions(dir, opts.file);
  const errors = [...loaded.errors];
  const warnings: string[] = [];
  if (loaded.errors.length > 0) return { errors, warnings, total: 0, longestIsCorrect: 0 };

  const target = loaded.questions.filter((q) => q.type !== "flash" && q.status === opts.status);
  let longestIsCorrect = 0;
  let correctN = 0;
  let distractorN = 0;
  const correctHits = new Map<string, number>();
  const distractorHits = new Map<string, number>();
  for (const q of target) {
    const r = auditQuestionChoices(q);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    if (r.longestIsCorrect) longestIsCorrect++;
    const split = splitChoices(q);
    if (split === null) continue;
    for (const c of split.correct) {
      correctN++;
      const t = c.text.toLowerCase();
      for (const w of TELL_WORDS) if (t.includes(w)) correctHits.set(w, (correctHits.get(w) ?? 0) + 1);
    }
    for (const d of split.distractors) {
      distractorN++;
      const t = d.text.toLowerCase();
      for (const w of TELL_WORDS) if (t.includes(w)) distractorHits.set(w, (distractorHits.get(w) ?? 0) + 1);
    }
  }

  if (target.length >= AGGREGATE_MIN_ITEMS) {
    const share = longestIsCorrect / target.length;
    if (share > LONGEST_SHARE_MAX)
      errors.push(`最長の選択肢が正解である問題が ${longestIsCorrect}/${target.length}(${Math.round(share * 100)}% > ${LONGEST_SHARE_MAX * 100}%)`);
    if (correctN > 0 && distractorN > 0) {
      for (const w of TELL_WORDS) {
        const cs = (correctHits.get(w) ?? 0) / correctN;
        const ds = (distractorHits.get(w) ?? 0) / distractorN;
        if (cs >= TELL_MIN_SHARE && cs > TELL_RATIO_WARN * ds)
          warnings.push(`手掛かり語 "${w.trim()}" の出現率が正解 ${Math.round(cs * 100)}% / 誤答 ${Math.round(ds * 100)}%(${TELL_RATIO_WARN} 倍超)`);
      }
    }
  }

  return { errors, warnings, total: target.length, longestIsCorrect };
}

export function parseArgs(argv: readonly string[]): { dir: string; opts: ChoiceBalanceOptions } {
  let dir = path.join(process.cwd(), "content", "ccar-f");
  let status = "active";
  let file: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dir") dir = path.resolve(argv[++i]);
    else if (argv[i] === "--status") status = argv[++i];
    else if (argv[i] === "--file") file = argv[++i];
    else throw new Error(`未知の引数: ${argv[i]}`);
  }
  return { dir, opts: { status, file } };
}

function main(): void {
  const { dir, opts } = parseArgs(process.argv.slice(2));
  const r = runAuditChoiceBalance(dir, opts);
  for (const w of r.warnings) console.error(`audit-choice-balance WARN ${w}`);
  for (const e of r.errors) console.error(`audit-choice-balance NG ${e}`);
  const scope = opts.file ? `file=${opts.file}` : "all";
  if (r.errors.length > 0) {
    console.error(`audit-choice-balance 失敗: ${r.errors.length} 件(warnings ${r.warnings.length}, MCQ ${r.total}, ${scope})`);
    process.exit(1);
  }
  console.log(
    `audit-choice-balance OK (MCQ ${r.total}, 最長=正解 ${r.longestIsCorrect}, status=${opts.status}, ${scope}, warnings ${r.warnings.length})`,
  );
}

if (process.argv[1] && /audit-choice-balance\.ts$/.test(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(`audit-choice-balance 異常終了: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(2);
  }
}

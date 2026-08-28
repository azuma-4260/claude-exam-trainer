// 固定フォーム収載 MCQ 監査 `npm run audit:form -- [--dir <path>] [--form <form-id>] [--status flagged]`
// validate-bank(specs/03 §mock_forms の spec 条件)が見ない C3b-* 固有の要件を検査する
// (B-C3a-1 の恒久化。汎用 validator に足すと受理集合が変わるため別スクリプトにする):
//   mock_forms.yaml の各 form(--form 指定時はその form のみ)の収載問題について
//   1. 固定値: exam が form と一致 / type が mcq_single | mcq_multi / srs_eligible=false /
//      eligible_modes が {mock, practice} と集合一致(specs/03 §1 フォーム収載問題の標準値。
//      srs_eligible=false は B-D0-3-2 (2) の緩和として CI 相当の検査をここで担う)
//   2. lifecycle: status が --status と一致(生成直後 flagged / Step 4 完了後 active。specs/07 Step 4)
//   3. refs が SOURCES.md「refs ソース台帳」記載 URL のみ(specs/07 原則の一次ソース主義)
//   4. warning(非ブロッキング): mcq_single の正解ラベル偏り(最頻ラベル > 35%)/
//      シナリオあたり問題数が 12〜18 の設計指針外(SOURCES.md §1.1 の非検証指針)
// 違反(1〜3)は fail closed(非 0)。warning のみなら 0。
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { mockFormsFileSchema, type MockForm, type Question } from "../src/lib/bank/schema";
import { parseLedgerUrls } from "./audit-flash";
import { loadBankForValidation } from "./validate-bank";

/** シナリオあたり問題数の設計指針(SOURCES.md §1.1。validator では検証しない) */
export const SCENARIO_SIZE_RANGE = { min: 12, max: 18 } as const;
/** mcq_single の正解ラベル最頻シェアの warning 閾値 */
export const ANSWER_SHARE_WARN = 0.35;

export interface FormAuditOptions {
  /** 監査対象の form id。null なら全 form */
  formId: string | null;
  /** 収載問題に期待する status */
  status: string;
}

export interface FormAuditResult {
  errors: string[];
  warnings: string[];
  /** 監査した収載問題数 */
  total: number;
}

export function runAuditFormMcq(dir: string, opts: FormAuditOptions): FormAuditResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const sourcesPath = path.join(dir, "SOURCES.md");
  const ledger = existsSync(sourcesPath) ? parseLedgerUrls(readFileSync(sourcesPath, "utf8")) : new Set<string>();
  if (ledger.size === 0) errors.push("SOURCES.md の refs ソース台帳が見つからない(URL 0 件)");

  // questions は validate-bank と同じ収集型ローダーで読む(スキーマ・列挙規則の単一ソース維持)
  const loaded = loadBankForValidation(dir);
  errors.push(...loaded.errors);
  const questions: readonly Question[] = loaded.input?.questions ?? [];
  const byId = new Map(questions.map((q) => [q.id, q]));

  let forms: readonly MockForm[] = loaded.input?.forms ?? [];
  if (forms.length === 0) {
    // loadBankForValidation は mock_forms.yaml 不在を空扱いにするため、監査としては明示エラーにする
    const formsPath = path.join(dir, "mock_forms.yaml");
    if (!existsSync(formsPath)) errors.push(`mock_forms.yaml が無い: ${formsPath}`);
    else {
      const r = mockFormsFileSchema.safeParse(parseYaml(readFileSync(formsPath, "utf8")) ?? { forms: [] });
      if (r.success && r.data.forms.length === 0) errors.push("mock_forms.yaml に form が 1 件も無い");
    }
  }
  if (opts.formId !== null) {
    const found = forms.filter((f) => f.id === opts.formId);
    if (found.length === 0) errors.push(`--form ${opts.formId} が mock_forms.yaml に無い`);
    forms = found;
  }

  let total = 0;
  for (const f of forms) {
    const answerCounts = new Map<string, number>();
    let singles = 0;
    const perScenario = new Map<string, number>();
    for (const qid of f.question_ids) {
      const q = byId.get(qid);
      if (!q) {
        errors.push(`${f.id}: ${qid} が questions に無い`);
        continue;
      }
      total++;

      // 1. 固定値
      if (q.exam !== f.exam) errors.push(`${q.id}: exam ${q.exam}(form は ${f.exam})`);
      if (q.type !== "mcq_single" && q.type !== "mcq_multi") errors.push(`${q.id}: type ${q.type}(フォーム収載は MCQ のみ)`);
      if (q.srs_eligible) errors.push(`${q.id}: srs_eligible が false でない`);
      const modes = new Set(q.eligible_modes);
      if (modes.size !== 2 || !modes.has("mock") || !modes.has("practice"))
        errors.push(`${q.id}: eligible_modes が ["mock", "practice"] でない(実際 [${q.eligible_modes.join(", ")}])`);

      // 2. lifecycle
      if (q.status !== opts.status) errors.push(`${q.id}: status ${q.status}(期待 ${opts.status})`);

      // 3. refs は台帳のみ
      for (const r of q.refs) if (!ledger.has(r)) errors.push(`${q.id}: refs ${r} がソース台帳に無い`);

      // 4. warning 用の集計
      if (q.scenario_id) perScenario.set(q.scenario_id, (perScenario.get(q.scenario_id) ?? 0) + 1);
      if (q.type === "mcq_single" && q.answer) {
        singles++;
        answerCounts.set(q.answer[0], (answerCounts.get(q.answer[0]) ?? 0) + 1);
      }
    }

    if (singles > 0) {
      const [label, count] = [...answerCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (count / singles > ANSWER_SHARE_WARN)
        warnings.push(`${f.id}: mcq_single の正解ラベル ${label} が ${count}/${singles}(${Math.round((count / singles) * 100)}% > ${ANSWER_SHARE_WARN * 100}%)`);
    }
    for (const [sid, n] of [...perScenario.entries()].sort()) {
      if (n < SCENARIO_SIZE_RANGE.min || n > SCENARIO_SIZE_RANGE.max)
        warnings.push(`${f.id}: ${sid} の問題数 ${n}(設計指針 ${SCENARIO_SIZE_RANGE.min}〜${SCENARIO_SIZE_RANGE.max})`);
    }
  }

  return { errors, warnings, total };
}

export function parseArgs(argv: readonly string[]): { dir: string; opts: FormAuditOptions } {
  let dir = path.join(process.cwd(), "content", "ccar-f");
  let formId: string | null = null;
  let status = "active";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dir") dir = path.resolve(argv[++i]);
    else if (argv[i] === "--form") formId = argv[++i];
    else if (argv[i] === "--status") status = argv[++i];
    else throw new Error(`未知の引数: ${argv[i]}`);
  }
  if (formId === "") throw new Error("--form が空");
  return { dir, opts: { formId, status } };
}

function main(): void {
  const { dir, opts } = parseArgs(process.argv.slice(2));
  const r = runAuditFormMcq(dir, opts);
  for (const w of r.warnings) console.error(`audit-form-mcq WARN ${w}`);
  for (const e of r.errors) console.error(`audit-form-mcq NG ${e}`);
  if (r.errors.length > 0) {
    console.error(`audit-form-mcq 失敗: ${r.errors.length} 件(warnings ${r.warnings.length})`);
    process.exit(1);
  }
  console.log(`audit-form-mcq OK (form questions ${r.total}, status=${opts.status}, warnings ${r.warnings.length})`);
}

if (process.argv[1] && /audit-form-mcq\.ts$/.test(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(`audit-form-mcq 失敗(fail closed): ${(e as Error).message}`);
    process.exit(1);
  }
}

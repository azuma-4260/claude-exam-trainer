// バンク静的検証 `npm run validate-bank [dir]`(specs/06 §バンク静的検証, specs/03 §mock_forms)。
// 違反は fail closed(非 0)。warning(重み乖離)のみなら 0。
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { ZodError } from "zod";
import {
  FORM_DOMAIN_QUOTA,
  FORM_SCENARIO_COUNT,
  MOCK_FORM_SIZE,
  mockFormsFileSchema,
  questionsFileSchema,
  type MockForm,
  type Question,
  type Scenario,
  type Syllabus,
} from "../src/lib/bank/schema";
import { loadScenarios, loadSyllabus, topicDomainMap } from "../src/lib/bank/syllabus";

export interface BankInput {
  syllabus: Syllabus;
  questions: readonly Question[];
  forms: readonly MockForm[];
  /** scenarios.yaml 未整備なら null */
  scenarios: readonly Scenario[] | null;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

/** ドメイン別問題数の重み乖離をこの比率(±)を超えたら warning(specs/06) */
export const WEIGHT_DEVIATION = 0.3;

function formatZodError(e: ZodError): string {
  return e.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}

export interface LoadedBank {
  input: BankInput | null;
  errors: string[];
}

/**
 * 収集型ローダー。src/lib/bank/load.ts と同じ列挙規則・同じ schema だが、最初の違反で
 * throw せず、ファイルごとのエラーを全件集める(CI で一度に直せるように)。
 * syllabus.yaml は常に必須。questions/ と mock_forms.yaml は未整備なら空を許容。
 */
export function loadBankForValidation(dir: string): LoadedBank {
  const errors: string[] = [];
  let syllabus: Syllabus | null = null;
  try {
    syllabus = loadSyllabus(dir);
  } catch (e) {
    errors.push(`syllabus.yaml: ${describe(e)}`);
  }

  const questions: Question[] = [];
  const qDir = path.join(dir, "questions");
  if (existsSync(qDir)) {
    for (const f of readdirSync(qDir).filter((n) => n.endsWith(".json")).sort()) {
      const rel = `questions/${f}`;
      try {
        const r = questionsFileSchema.safeParse(JSON.parse(readFileSync(path.join(qDir, f), "utf8")));
        if (r.success) questions.push(...r.data);
        else errors.push(`${rel}: ${formatZodError(r.error)}`);
      } catch (e) {
        errors.push(`${rel}: ${describe(e)}`);
      }
    }
  }

  let forms: MockForm[] = [];
  const formsPath = path.join(dir, "mock_forms.yaml");
  if (existsSync(formsPath)) {
    try {
      const r = mockFormsFileSchema.safeParse(parseYaml(readFileSync(formsPath, "utf8")) ?? { forms: [] });
      if (r.success) forms = r.data.forms;
      else errors.push(`mock_forms.yaml: ${formatZodError(r.error)}`);
    } catch (e) {
      errors.push(`mock_forms.yaml: ${describe(e)}`);
    }
  }

  let scenarios: Scenario[] | null = null;
  try {
    scenarios = loadScenarios(dir);
  } catch (e) {
    errors.push(`scenarios.yaml: ${describe(e)}`);
  }

  if (!syllabus) return { input: null, errors };
  return { input: { syllabus, questions, forms, scenarios }, errors };
}

function describe(e: unknown): string {
  if (e && typeof e === "object" && "issues" in e) return formatZodError(e as ZodError);
  return (e as Error).message ?? String(e);
}

/** ファイル横断の整合検証(純粋関数)。I/O を含まないので Vitest から直接叩ける */
export function validateBank(b: BankInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { syllabus, questions, forms, scenarios } = b;

  // --- id 重複(ファイル横断)---
  const byId = new Map<string, Question>();
  for (const q of questions) {
    if (byId.has(q.id)) errors.push(`question id 重複(ファイル横断): ${q.id}`);
    byId.set(q.id, q);
  }

  // --- exam / syllabus 整合 ---
  const domainIds = new Set(syllabus.domains.map((d) => d.id));
  const topicDomain = topicDomainMap(syllabus);
  for (const q of questions) {
    if (q.exam !== syllabus.exam) errors.push(`${q.id}: exam=${q.exam} が syllabus(${syllabus.exam})と不一致`);
    if (!domainIds.has(q.domain_id)) errors.push(`${q.id}: domain_id ${q.domain_id} が syllabus に無い`);
    for (const [field, tid] of [
      ["primary_topic_id", q.primary_topic_id] as const,
      ...q.secondary_topic_ids.map((t) => ["secondary_topic_ids", t] as const),
    ]) {
      const d = topicDomain.get(tid);
      if (!d) errors.push(`${q.id}: ${field} ${tid} が syllabus に無い`);
      else if (d !== q.domain_id) errors.push(`${q.id}: ${field} ${tid} は ${d} の topic(domain_id=${q.domain_id})`);
    }
    // refs >= 1 は schema で強制済み。念のため再確認(schema を迂回した入力の防御)
    if (q.refs.length < 1) errors.push(`${q.id}: refs が空`);
  }

  // --- scenarios.yaml の必須性と参照先 ---
  const usedScenarioIds = new Set<string>();
  for (const q of questions) if (q.scenario_id) usedScenarioIds.add(q.scenario_id);
  for (const f of forms) for (const s of f.scenario_ids) usedScenarioIds.add(s);
  if (usedScenarioIds.size > 0 && scenarios === null) {
    errors.push(`scenarios.yaml が無いが scenario_id が参照されている: ${[...usedScenarioIds].sort().join(", ")}`);
  }
  if (scenarios !== null) {
    const known = new Set(scenarios.map((s) => s.id));
    for (const q of questions) {
      if (q.scenario_id && !known.has(q.scenario_id))
        errors.push(`${q.id}: scenario_id ${q.scenario_id} が scenarios.yaml に無い`);
    }
    for (const f of forms) {
      for (const s of f.scenario_ids) {
        if (!known.has(s)) errors.push(`${f.id}: scenario_ids の ${s} が scenarios.yaml に無い`);
      }
    }
  }

  // --- ドメイン別問題数の重み乖離(warning)---
  if (questions.length > 0) {
    const counts = new Map<string, number>();
    for (const q of questions) counts.set(q.domain_id, (counts.get(q.domain_id) ?? 0) + 1);
    for (const d of syllabus.domains) {
      const expected = (questions.length * d.weight) / 100;
      const actual = counts.get(d.id) ?? 0;
      if (expected === 0) continue;
      const dev = (actual - expected) / expected;
      if (Math.abs(dev) > WEIGHT_DEVIATION) {
        warnings.push(
          `${d.id}: 問題数 ${actual} が weight ${d.weight}% 相当(${expected.toFixed(1)})から ${(dev * 100).toFixed(0)}% 乖離`,
        );
      }
    }
  }

  // --- 固定フォームのドメイン配分: spec 固定値(FORM_DOMAIN_QUOTA)を正とし、syllabus と form の両方を照合 ---
  const quota = FORM_DOMAIN_QUOTA[syllabus.exam];
  if (quota) {
    for (const d of syllabus.domains) {
      const expected = quota[d.id];
      if (expected === undefined) errors.push(`syllabus: ${d.id} は ${syllabus.exam} の固定配分に無い domain`);
      else if (d.form_questions !== expected)
        errors.push(`syllabus: ${d.id} の form_questions=${d.form_questions} が固定配分(${expected})と不一致`);
    }
    for (const id of Object.keys(quota)) {
      if (!domainIds.has(id)) errors.push(`syllabus: 固定配分の domain ${id} が無い`);
    }
  } else if (forms.length > 0) {
    errors.push(`exam=${syllabus.exam} の固定フォーム配分が未定義(FORM_DOMAIN_QUOTA)`);
  }

  // --- 固定フォーム検証(specs/03 §mock_forms)---
  const formQuestionOwner = new Map<string, string>();
  const formIds = new Set<string>();
  for (const f of forms) {
    if (formIds.has(f.id)) {
      errors.push(`form id 重複: ${f.id}`);
      continue; // 同一 ID の 2 本目は holdout(exam, formId)を壊すので以降の照合対象にしない
    }
    formIds.add(f.id);
    if (f.exam !== syllabus.exam) errors.push(`${f.id}: exam=${f.exam} が syllabus(${syllabus.exam})と不一致`);
    if (f.question_ids.length !== MOCK_FORM_SIZE)
      errors.push(`${f.id}: 問題数 ${f.question_ids.length}(${MOCK_FORM_SIZE} 問必須)`);

    if (f.scenario_ids.length !== FORM_SCENARIO_COUNT)
      errors.push(`${f.id}: シナリオ数 ${f.scenario_ids.length}(${FORM_SCENARIO_COUNT} 本必須)`);
    const formScenarios = new Set(f.scenario_ids);
    const usedInForm = new Set<string>();
    const perDomain = new Map<string, number>();
    for (const qid of f.question_ids) {
      const owner = formQuestionOwner.get(qid);
      if (owner && owner !== f.id) errors.push(`${f.id}: ${qid} は ${owner} にも収載(form 間重複)`);
      formQuestionOwner.set(qid, f.id);

      const q = byId.get(qid);
      if (!q) {
        errors.push(`${f.id}: ${qid} が questions に無い`);
        continue;
      }
      perDomain.set(q.domain_id, (perDomain.get(q.domain_id) ?? 0) + 1);
      if (!q.eligible_modes.includes("mock")) errors.push(`${f.id}: ${qid} の eligible_modes に mock が無い`);
      if (q.scenario_id === null) errors.push(`${f.id}: ${qid} の scenario_id が null(フォーム収載問題は必須)`);
      else {
        usedInForm.add(q.scenario_id);
        if (!formScenarios.has(q.scenario_id))
          errors.push(`${f.id}: ${qid} の scenario_id ${q.scenario_id} が form.scenario_ids に無い`);
      }
    }
    for (const s of f.scenario_ids) {
      if (!usedInForm.has(s)) errors.push(`${f.id}: scenario_ids の ${s} を使う問題が無い(実使用集合と不一致)`);
    }
    // 注: 各シナリオ 15 問の検証は Step 0 判定で OFF 確定(specs/03)。シナリオ内件数は検証しない
    for (const [id, expected] of Object.entries(quota ?? {})) {
      const actual = perDomain.get(id) ?? 0;
      if (actual !== expected) errors.push(`${f.id}: ${id} の配分 ${actual}(固定配分=${expected})`);
    }
  }

  return { errors, warnings };
}

export interface RunResult {
  exitCode: 0 | 1;
  stdout: string[];
  stderr: string[];
}

/** CLI 本体(process.exit しない版)。テストから exit code を検証するために export */
export function runValidateBank(dir: string): RunResult {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const loaded = loadBankForValidation(dir);
  const errors = [...loaded.errors];
  let warnings: string[] = [];
  let counts = "";
  if (loaded.input) {
    const r = validateBank(loaded.input);
    errors.push(...r.errors);
    warnings = r.warnings;
    counts = `questions ${loaded.input.questions.length} / forms ${loaded.input.forms.length}`;
  }
  for (const w of warnings) stderr.push(`validate-bank WARN ${w}`);
  for (const e of errors) stderr.push(`validate-bank NG ${e}`);
  if (errors.length > 0) {
    stderr.push(`validate-bank 失敗: ${errors.length} 件(warnings ${warnings.length})`);
    return { exitCode: 1, stdout, stderr };
  }
  stdout.push(`validate-bank OK (${counts}, warnings ${warnings.length})`);
  return { exitCode: 0, stdout, stderr };
}

function main(): void {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(process.cwd(), "content", "ccar-f");
  const r = runValidateBank(dir);
  for (const l of r.stderr) console.error(l);
  for (const l of r.stdout) console.log(l);
  if (r.exitCode !== 0) process.exit(r.exitCode);
}

if (process.argv[1] && /validate-bank\.ts$/.test(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(`validate-bank 失敗(fail closed): ${(e as Error).message}`);
    process.exit(1);
  }
}

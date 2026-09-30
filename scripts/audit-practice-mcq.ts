// Practice / ミニ模試用 MCQ 監査 `npm run audit:practice -- --counts 19,13,14,14,10 [--exam ccar-f|ccar-p] [--dir <path>] [--status active] [--batch-ids <id,...>]`
// --exam(既定 ccar-f。D6-3)で監査プロファイルを切り替える(PRACTICE_PROFILE):
//   ccar-f: 以下の C3a / C5 帯プロファイル(従来どおり)
//   ccar-p: 独立 MCQ プロファイル(specs/07 §CCAR-P: Step 3a は P に適用しない、CP3 = Step 5 相当)。
//           対象 = どの form にも収載されていない mcq_single / mcq_multi 全件。C5 と同じ固定値・配分・lifecycle・
//           正解ラベル偏り warning を検査し、C3a 条件は適用しない。
//           ID は独立 MCQ 帯 q501〜q599(BAND_P_INDEPENDENT。CP3 で確定、帯割当は content/ccar-p/SOURCES.md §13 CP3 節)で、
//           ドメインごとに q501 からの連番(retired も履歴として含む。F の C5 帯と同じ規則)。
//           --counts は syllabus のドメイン順(値の数 = ドメイン数)
// validate-bank(Zod スキーマ検証)が見ない C3a / C5 固有の要件を検査する(B-C3a-1 の恒久化。
// 汎用 validator に足すと受理集合が変わるため別スクリプトにする。specs/07 Step 3a / Step 5)。
// 帯は ID 番号で識別する(ファイル名非依存。帯割当は SOURCES.md §9 改訂履歴 2026-09-03 C5):
//   C3a 帯 q101〜q199: Practice 専用シナリオ MCQ(specs/07 Step 3a)
//   C5  帯 q501〜q599: 独立 MCQ(Practice / ドメイン別ミニ模試用。specs/07 Step 5)
// retired は履歴として ID 連番検査にだけ含め、live 件数・配分・シナリオ使用数・lifecycle からは除外する。
// live = status=active、または --batch-ids に含まれる行(audit-flash と同じ規則)。
//   共通: type が mcq_single | mcq_multi / exam=ccar-f / srs_eligible=true / refs が SOURCES.md 台帳のみ /
//         帯・domain ごとに q<帯先頭> からの連番(欠番・重複なし)
//   C3a: live 件数 15〜20 / eligible_modes=["practice"] / scenario_id 非 null /
//        distinct scenario_id = 2 かつ各シナリオ使用数 > 0 / 全 5 ドメイン各 2 問以上
//   C5 : live 件数が --counts のドメイン配分(d1..d5 順)と一致 / eligible_modes が {mock, practice} 集合一致 /
//        scenario_id=null / warning: mcq_single の正解ラベル偏り(最頻 > 35%)
//   lifecycle: --batch-ids 指定時はその集合だけ status=--status と rev=1、未指定時は live 全件 status=--status
// 違反は fail closed(非 0)。warning のみなら 0。
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Exam, Question } from "../src/lib/bank/schema";
import { parseExam, parseLedgerUrls } from "./audit-flash";
import { ANSWER_SHARE_WARN } from "./audit-form-mcq";
import { loadBankForValidation } from "./validate-bank";

export interface Band {
  readonly key: "c3a" | "c5";
  readonly min: number;
  readonly max: number;
}
export const BAND_C3A: Band = { key: "c3a", min: 101, max: 199 };
export const BAND_C5: Band = { key: "c5", min: 501, max: 599 };
/** P の独立 MCQ 帯(CP3。F の C5 帯と同じ番号域。form 非収載の P MCQ はすべてこの帯) */
export const BAND_P_INDEPENDENT = { min: 501, max: 599 } as const;
export const C3A_COUNT_RANGE = { min: 15, max: 20 } as const;
export const C3A_SCENARIO_COUNT = 2;
export const C3A_MIN_PER_DOMAIN = 2;

/** exam ごとの監査プロファイル(D6-3) */
export const PRACTICE_PROFILE: Record<Exam, "f-bands" | "independent"> = {
  "ccar-f": "f-bands",
  "ccar-p": "independent",
};

export interface PracticeAuditOptions {
  /** 期待する exam(既定 ccar-f)。プロファイルも決める。D6-3 */
  exam?: Exam;
  /** f-bands: C5 帯のドメイン番号順(d1..d5)/ independent: syllabus のドメイン順 の期待 live 件数。必須 */
  counts: readonly number[];
  /** lifecycle 対象に期待する status */
  status: string;
  /** lifecycle(status/rev)を検査する新規バッチ ID。未指定なら live 全件 */
  batchIds?: ReadonlySet<string> | null;
}

export interface PracticeAuditResult {
  errors: string[];
  warnings: string[];
  /** 監査した live 件数(C3a + C5) */
  total: number;
}

/** id の末尾番号(`f-d1-q105` → 105)。帯判定用 */
export function questionNumber(id: string): number {
  return Number(id.slice(id.lastIndexOf("q") + 1));
}

export function bandOf(id: string): Band | null {
  const n = questionNumber(id);
  if (n >= BAND_C3A.min && n <= BAND_C3A.max) return BAND_C3A;
  if (n >= BAND_C5.min && n <= BAND_C5.max) return BAND_C5;
  return null;
}

export function runAuditPracticeMcq(dir: string, opts: PracticeAuditOptions): PracticeAuditResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const sourcesPath = path.join(dir, "SOURCES.md");
  const ledger = existsSync(sourcesPath) ? parseLedgerUrls(readFileSync(sourcesPath, "utf8")) : new Set<string>();
  if (ledger.size === 0) errors.push("SOURCES.md の refs ソース台帳が見つからない(URL 0 件)");

  // questions は validate-bank と同じ収集型ローダーで読む(スキーマ・列挙規則の単一ソース維持)
  const loaded = loadBankForValidation(dir);
  errors.push(...loaded.errors);
  const questions: readonly Question[] = loaded.input?.questions ?? [];

  const lifecycleIds = opts.batchIds ?? null;
  const isLive = (q: Question): boolean =>
    lifecycleIds ? q.status === "active" || lifecycleIds.has(q.id) : q.status !== "retired";

  const exam = opts.exam ?? "ccar-f";
  if (PRACTICE_PROFILE[exam] === "independent") {
    const r = auditIndependent(loaded.input, exam, ledger, isLive, opts);
    return { errors: [...errors, ...r.errors], warnings: [...warnings, ...r.warnings], total: r.total };
  }

  // 帯 × domain に集約(retired 含む全件と live のみ)
  const allByBandDomain = new Map<string, Question[]>();
  const live: { c3a: Question[]; c5: Question[] } = { c3a: [], c5: [] };
  for (const q of questions) {
    const band = bandOf(q.id);
    if (!band) continue;
    const key = `${band.key}:${q.domain_id}`;
    const arr = allByBandDomain.get(key) ?? [];
    arr.push(q);
    allByBandDomain.set(key, arr);
    if (isLive(q)) live[band.key].push(q);
  }

  // 連番(帯・domain ごとに q<min> から。retired も履歴として含む)
  for (const [key, qs] of [...allByBandDomain.entries()].sort()) {
    const [bandKey, domainId] = key.split(":");
    const band = bandKey === "c3a" ? BAND_C3A : BAND_C5;
    const ids = qs.map((q) => q.id).sort();
    const want = qs.map((_, i) => `${domainId}-q${String(band.min + i).padStart(3, "0")}`);
    for (let i = 0; i < ids.length; i++)
      if (ids[i] !== want[i]) {
        errors.push(`${domainId} ${bandKey} 帯: question id が連番でない(実際 [${ids.join(", ")}] / 期待 q${band.min}〜q${band.min + qs.length - 1})`);
        break;
      }
  }

  const seenLifecycleIds = new Set<string>();
  const checkCommon = (q: Question, bandKey: string): void => {
    if (q.type !== "mcq_single" && q.type !== "mcq_multi") errors.push(`${q.id}: type ${q.type}(${bandKey} 帯は MCQ のみ)`);
    if (q.exam !== exam) errors.push(`${q.id}: exam ${q.exam}`);
    if (!q.srs_eligible) errors.push(`${q.id}: srs_eligible が true でない`);
    for (const r of q.refs) if (!ledger.has(r)) errors.push(`${q.id}: refs ${r} がソース台帳に無い`);
    if (lifecycleIds === null || lifecycleIds.has(q.id)) {
      seenLifecycleIds.add(q.id);
      if (q.status !== opts.status) errors.push(`${q.id}: status ${q.status}(期待 ${opts.status})`);
      // 全件監査では editorial fix による rev++ を許容する。rev=1 は新規生成バッチだけの契約。
      if (lifecycleIds !== null && q.rev !== 1) errors.push(`${q.id}: rev ${q.rev}(新規バッチは 1 を期待)`);
    }
  };

  // --- C3a 帯 ---
  const c3aDomains = new Map<string, number>();
  const c3aScenarios = new Map<string, number>();
  for (const q of live.c3a) {
    checkCommon(q, "c3a");
    if (q.eligible_modes.length !== 1 || q.eligible_modes[0] !== "practice")
      errors.push(`${q.id}: eligible_modes が ["practice"] でない(実際 [${q.eligible_modes.join(", ")}])`);
    if (q.scenario_id === null) errors.push(`${q.id}: scenario_id が null(C3a 帯はシナリオ MCQ)`);
    else c3aScenarios.set(q.scenario_id, (c3aScenarios.get(q.scenario_id) ?? 0) + 1);
    c3aDomains.set(q.domain_id, (c3aDomains.get(q.domain_id) ?? 0) + 1);
  }
  if (live.c3a.length < C3A_COUNT_RANGE.min || live.c3a.length > C3A_COUNT_RANGE.max)
    errors.push(`c3a 帯: live 件数 ${live.c3a.length}(期待 ${C3A_COUNT_RANGE.min}〜${C3A_COUNT_RANGE.max})`);
  if (c3aScenarios.size !== C3A_SCENARIO_COUNT)
    errors.push(`c3a 帯: distinct scenario_id ${c3aScenarios.size}(期待 ${C3A_SCENARIO_COUNT}: [${[...c3aScenarios.keys()].sort().join(", ")}])`);
  for (let d = 1; d <= 5; d++) {
    const n = c3aDomains.get(`f-d${d}`) ?? 0;
    if (n < C3A_MIN_PER_DOMAIN) errors.push(`c3a 帯: f-d${d} が ${n} 問(各ドメイン ${C3A_MIN_PER_DOMAIN} 問以上)`);
  }

  // --- C5 帯 ---
  const c5Domains = new Map<string, number>();
  const answerCounts = new Map<string, number>();
  let singles = 0;
  for (const q of live.c5) {
    checkCommon(q, "c5");
    const modes = new Set(q.eligible_modes);
    if (modes.size !== 2 || !modes.has("mock") || !modes.has("practice"))
      errors.push(`${q.id}: eligible_modes が ["mock", "practice"] でない(実際 [${q.eligible_modes.join(", ")}])`);
    if (q.scenario_id !== null) errors.push(`${q.id}: scenario_id が null でない(C5 帯は独立 MCQ)`);
    c5Domains.set(q.domain_id, (c5Domains.get(q.domain_id) ?? 0) + 1);
    if (q.type === "mcq_single" && q.answer) {
      singles++;
      answerCounts.set(q.answer[0], (answerCounts.get(q.answer[0]) ?? 0) + 1);
    }
  }
  const domains = new Set([...c5Domains.keys(), ...opts.counts.map((_, i) => `f-d${i + 1}`)]);
  for (const domainId of [...domains].sort()) {
    const m = /^f-d([1-9])$/.exec(domainId);
    if (!m) {
      errors.push(`domain_id ${domainId}: f-dN 形式でない`);
      continue;
    }
    const expected = opts.counts[Number(m[1]) - 1];
    const actual = c5Domains.get(domainId) ?? 0;
    if (expected === undefined) errors.push(`${domainId}: --counts にドメイン ${m[1]} の期待件数が無い`);
    else if (actual !== expected) errors.push(`${domainId}: c5 帯 live 件数 ${actual}(期待 ${expected})`);
  }
  if (singles > 0) {
    const [label, count] = [...answerCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (count / singles > ANSWER_SHARE_WARN)
      warnings.push(`c5 帯: mcq_single の正解ラベル ${label} が ${count}/${singles}(${Math.round((count / singles) * 100)}% > ${ANSWER_SHARE_WARN * 100}%)`);
  }

  if (lifecycleIds)
    for (const id of lifecycleIds) if (!seenLifecycleIds.has(id)) errors.push(`--batch-ids の ${id} が C3a / C5 帯の MCQ に存在しない`);

  return { errors, warnings, total: live.c3a.length + live.c5.length };
}

/**
 * 独立 MCQ プロファイル(ccar-p)。form 非収載の MCQ 全件を C5 相当の条件で監査する。
 * C3a 条件は F 固有なので適用しない。ID は q501〜q599 帯・ドメインごとの連番(CP3)
 */
function auditIndependent(
  input: ReturnType<typeof loadBankForValidation>["input"],
  exam: Exam,
  ledger: ReadonlySet<string>,
  isLive: (q: Question) => boolean,
  opts: PracticeAuditOptions,
): PracticeAuditResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input) return { errors, warnings, total: 0 };
  if (input.syllabus.exam !== exam) errors.push(`syllabus.yaml: exam=${input.syllabus.exam}(期待 ${exam})`);
  const domainIds = input.syllabus.domains.map((d) => d.id);
  if (opts.counts.length !== domainIds.length)
    errors.push(`--counts は ${domainIds.length} 値(syllabus のドメイン順 ${domainIds.join(",")})を期待(実際 ${opts.counts.length} 値)`);

  const inForm = new Set(input.forms.flatMap((f) => f.question_ids));

  // 帯と連番(form 非収載の MCQ 全件。retired も履歴として含む)
  const allByDomain = new Map<string, Question[]>();
  for (const q of input.questions) {
    if (q.type === "flash" || inForm.has(q.id)) continue;
    const n = Number(/-q(\d+)$/.exec(q.id)?.[1]);
    if (!(n >= BAND_P_INDEPENDENT.min && n <= BAND_P_INDEPENDENT.max)) {
      errors.push(`${q.id}: form 非収載の MCQ の ID が独立 MCQ の q${BAND_P_INDEPENDENT.min}〜q${BAND_P_INDEPENDENT.max} 帯でない`);
      continue;
    }
    const arr = allByDomain.get(q.domain_id) ?? [];
    arr.push(q);
    allByDomain.set(q.domain_id, arr);
  }
  for (const [domainId, qs] of [...allByDomain.entries()].sort()) {
    const ids = qs.map((q) => q.id).sort();
    const want = qs.map((_, i) => `${domainId}-q${String(BAND_P_INDEPENDENT.min + i).padStart(3, "0")}`);
    if (ids.some((id, i) => id !== want[i]))
      errors.push(
        `${domainId} 独立 MCQ 帯: question id が連番でない(実際 [${ids.join(", ")}] / 期待 q${BAND_P_INDEPENDENT.min}〜q${BAND_P_INDEPENDENT.min + qs.length - 1})`,
      );
  }

  const lifecycleIds = opts.batchIds ?? null;
  const seenLifecycleIds = new Set<string>();
  const perDomain = new Map<string, number>();
  const answerCounts = new Map<string, number>();
  let singles = 0;
  let total = 0;
  for (const q of input.questions) {
    if (q.type === "flash" || inForm.has(q.id) || !isLive(q)) continue;
    total++;
    if (q.exam !== exam) errors.push(`${q.id}: exam ${q.exam}`);
    if (!q.srs_eligible) errors.push(`${q.id}: srs_eligible が true でない`);
    const modes = new Set(q.eligible_modes);
    if (modes.size !== 2 || !modes.has("mock") || !modes.has("practice"))
      errors.push(`${q.id}: eligible_modes が ["mock", "practice"] でない(実際 [${q.eligible_modes.join(", ")}])`);
    if (q.scenario_id !== null) errors.push(`${q.id}: scenario_id が null でない(独立 MCQ)`);
    for (const r of q.refs) if (!ledger.has(r)) errors.push(`${q.id}: refs ${r} がソース台帳に無い`);
    if (lifecycleIds === null || lifecycleIds.has(q.id)) {
      seenLifecycleIds.add(q.id);
      if (q.status !== opts.status) errors.push(`${q.id}: status ${q.status}(期待 ${opts.status})`);
      if (lifecycleIds !== null && q.rev !== 1) errors.push(`${q.id}: rev ${q.rev}(新規バッチは 1 を期待)`);
    }
    perDomain.set(q.domain_id, (perDomain.get(q.domain_id) ?? 0) + 1);
    if (q.type === "mcq_single" && q.answer) {
      singles++;
      answerCounts.set(q.answer[0], (answerCounts.get(q.answer[0]) ?? 0) + 1);
    }
  }
  if (opts.counts.length === domainIds.length)
    domainIds.forEach((id, i) => {
      const actual = perDomain.get(id) ?? 0;
      if (actual !== opts.counts[i]) errors.push(`${id}: 独立 MCQ live 件数 ${actual}(期待 ${opts.counts[i]})`);
    });
  if (singles > 0) {
    const [label, count] = [...answerCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (count / singles > ANSWER_SHARE_WARN)
      warnings.push(`独立 MCQ: mcq_single の正解ラベル ${label} が ${count}/${singles}(${Math.round((count / singles) * 100)}% > ${ANSWER_SHARE_WARN * 100}%)`);
  }
  if (lifecycleIds)
    for (const id of lifecycleIds) if (!seenLifecycleIds.has(id)) errors.push(`--batch-ids の ${id} が独立 MCQ に存在しない`);
  return { errors, warnings, total };
}

export function parseArgs(argv: readonly string[]): { dir: string; opts: PracticeAuditOptions } {
  let dir: string | null = null;
  let exam: Exam = "ccar-f";
  let counts: number[] | null = null;
  let status = "active";
  let batchIds: Set<string> | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dir") dir = path.resolve(argv[++i]);
    else if (argv[i] === "--exam") exam = parseExam(argv[++i]);
    else if (argv[i] === "--counts") {
      counts = argv[++i].split(",").map((s) => Number(s.trim()));
      if (counts.some((n) => !Number.isInteger(n) || n < 0)) throw new Error(`--counts が不正: ${argv[i]}`);
    } else if (argv[i] === "--status") status = argv[++i];
    else if (argv[i] === "--batch-ids") batchIds = new Set(argv[++i].split(",").map((s) => s.trim()).filter(Boolean));
    else throw new Error(`未知の引数: ${argv[i]}`);
  }
  if (counts === null) throw new Error("--counts は必須(C5 帯の d1..d5 配分。例 19,13,14,14,10)");
  // f-bands は d1..d5 固定。independent はドメイン数を syllabus と照合する(runAuditPracticeMcq)
  if (PRACTICE_PROFILE[exam] === "f-bands" && counts.length !== 5)
    throw new Error(`--counts は 5 値(d1..d5)を期待(実際 ${counts.length} 値)`);
  if (batchIds?.size === 0) throw new Error("--batch-ids が空");
  return { dir: dir ?? path.join(process.cwd(), "content", exam), opts: { exam, counts, status, batchIds } };
}

function main(): void {
  const { dir, opts } = parseArgs(process.argv.slice(2));
  const r = runAuditPracticeMcq(dir, opts);
  for (const w of r.warnings) console.error(`audit-practice-mcq WARN ${w}`);
  for (const e of r.errors) console.error(`audit-practice-mcq NG ${e}`);
  if (r.errors.length > 0) {
    console.error(`audit-practice-mcq 失敗: ${r.errors.length} 件(warnings ${r.warnings.length})`);
    process.exit(1);
  }
  console.log(`audit-practice-mcq OK (practice MCQ ${r.total}, exam=${opts.exam}, status=${opts.status}, warnings ${r.warnings.length})`);
}

if (process.argv[1] && /audit-practice-mcq\.ts$/.test(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(`audit-practice-mcq 失敗(fail closed): ${(e as Error).message}`);
    process.exit(1);
  }
}

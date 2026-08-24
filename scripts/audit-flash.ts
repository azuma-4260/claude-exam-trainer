// フラッシュカード監査 `npm run audit:flash -- [--dir <path>] [--counts 40,27,30,30,23] [--status flagged] [--batch-ids <id,...>]`
// validate-bank(Zod スキーマ検証)が見ない C2/C5 固有の要件を検査する(specs/07 Step 2 / C2 プラン):
//   questions/*.json の全カードを読み、flash の内容要件だけを監査する。ID 連番は flash の q001〜だけ、
//   件数も flash のみで検査するため、予約帯 q101〜の MCQ と同居しても壊れない。ファイル名には依存しない。
//   1. domain_id 単位の flash 件数が --counts のドメイン配分(d1..d5 順)どおり
//   2. 各 domain の全 flash id が f-dN-q001 からの連番(欠番・重複なし。retired も履歴として含む)
//   3. syllabus.yaml の全 topic に primary_topic_id で最低 1 枚
//   4. 形式: stem_en 1 文 / answer_en 3 行以内 / explanation_ja 2〜4 文(「。」数)
//   5. refs が SOURCES.md「refs ソース台帳」記載 URL のみ
//   6. 固定値: exam=ccar-f, scenario_id=null, srs_eligible=true,
//      eligible_modes=["drill"]。status=--status は --batch-ids 指定時はその新規バッチだけ、
//      未指定時は全 flash に適用する。rev=1 は新規バッチ(--batch-ids 指定時)だけに適用する
//   7. id 接頭辞と domain_id の一致
// 違反は fail closed(非 0)。
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { questionsFileSchema, type Question } from "../src/lib/bank/schema";
import { loadSyllabus } from "../src/lib/bank/syllabus";

export interface AuditOptions {
  /** ドメイン番号順(d1..d5)の期待件数。null なら件数検査をスキップ */
  counts: readonly number[] | null;
  /** lifecycle 対象カードに期待する status */
  status: string;
  /** lifecycle(status/rev)を検査する新規バッチID。未指定なら全 flash */
  batchIds?: ReadonlySet<string> | null;
}

/** SOURCES.md の「refs ソース台帳」表から ref URL 列を抽出する */
export function parseLedgerUrls(sourcesMd: string): Set<string> {
  const urls = new Set<string>();
  for (const m of sourcesMd.matchAll(/^\|\s*\d+\s*\|\s*(https:\/\/\S+)\s*\|/gm)) urls.add(m[1]);
  return urls;
}

/** stem_en の英語文数。略語・引用符を考慮し、1文だけでも文末記号が無ければ0とする。 */
export function sentenceCount(text: string): number {
  const segments = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text.trim())]
    .map(({ segment }) => segment.trim())
    .filter(Boolean);
  if (segments.length !== 1) return segments.length;
  return /[.?!]["'”’)}\]]*$/.test(segments[0]) ? 1 : 0;
}

export function runAuditFlash(dir: string, opts: AuditOptions): { errors: string[]; total: number } {
  const errors: string[] = [];
  const syllabus = loadSyllabus(dir);
  const allTopics = new Set<string>();
  for (const d of syllabus.domains) for (const t of d.task_statements) for (const tc of t.topics) allTopics.add(tc.id);

  const sourcesPath = path.join(dir, "SOURCES.md");
  const ledger = existsSync(sourcesPath) ? parseLedgerUrls(readFileSync(sourcesPath, "utf8")) : new Set<string>();
  if (ledger.size === 0) errors.push("SOURCES.md の refs ソース台帳が見つからない(URL 0 件)");

  const qDir = path.join(dir, "questions");
  const files = existsSync(qDir) ? readdirSync(qDir).filter((n) => n.endsWith(".json")).sort() : [];
  if (files.length === 0) errors.push(`questions/ に .json が無い: ${qDir}`);

  // 全ファイルを読み、全 question と type=flash をそれぞれ domain_id 単位に集約する(ファイル名非依存)
  const allFlashByDomain = new Map<string, Question[]>();
  const byDomain = new Map<string, { q: Question }[]>();
  for (const f of files) {
    let qs: Question[];
    try {
      qs = questionsFileSchema.parse(JSON.parse(readFileSync(path.join(qDir, f), "utf8")));
    } catch (e) {
      errors.push(`${f}: 読込/スキーマ失敗: ${(e as Error).message.slice(0, 200)}`);
      continue;
    }
    for (const q of qs) {
      if (q.type !== "flash") continue; // MCQ 等は監査対象外(他タスクのファイルと同居可)
      const allFlash = allFlashByDomain.get(q.domain_id) ?? [];
      allFlash.push(q);
      allFlashByDomain.set(q.domain_id, allFlash);
      // retired は履歴として全 question ID 連番には残すが、live 件数・topic 被覆には数えない。
      // flagged は明示された新規 batch（C2 のように batchIds 未指定なら期待 status 全体）のみ live とする。
      const isLive = opts.batchIds ? q.status === "active" || opts.batchIds.has(q.id) : q.status !== "retired";
      if (!isLive) continue;
      const arr = byDomain.get(q.domain_id) ?? [];
      arr.push({ q });
      byDomain.set(q.domain_id, arr);
    }
  }
  const total = [...byDomain.values()].reduce((n, arr) => n + arr.length, 0);
  if (total === 0) errors.push("type=flash のカードが 1 枚も無い");

  // 1. 件数(--counts の d1..d5 順と domain_id 単位で突合。カード 0 のドメインも検出)
  if (opts.counts) {
    const domains = new Set([...byDomain.keys(), ...opts.counts.map((_, i) => `f-d${i + 1}`)]);
    for (const domainId of [...domains].sort()) {
      const m = /^f-d([1-9])$/.exec(domainId);
      if (!m) {
        errors.push(`domain_id ${domainId}: f-dN 形式でない`);
        continue;
      }
      const expected = opts.counts[Number(m[1]) - 1];
      const actual = byDomain.get(domainId)?.length ?? 0;
      if (expected === undefined) errors.push(`${domainId}: --counts にドメイン ${m[1]} の期待件数が無い`);
      else if (actual !== expected) errors.push(`${domainId}: flash 件数 ${actual}(期待 ${expected})`);
    }
  }

  const coveredTopics = new Set<string>();
  // 2. flash のみ q001 から連番検査する。MCQ は並行タスク用の予約帯 q101〜を使うため対象外。
  for (const [domainId, questions] of [...allFlashByDomain.entries()].sort()) {
    const ids = questions.map((q) => q.id).sort();
    const want = questions.map((_, i) => `${domainId}-q${String(i + 1).padStart(3, "0")}`);
    for (let i = 0; i < ids.length; i++)
      if (ids[i] !== want[i]) {
        errors.push(`${domainId}: question id が連番でない(実際 [${ids.join(", ")}] / 期待 q001〜q${String(questions.length).padStart(3, "0")})`);
        break;
      }
  }

  const lifecycleIds = opts.batchIds ?? null;
  const seenLifecycleIds = new Set<string>();
  for (const [, arr] of [...byDomain.entries()].sort()) {
    for (const { q } of arr) {
      // 7. id 接頭辞と domain_id の一致は Zod スキーマ(単一ソース)が強制するためここでは検査しない

      // 6. 固定値
      if (q.exam !== "ccar-f") errors.push(`${q.id}: exam ${q.exam}`);
      if (q.scenario_id !== null) errors.push(`${q.id}: scenario_id が null でない`);
      if (!q.srs_eligible) errors.push(`${q.id}: srs_eligible が true でない`);
      if (q.eligible_modes.length !== 1 || q.eligible_modes[0] !== "drill")
        errors.push(`${q.id}: eligible_modes が ["drill"] でない`);
      if (lifecycleIds === null || lifecycleIds.has(q.id)) {
        seenLifecycleIds.add(q.id);
        if (q.status !== opts.status) errors.push(`${q.id}: status ${q.status}(期待 ${opts.status})`);
        // 全件監査では editorial fix による rev++ を許容する。rev=1 は新規生成バッチだけの契約。
        if (lifecycleIds !== null && q.rev !== 1) errors.push(`${q.id}: rev ${q.rev}(新規バッチは 1 を期待)`);
      }

      // 3. topic 被覆(集計)+ 実在は validate-bank も見るがここでも確認
      if (!allTopics.has(q.primary_topic_id)) errors.push(`${q.id}: primary_topic_id ${q.primary_topic_id} が syllabus に無い`);
      coveredTopics.add(q.primary_topic_id);

      // 4. 形式
      if (sentenceCount(q.stem_en) !== 1) errors.push(`${q.id}: stem_en が 1 文でない(${sentenceCount(q.stem_en)} 文)`);
      const lines = q.answer_en === null ? 0 : q.answer_en.split("\n").length;
      if (lines > 3) errors.push(`${q.id}: answer_en が ${lines} 行(3 行以内)`);
      const ja = (q.explanation_ja.match(/。/g) ?? []).length;
      if (ja < 2 || ja > 4) errors.push(`${q.id}: explanation_ja が ${ja} 文(2〜4 文)`);

      // 5. refs は台帳のみ
      for (const r of q.refs) if (!ledger.has(r)) errors.push(`${q.id}: refs ${r} がソース台帳に無い`);
    }
  }

  if (lifecycleIds) for (const id of lifecycleIds) if (!seenLifecycleIds.has(id)) errors.push(`--batch-ids の ${id} が flash に存在しない`);

  // 3. 全 topic 被覆
  for (const t of allTopics) if (!coveredTopics.has(t)) errors.push(`topic ${t} に primary のカードが 1 枚も無い`);

  return { errors, total };
}

export function parseArgs(argv: readonly string[]): { dir: string; opts: AuditOptions } {
  let dir = path.join(process.cwd(), "content", "ccar-f");
  let counts: number[] | null = null;
  let status = "flagged";
  let batchIds: Set<string> | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dir") dir = path.resolve(argv[++i]);
    else if (argv[i] === "--counts") {
      counts = argv[++i].split(",").map((s) => Number(s.trim()));
      if (counts.some((n) => !Number.isInteger(n) || n < 0)) throw new Error(`--counts が不正: ${argv[i]}`);
    } else if (argv[i] === "--status") status = argv[++i];
    else if (argv[i] === "--batch-ids") batchIds = new Set(argv[++i].split(",").map((s) => s.trim()).filter(Boolean));
    else throw new Error(`未知の引数: ${argv[i]}`);
  }
  if (batchIds?.size === 0) throw new Error("--batch-ids が空");
  return { dir, opts: { counts, status, batchIds } };
}

function main(): void {
  const { dir, opts } = parseArgs(process.argv.slice(2));
  const r = runAuditFlash(dir, opts);
  for (const e of r.errors) console.error(`audit-flash NG ${e}`);
  if (r.errors.length > 0) {
    console.error(`audit-flash 失敗: ${r.errors.length} 件`);
    process.exit(1);
  }
  console.log(`audit-flash OK (flash cards ${r.total}, status=${opts.status})`);
}

if (process.argv[1] && /audit-flash\.ts$/.test(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(`audit-flash 失敗(fail closed): ${(e as Error).message}`);
    process.exit(1);
  }
}

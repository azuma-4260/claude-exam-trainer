/**
 * db:check — Neon 両 branch(dev / production)のスキーマ整合検証(specs/03 §2, 06)。
 *
 * 検証内容(branch ごと):
 *   1. drizzle/ の migration が全て適用済みで hash が一致する
 *   2. 5 テーブルの列定義(型・NOT NULL・default 有無)が specs/03 §2 と一致する
 *   3. partial unique index 2 本と PK が存在する
 *   4. CHECK 制約(exam / mode / kind / status / reason / state / rating)が存在する
 *
 * 接続先は環境変数で指定する(specs/06: 接続は neon-http のみ):
 *   - DATABASE_URL             … dev branch(`vercel env pull --environment=development`)
 *   - DATABASE_URL_PRODUCTION  … production branch(検証したい場合のみ手動で設定)
 * 少なくとも 1 本が必要。差分があれば非 0 終了する。
 */
import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const TABLE_NAMES = [
  "srs_state",
  "attempt",
  "exam_session",
  "exam_session_answer",
  "question_flag",
] as const;

export interface ExpectedColumn {
  /** information_schema.columns.udt_name(text[] は _text) */
  udt: string;
  nullable: boolean;
  hasDefault: boolean;
}

/** specs/03 §2 の 5 テーブル定義(検証用スナップショット) */
export const EXPECTED_TABLES: Record<string, Record<string, ExpectedColumn>> = {
  srs_state: {
    question_id: { udt: "text", nullable: false, hasDefault: false },
    exam: { udt: "text", nullable: false, hasDefault: false },
    due_at: { udt: "timestamptz", nullable: false, hasDefault: false },
    stability: { udt: "float8", nullable: false, hasDefault: false },
    difficulty: { udt: "float8", nullable: false, hasDefault: false },
    elapsed_days: { udt: "int4", nullable: false, hasDefault: false },
    scheduled_days: { udt: "int4", nullable: false, hasDefault: false },
    reps: { udt: "int4", nullable: false, hasDefault: false },
    lapses: { udt: "int4", nullable: false, hasDefault: false },
    learning_steps: { udt: "int4", nullable: false, hasDefault: false },
    state: { udt: "int2", nullable: false, hasDefault: false },
    last_review_at: { udt: "timestamptz", nullable: true, hasDefault: false },
    updated_at: { udt: "timestamptz", nullable: false, hasDefault: true },
  },
  attempt: {
    attempt_id: { udt: "uuid", nullable: false, hasDefault: false },
    question_id: { udt: "text", nullable: false, hasDefault: false },
    question_rev: { udt: "int4", nullable: false, hasDefault: false },
    exam: { udt: "text", nullable: false, hasDefault: false },
    mode: { udt: "text", nullable: false, hasDefault: false },
    session_id: { udt: "uuid", nullable: true, hasDefault: false },
    applied_rating: { udt: "int2", nullable: true, hasDefault: false },
    is_correct: { udt: "bool", nullable: true, hasDefault: false },
    chosen: { udt: "_text", nullable: true, hasDefault: false },
    elapsed_ms: { udt: "int4", nullable: true, hasDefault: false },
    answered_at: { udt: "timestamptz", nullable: false, hasDefault: true },
  },
  exam_session: {
    id: { udt: "uuid", nullable: false, hasDefault: false },
    exam: { udt: "text", nullable: false, hasDefault: false },
    kind: { udt: "text", nullable: false, hasDefault: false },
    form_id: { udt: "text", nullable: true, hasDefault: false },
    domain_id: { udt: "text", nullable: true, hasDefault: false },
    question_ids: { udt: "_text", nullable: false, hasDefault: false },
    status: { udt: "text", nullable: false, hasDefault: false },
    submission_reason: { udt: "text", nullable: true, hasDefault: false },
    started_at: { udt: "timestamptz", nullable: false, hasDefault: false },
    deadline_at: { udt: "timestamptz", nullable: true, hasDefault: false },
    current_index: { udt: "int4", nullable: false, hasDefault: true },
    finished_at: { udt: "timestamptz", nullable: true, hasDefault: false },
    score_raw: { udt: "int4", nullable: true, hasDefault: false },
  },
  exam_session_answer: {
    session_id: { udt: "uuid", nullable: false, hasDefault: false },
    question_id: { udt: "text", nullable: false, hasDefault: false },
    question_rev: { udt: "int4", nullable: false, hasDefault: false },
    chosen: { udt: "_text", nullable: true, hasDefault: false },
    flagged: { udt: "bool", nullable: false, hasDefault: true },
    answer_updated_at: { udt: "timestamptz", nullable: true, hasDefault: false },
    updated_at: { udt: "timestamptz", nullable: false, hasDefault: false },
  },
  question_flag: {
    id: { udt: "uuid", nullable: false, hasDefault: false },
    question_id: { udt: "text", nullable: false, hasDefault: false },
    question_rev: { udt: "int4", nullable: false, hasDefault: false },
    reason: { udt: "text", nullable: false, hasDefault: false },
    memo: { udt: "text", nullable: true, hasDefault: false },
    created_at: { udt: "timestamptz", nullable: false, hasDefault: true },
    resolved_at: { udt: "timestamptz", nullable: true, hasDefault: false },
  },
};

/** インデックス検証: indexdef に required の全断片が含まれること */
export const EXPECTED_INDEXES: { table: string; name: string; required: string[] }[] = [
  {
    table: "attempt",
    name: "attempt_mock_session_question_uq",
    required: ["UNIQUE", "session_id", "question_id", "WHERE", "mode", "'mock'"],
  },
  {
    table: "question_flag",
    name: "question_flag_one_open",
    required: ["UNIQUE", "question_id", "question_rev", "WHERE", "resolved_at IS NULL"],
  },
  { table: "srs_state", name: "srs_state_pkey", required: ["UNIQUE", "question_id"] },
  { table: "attempt", name: "attempt_pkey", required: ["UNIQUE", "attempt_id"] },
  { table: "exam_session", name: "exam_session_pkey", required: ["UNIQUE", "id"] },
  {
    table: "exam_session_answer",
    name: "exam_session_answer_session_id_question_id_pk",
    required: ["UNIQUE", "session_id", "question_id"],
  },
  { table: "question_flag", name: "question_flag_pkey", required: ["UNIQUE", "id"] },
];

export const EXPECTED_CHECKS: { table: string; name: string }[] = [
  { table: "srs_state", name: "srs_state_exam_check" },
  { table: "srs_state", name: "srs_state_state_check" },
  { table: "attempt", name: "attempt_exam_check" },
  { table: "attempt", name: "attempt_mode_check" },
  { table: "attempt", name: "attempt_applied_rating_check" },
  { table: "exam_session", name: "exam_session_exam_check" },
  { table: "exam_session", name: "exam_session_kind_check" },
  { table: "exam_session", name: "exam_session_status_check" },
  { table: "exam_session", name: "exam_session_submission_reason_check" },
  { table: "question_flag", name: "question_flag_reason_check" },
];

export interface ColumnRow {
  table_name: string;
  column_name: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
}

export function diffColumns(actual: ColumnRow[]): string[] {
  const diffs: string[] = [];
  const byTable = new Map<string, Map<string, ColumnRow>>();
  for (const row of actual) {
    if (!byTable.has(row.table_name)) byTable.set(row.table_name, new Map());
    byTable.get(row.table_name)!.set(row.column_name, row);
  }
  for (const [table, columns] of Object.entries(EXPECTED_TABLES)) {
    const actualCols = byTable.get(table);
    if (!actualCols) {
      diffs.push(`テーブル欠落: ${table}`);
      continue;
    }
    for (const [name, exp] of Object.entries(columns)) {
      const col = actualCols.get(name);
      if (!col) {
        diffs.push(`${table}.${name}: 列が存在しない`);
        continue;
      }
      if (col.udt_name !== exp.udt)
        diffs.push(`${table}.${name}: 型 ${col.udt_name}(期待 ${exp.udt})`);
      if ((col.is_nullable === "YES") !== exp.nullable)
        diffs.push(`${table}.${name}: nullable=${col.is_nullable}(期待 ${exp.nullable ? "YES" : "NO"})`);
      if ((col.column_default !== null) !== exp.hasDefault)
        diffs.push(`${table}.${name}: default ${col.column_default ?? "なし"}(期待: default ${exp.hasDefault ? "あり" : "なし"})`);
    }
    for (const name of actualCols.keys()) {
      if (!(name in columns)) diffs.push(`${table}.${name}: specs/03 に無い列`);
    }
  }
  return diffs;
}

export function diffIndexes(actual: { indexname: string; indexdef: string }[]): string[] {
  const diffs: string[] = [];
  const byName = new Map(actual.map((i) => [i.indexname, i.indexdef]));
  for (const exp of EXPECTED_INDEXES) {
    const def = byName.get(exp.name);
    if (def === undefined) {
      diffs.push(`インデックス欠落: ${exp.table}.${exp.name}`);
      continue;
    }
    for (const frag of exp.required) {
      if (!def.includes(frag)) diffs.push(`${exp.name}: indexdef に「${frag}」が無い: ${def}`);
    }
  }
  return diffs;
}

export function diffChecks(actual: { table_name: string; conname: string }[]): string[] {
  const names = new Set(actual.map((c) => c.conname));
  return EXPECTED_CHECKS.filter((c) => !names.has(c.name)).map(
    (c) => `CHECK 制約欠落: ${c.table}.${c.name}`,
  );
}

/** drizzle migrator と同じ方式(SQL ファイル全文の sha256)でローカル hash を計算 */
export function localMigrationHashes(migrationsDir: string): { tag: string; hash: string }[] {
  const journal = JSON.parse(readFileSync(join(migrationsDir, "meta", "_journal.json"), "utf8")) as {
    entries: { tag: string }[];
  };
  const sqlFiles = new Set(readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")));
  return journal.entries.map((e) => {
    const file = `${e.tag}.sql`;
    if (!sqlFiles.has(file)) throw new Error(`journal のエントリ ${e.tag} に対応する ${file} が無い`);
    return { tag: e.tag, hash: createHash("sha256").update(readFileSync(join(migrationsDir, file), "utf8")).digest("hex") };
  });
}

export function diffMigrations(
  applied: { hash: string }[],
  local: { tag: string; hash: string }[],
): string[] {
  const diffs: string[] = [];
  if (applied.length < local.length)
    diffs.push(`未適用 migration: ${local.slice(applied.length).map((l) => l.tag).join(", ")}(npm run db:migrate を実行)`);
  if (applied.length > local.length)
    diffs.push(`DB 側にローカルに無い migration が ${applied.length - local.length} 件適用されている`);
  for (let i = 0; i < Math.min(applied.length, local.length); i++) {
    if (applied[i].hash !== local[i].hash)
      diffs.push(`migration ${local[i].tag}: hash 不一致(適用後にファイルが書き換えられた可能性)`);
  }
  return diffs;
}

async function checkBranch(label: string, url: string, local: { tag: string; hash: string }[]): Promise<string[]> {
  const sql = neon(url);
  const diffs: string[] = [];

  const migTable = (await sql`
    select 1 from information_schema.tables
    where table_schema = 'drizzle' and table_name = '__drizzle_migrations'
  `) as unknown[];
  if (migTable.length === 0) {
    diffs.push("migration 未適用(drizzle.__drizzle_migrations が存在しない。npm run db:migrate を実行)");
  } else {
    const applied = (await sql`
      select hash from drizzle.__drizzle_migrations order by id
    `) as { hash: string }[];
    diffs.push(...diffMigrations(applied, local));
  }

  const tableList = [...TABLE_NAMES];
  const columns = (await sql`
    select table_name, column_name, udt_name, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public' and table_name = any(${tableList})
    order by table_name, ordinal_position
  `) as unknown as ColumnRow[];
  diffs.push(...diffColumns(columns));

  const indexes = (await sql`
    select indexname, indexdef from pg_indexes
    where schemaname = 'public' and tablename = any(${tableList})
  `) as unknown as { indexname: string; indexdef: string }[];
  diffs.push(...diffIndexes(indexes));

  const checks = (await sql`
    select conrelid::regclass::text as table_name, conname
    from pg_constraint
    where contype = 'c' and connamespace = 'public'::regnamespace
      and conrelid::regclass::text = any(${tableList})
  `) as unknown as { table_name: string; conname: string }[];
  diffs.push(...diffChecks(checks));

  return diffs.map((d) => `[${label}] ${d}`);
}

async function main() {
  const targets: { label: string; url: string }[] = [];
  if (process.env.DATABASE_URL) targets.push({ label: "dev", url: process.env.DATABASE_URL });
  if (process.env.DATABASE_URL_PRODUCTION)
    targets.push({ label: "production", url: process.env.DATABASE_URL_PRODUCTION });

  if (targets.length === 0) {
    console.error(
      "DATABASE_URL(dev)/ DATABASE_URL_PRODUCTION のいずれも未設定。\n" +
        "dev branch: `vercel env pull --environment=development` で .env.local に取得する。",
    );
    process.exit(1);
  }
  if (targets.length === 1) {
    console.warn(`注意: ${targets[0].label} branch のみ検証(もう一方の URL が未設定)`);
  }

  const local = localMigrationHashes(join(process.cwd(), "drizzle"));
  let failed = false;
  for (const t of targets) {
    const diffs = await checkBranch(t.label, t.url, local);
    if (diffs.length === 0) {
      console.log(`[${t.label}] OK — 差分 0(migration ${local.length} 件適用済み、定義は specs/03 §2 と一致)`);
    } else {
      failed = true;
      for (const d of diffs) console.error(d);
    }
  }
  process.exit(failed ? 1 : 0);
}

// Vitest からの import 時は実行しない
if (process.argv[1] && process.argv[1].endsWith("db-check.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

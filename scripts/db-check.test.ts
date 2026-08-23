import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  EXPECTED_TABLES,
  TABLE_NAMES,
  diffChecks,
  diffColumns,
  diffIndexes,
  diffMigrations,
  localMigrationHashes,
  type ColumnRow,
} from "./db-check";
import {
  attempt,
  examSession,
  examSessionAnswer,
  questionFlag,
  srsState,
} from "../src/db/schema";

/** db-check の期待スナップショットが src/db/schema.ts とズレていないことの相互検証 */
describe("EXPECTED_TABLES と Drizzle schema の整合", () => {
  const SQL_TYPE_TO_UDT: Record<string, string> = {
    text: "text",
    uuid: "uuid",
    integer: "int4",
    smallint: "int2",
    boolean: "bool",
    "double precision": "float8",
    "timestamp with time zone": "timestamptz",
    "text[]": "_text",
  };

  for (const table of [srsState, attempt, examSession, examSessionAnswer, questionFlag]) {
    const config = getTableConfig(table);
    it(`${config.name}: 列名・型・NOT NULL・default が一致する`, () => {
      const expected = EXPECTED_TABLES[config.name];
      expect(expected, `${config.name} が EXPECTED_TABLES に存在する`).toBeDefined();
      expect(config.columns.map((c) => c.name).sort()).toEqual(Object.keys(expected).sort());
      for (const col of config.columns) {
        const exp = expected[col.name];
        expect(SQL_TYPE_TO_UDT[col.getSQLType()], `${config.name}.${col.name} の型`).toBe(exp.udt);
        expect(!col.notNull, `${config.name}.${col.name} の nullable`).toBe(exp.nullable);
        expect(col.hasDefault, `${config.name}.${col.name} の default`).toBe(exp.hasDefault);
      }
    });
  }
});

/** 期待スナップショットをそのまま実 DB の introspection 行の形にする */
const snapshotAsRows = (): ColumnRow[] =>
  TABLE_NAMES.flatMap((table) =>
    Object.entries(EXPECTED_TABLES[table]).map(([name, exp]) => ({
      table_name: table,
      column_name: name,
      udt_name: exp.udt,
      is_nullable: exp.nullable ? ("YES" as const) : ("NO" as const),
      column_default: exp.hasDefault ? "now()" : null,
    })),
  );

describe("diffColumns", () => {
  it("一致するスナップショットでは差分 0", () => {
    expect(diffColumns(snapshotAsRows())).toEqual([]);
  });

  it("テーブル欠落・列欠落・型/nullable/default 不一致・余剰列を検出する", () => {
    const rows = snapshotAsRows().filter((r) => r.table_name !== "question_flag");
    const state = rows.find((r) => r.table_name === "srs_state" && r.column_name === "state")!;
    state.udt_name = "int4";
    const sessionId = rows.find((r) => r.table_name === "attempt" && r.column_name === "session_id")!;
    sessionId.is_nullable = "NO";
    const updatedAt = rows.find(
      (r) => r.table_name === "exam_session_answer" && r.column_name === "updated_at",
    )!;
    updatedAt.column_default = "now()";
    const withoutCol = rows.filter(
      (r) => !(r.table_name === "exam_session" && r.column_name === "score_raw"),
    );
    withoutCol.push({
      table_name: "exam_session",
      column_name: "extra_col",
      udt_name: "text",
      is_nullable: "YES",
      column_default: null,
    });

    const diffs = diffColumns(withoutCol);
    expect(diffs).toContain("テーブル欠落: question_flag");
    expect(diffs.some((d) => d.startsWith("srs_state.state: 型 int4"))).toBe(true);
    expect(diffs.some((d) => d.startsWith("attempt.session_id: nullable=NO"))).toBe(true);
    expect(diffs.some((d) => d.startsWith("exam_session_answer.updated_at: default"))).toBe(true);
    expect(diffs).toContain("exam_session.score_raw: 列が存在しない");
    expect(diffs).toContain("exam_session.extra_col: specs/03 に無い列");
  });
});

describe("diffIndexes", () => {
  const fullIndexes = [
    {
      indexname: "attempt_mock_session_question_uq",
      indexdef: `CREATE UNIQUE INDEX attempt_mock_session_question_uq ON public.attempt USING btree (session_id, question_id) WHERE (mode = 'mock'::text)`,
    },
    {
      indexname: "question_flag_one_open",
      indexdef: `CREATE UNIQUE INDEX question_flag_one_open ON public.question_flag USING btree (question_id, question_rev) WHERE (resolved_at IS NULL)`,
    },
    { indexname: "srs_state_pkey", indexdef: "CREATE UNIQUE INDEX srs_state_pkey ON public.srs_state USING btree (question_id)" },
    { indexname: "attempt_pkey", indexdef: "CREATE UNIQUE INDEX attempt_pkey ON public.attempt USING btree (attempt_id)" },
    { indexname: "exam_session_pkey", indexdef: "CREATE UNIQUE INDEX exam_session_pkey ON public.exam_session USING btree (id)" },
    {
      indexname: "exam_session_answer_session_id_question_id_pk",
      indexdef:
        "CREATE UNIQUE INDEX exam_session_answer_session_id_question_id_pk ON public.exam_session_answer USING btree (session_id, question_id)",
    },
    { indexname: "question_flag_pkey", indexdef: "CREATE UNIQUE INDEX question_flag_pkey ON public.question_flag USING btree (id)" },
  ];

  it("partial unique index 2 本 + PK が揃っていれば差分 0", () => {
    expect(diffIndexes(fullIndexes)).toEqual([]);
  });

  it("holdout/冪等性を支える index の欠落・WHERE 句の欠落を検出する", () => {
    const missing = fullIndexes.filter((i) => i.indexname !== "question_flag_one_open");
    expect(diffIndexes(missing)).toContain("インデックス欠落: question_flag.question_flag_one_open");

    const noWhere = fullIndexes.map((i) =>
      i.indexname === "attempt_mock_session_question_uq"
        ? { ...i, indexdef: i.indexdef.replace(/ WHERE .+$/, "") }
        : i,
    );
    expect(diffIndexes(noWhere).some((d) => d.startsWith("attempt_mock_session_question_uq:"))).toBe(true);
  });
});

describe("diffChecks", () => {
  const allChecks = [
    { table_name: "srs_state", conname: "srs_state_exam_check" },
    { table_name: "srs_state", conname: "srs_state_state_check" },
    { table_name: "attempt", conname: "attempt_exam_check" },
    { table_name: "attempt", conname: "attempt_mode_check" },
    { table_name: "attempt", conname: "attempt_applied_rating_check" },
    { table_name: "exam_session", conname: "exam_session_exam_check" },
    { table_name: "exam_session", conname: "exam_session_kind_check" },
    { table_name: "exam_session", conname: "exam_session_status_check" },
    { table_name: "exam_session", conname: "exam_session_submission_reason_check" },
    { table_name: "question_flag", conname: "question_flag_reason_check" },
  ];

  it("全 CHECK が存在すれば差分 0、欠落は検出する", () => {
    expect(diffChecks(allChecks)).toEqual([]);
    expect(diffChecks(allChecks.slice(1))).toEqual(["CHECK 制約欠落: srs_state.srs_state_exam_check"]);
  });
});

describe("diffMigrations / localMigrationHashes", () => {
  it("ローカル migration の hash を journal 順に計算できる", () => {
    const local = localMigrationHashes(join(process.cwd(), "drizzle"));
    expect(local.length).toBeGreaterThanOrEqual(1);
    expect(local[0].hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("未適用・余剰・hash 不一致を検出する", () => {
    const local = [
      { tag: "0000_init", hash: "a".repeat(64) },
      { tag: "0001_next", hash: "b".repeat(64) },
    ];
    expect(diffMigrations([{ hash: "a".repeat(64) }], local)).toEqual([
      "未適用 migration: 0001_next(npm run db:migrate を実行)",
    ]);
    expect(
      diffMigrations([{ hash: "a".repeat(64) }, { hash: "b".repeat(64) }, { hash: "c".repeat(64) }], local),
    ).toEqual(["DB 側にローカルに無い migration が 1 件適用されている"]);
    expect(diffMigrations([{ hash: "x".repeat(64) }, { hash: "b".repeat(64) }], local)).toEqual([
      "migration 0000_init: hash 不一致(適用後にファイルが書き換えられた可能性)",
    ]);
    expect(diffMigrations([{ hash: "a".repeat(64) }, { hash: "b".repeat(64) }], local)).toEqual([]);
  });
});

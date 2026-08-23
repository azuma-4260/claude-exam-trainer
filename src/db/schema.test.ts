import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  FLAG_REASONS,
  FSRS_RATING_VALUES,
  FSRS_STATE_VALUES,
  SESSION_KINDS,
  SESSION_STATUSES,
  SUBMISSION_REASONS,
  attempt,
  examSession,
  examSessionAnswer,
  questionFlag,
  srsState,
} from "./schema";
import { EXAMS, MODES } from "../lib/bank/schema";

/**
 * specs/03 §2 に対する migration の静的検証。
 * 生成済み SQL(drizzle/)が設計書の定義と一致していることをテーブルごとに確認する。
 */

const migrationsDir = join(process.cwd(), "drizzle");
const journal = JSON.parse(readFileSync(join(migrationsDir, "meta", "_journal.json"), "utf8")) as {
  entries: { tag: string }[];
};
const allSql = journal.entries
  .map((e) => readFileSync(join(migrationsDir, `${e.tag}.sql`), "utf8"))
  .join("\n");

/** CREATE TABLE "name" ( ... ); のブロックを取り出す */
const tableDdl = (name: string): string => {
  const m = allSql.match(new RegExp(`CREATE TABLE "${name}" \\(([\\s\\S]*?)\\n\\);`));
  expect(m, `CREATE TABLE ${name} が migration に存在する`).not.toBeNull();
  return m![1];
};

describe("migration SQL と specs/03 §2 の一致", () => {
  it("journal の全エントリに SQL ファイルが存在する", () => {
    expect(journal.entries.length).toBeGreaterThanOrEqual(1);
  });

  it("srs_state — ts-fsrs Card の lossless 永続化", () => {
    const ddl = tableDdl("srs_state");
    expect(ddl).toContain(`"question_id" text PRIMARY KEY NOT NULL`);
    expect(ddl).toContain(`"exam" text NOT NULL`);
    expect(ddl).toContain(`"due_at" timestamp with time zone NOT NULL`);
    expect(ddl).toContain(`"stability" double precision NOT NULL`);
    expect(ddl).toContain(`"difficulty" double precision NOT NULL`);
    for (const col of ["elapsed_days", "scheduled_days", "reps", "lapses", "learning_steps"]) {
      expect(ddl).toContain(`"${col}" integer NOT NULL`);
    }
    expect(ddl).toContain(`"state" smallint NOT NULL`);
    expect(ddl).toContain(`"last_review_at" timestamp with time zone,`);
    expect(ddl).toContain(`"updated_at" timestamp with time zone DEFAULT now() NOT NULL`);
    // state は ts-fsrs State enum 値のみ(New=0 / Learning=1 / Review=2 / Relearning=3)
    expect(FSRS_STATE_VALUES).toEqual([0, 1, 2, 3]);
    expect(ddl).toContain(`CHECK ("srs_state"."state" in (${FSRS_STATE_VALUES.join(", ")}))`);
  });

  it("attempt — 追記専用ログと mock 冪等性 index", () => {
    const ddl = tableDdl("attempt");
    expect(ddl).toContain(`"attempt_id" uuid PRIMARY KEY NOT NULL`);
    expect(ddl).toContain(`"question_id" text NOT NULL`);
    expect(ddl).toContain(`"question_rev" integer NOT NULL`);
    expect(ddl).toContain(`"mode" text NOT NULL`);
    expect(ddl).toContain(`"session_id" uuid,`);
    expect(ddl).toContain(`"applied_rating" smallint,`);
    expect(ddl).toContain(`"is_correct" boolean,`);
    expect(ddl).toContain(`"chosen" text[],`);
    expect(ddl).toContain(`"elapsed_ms" integer,`);
    expect(ddl).toContain(`"answered_at" timestamp with time zone DEFAULT now() NOT NULL`);
    // applied_rating は ts-fsrs に渡す Rating(Again=1..Easy=4)のみ
    expect(FSRS_RATING_VALUES).toEqual([1, 2, 3, 4]);
    expect(allSql).toContain(
      `CREATE UNIQUE INDEX "attempt_mock_session_question_uq" ON "attempt" USING btree ("session_id","question_id") WHERE "attempt"."mode" = 'mock'`,
    );
  });

  it("exam_session — 模試セッション", () => {
    const ddl = tableDdl("exam_session");
    expect(ddl).toContain(`"id" uuid PRIMARY KEY NOT NULL`);
    expect(ddl).toContain(`"question_ids" text[] NOT NULL`);
    expect(ddl).toContain(`"form_id" text,`);
    expect(ddl).toContain(`"domain_id" text,`);
    expect(ddl).toContain(`"submission_reason" text,`);
    expect(ddl).toContain(`"started_at" timestamp with time zone NOT NULL`);
    expect(ddl).toContain(`"deadline_at" timestamp with time zone,`);
    expect(ddl).toContain(`"current_index" integer DEFAULT 0 NOT NULL`);
    expect(ddl).toContain(`"finished_at" timestamp with time zone,`);
    expect(ddl).toContain(`"score_raw" integer`);
  });

  it("exam_session_answer — 複合 PK と FK", () => {
    const ddl = tableDdl("exam_session_answer");
    expect(ddl).toContain(`"question_rev" integer NOT NULL`);
    expect(ddl).toContain(`"chosen" text[],`);
    expect(ddl).toContain(`"flagged" boolean DEFAULT false NOT NULL`);
    expect(ddl).toContain(`"answer_updated_at" timestamp with time zone,`);
    expect(ddl).toContain(`"updated_at" timestamp with time zone NOT NULL`);
    expect(ddl).toContain(`PRIMARY KEY("session_id","question_id")`);
    expect(allSql).toContain(
      `FOREIGN KEY ("session_id") REFERENCES "public"."exam_session"("id")`,
    );
  });

  it("question_flag — open フラグは (question_id, rev) につき 1 行", () => {
    const ddl = tableDdl("question_flag");
    expect(ddl).toContain(`"id" uuid PRIMARY KEY NOT NULL`);
    expect(ddl).toContain(`"memo" text,`);
    expect(ddl).toContain(`"created_at" timestamp with time zone DEFAULT now() NOT NULL`);
    expect(ddl).toContain(`"resolved_at" timestamp with time zone`);
    expect(allSql).toContain(
      `CREATE UNIQUE INDEX "question_flag_one_open" ON "question_flag" USING btree ("question_id","question_rev") WHERE "question_flag"."resolved_at" is null`,
    );
  });

  it("enum/CHECK が TypeScript union と一致する(specs/03 §2 冒頭)", () => {
    const checkLiteral = (values: readonly string[]) => values.map((v) => `'${v}'`).join(", ");
    for (const [table, column, values] of [
      ["srs_state", "exam", EXAMS],
      ["attempt", "exam", EXAMS],
      ["attempt", "mode", MODES],
      ["exam_session", "exam", EXAMS],
      ["exam_session", "kind", SESSION_KINDS],
      ["exam_session", "status", SESSION_STATUSES],
      ["exam_session", "submission_reason", SUBMISSION_REASONS],
      ["question_flag", "reason", FLAG_REASONS],
    ] as const) {
      expect(allSql).toContain(
        `CONSTRAINT "${table}_${column}_check" CHECK ("${table}"."${column}" in (${checkLiteral(values)}))`,
      );
    }
    expect(allSql).toContain(
      `CONSTRAINT "attempt_applied_rating_check" CHECK ("attempt"."applied_rating" in (${FSRS_RATING_VALUES.join(", ")}))`,
    );
  });
});

describe("Drizzle schema のテーブル/列名", () => {
  it("5 テーブルが specs/03 の物理名で定義されている", () => {
    const names = [srsState, attempt, examSession, examSessionAnswer, questionFlag].map(
      (t) => getTableConfig(t).name,
    );
    expect(names).toEqual([
      "srs_state",
      "attempt",
      "exam_session",
      "exam_session_answer",
      "question_flag",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@/db/schema";
import { inScope, scopeExams, scopeFromRow, studyScopeSchema, validateScope } from "./scope";
import { buildScopeSelect, buildSetScopeUpsert } from "./repo";

// T-exam: 学習スコープ(specs/03 §study_setting、01 FR-10)

describe("学習スコープの値と exam 集合", () => {
  it("ccar-f / ccar-p / both の 3 値のみ", () => {
    expect(studyScopeSchema.options).toEqual(["ccar-f", "ccar-p", "both"]);
    expect(studyScopeSchema.safeParse("ccar-x").success).toBe(false);
  });

  it("scopeExams: both は F と P", () => {
    expect(scopeExams("ccar-f")).toEqual(["ccar-f"]);
    expect(scopeExams("ccar-p")).toEqual(["ccar-p"]);
    expect(scopeExams("both")).toEqual(["ccar-f", "ccar-p"]);
    expect(inScope("ccar-p", "ccar-f")).toBe(false);
    expect(inScope("both", "ccar-p")).toBe(true);
  });

  it("行が無い場合の実効値は ccar-f(S-3 以前と同一)。不正値は fail closed", () => {
    expect(scopeFromRow(undefined)).toBe("ccar-f");
    expect(scopeFromRow({ scope: "both" })).toBe("both");
    expect(() => scopeFromRow({ scope: "ccar-x" })).toThrow();
  });
});

describe("試験日未設定 exam を含むスコープは拒否(fail closed)", () => {
  const dates = { "ccar-f": "2026-09-27", "ccar-p": null } as const;

  it("P の試験日が未設定なら ccar-p と both を拒否し、ccar-f は許可", () => {
    expect(validateScope("ccar-f", dates)).toEqual({ ok: true });
    expect(validateScope("ccar-p", dates)).toEqual({ ok: false, missingExamDates: ["ccar-p"] });
    expect(validateScope("both", dates)).toEqual({ ok: false, missingExamDates: ["ccar-p"] });
  });

  it("既定のコード定数(F / P とも設定済み)では全スコープを許可", () => {
    for (const s of studyScopeSchema.options) expect(validateScope(s)).toEqual({ ok: true });
  });
});

describe("スコープ切替は study_setting の 1 行だけを書く(他テーブルを変えない)", () => {
  const db = drizzle(neon("postgresql://test:test@localhost/test"), { schema });
  const now = new Date("2026-10-01T09:00:00+09:00");

  it("upsert は study_setting への INSERT … ON CONFLICT (id) DO UPDATE のみ", () => {
    const { sql, params } = buildSetScopeUpsert(db, "ccar-p", now).toSQL();
    expect(sql).toMatch(/^insert into "study_setting"/);
    expect(sql).toMatch(/on conflict \("id"\) do update set "scope" = \$\d+, "updated_at" = \$\d+/);
    for (const t of ["srs_state", "attempt", "exam_session", "exam_session_answer", "question_flag"]) {
      expect(sql).not.toContain(`"${t}"`);
    }
    expect(params).toContain("ccar-p");
    expect(params).toContain(1);
  });

  it("読み取りは id = 1 の単一行", () => {
    const { sql } = buildScopeSelect(db).toSQL();
    expect(sql).toMatch(/from "study_setting" where "study_setting"."id" = \$1/);
  });
});

describe("setStudyScope は試験日未設定の exam を含むスコープを書かずに拒否する", () => {
  it("拒否時は DB に触れない", async () => {
    const { setStudyScope } = await import("./repo");
    const db = new Proxy({}, { get: () => { throw new Error("DB に触れてはいけない"); } }) as never;
    await expect(setStudyScope(db, "both", new Date(), { "ccar-f": "2026-09-27", "ccar-p": null })).resolves.toEqual({
      ok: false,
      error: "exam_date_unset",
      exams: ["ccar-p"],
    });
  });
});

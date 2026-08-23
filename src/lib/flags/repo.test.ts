import { describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { buildUpsertOpenFlag } from "./repo";

// D1-6: 同一 rev の再フラグは既存 open 行の update、別 rev は新規行(specs/03 §question_flag)。
// DB に接続せず、組み上がる SQL が partial unique index と一致する ON CONFLICT になることを検証する。

// 接続文字列はダミー(toSQL() しか呼ばないので実際の接続は発生しない)
const db = drizzle(neon("postgresql://test:test@localhost/test"), { schema });

describe("buildUpsertOpenFlag", () => {
  const { sql, params } = buildUpsertOpenFlag(
    db,
    { question_id: "f-d2-q014", question_rev: 3, reason: "wrong", memo: "正解が B ではなく C" },
    new Date("2026-08-23T09:00:00+09:00"),
  ).toSQL();
  const flat = sql.replace(/\s+/g, " ");

  it("question_flag_one_open と同じ (question_id, question_rev) where resolved_at is null を衝突対象にする", () => {
    expect(flat).toContain('insert into "question_flag"');
    expect(flat).toMatch(/on conflict \("question_id","question_rev"\) where "question_flag"\."resolved_at" is null do update set/);
  });

  it("衝突時は reason / memo だけを更新し、id・created_at は付け替えない", () => {
    const setClause = flat.slice(flat.indexOf("do update set"), flat.indexOf(" returning"));
    expect(setClause).toContain('"reason"');
    expect(setClause).toContain('"memo"');
    expect(setClause).not.toContain('"id"');
    expect(setClause).not.toContain('"created_at"');
  });

  it("新規行用に UUID の id と resolved_at=null を持ち、結果を返す", () => {
    expect(flat).toContain("returning");
    const uuid = params.find((p) => typeof p === "string" && /^[0-9a-f-]{36}$/.test(p));
    expect(uuid).toBeDefined();
    expect(params).toContain("f-d2-q014");
    expect(params).toContain(3);
    expect(params).toContain("wrong");
  });
});

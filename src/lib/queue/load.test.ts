import { describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { buildCorrectIdsSelect, buildSrsRowsSelect } from "./load";

// T-queue: キュー生成に使う DB 読み取りの SQL の形(接続はしない。store.test.ts と同じ方針)

const db = drizzle(neon("postgresql://test:test@localhost/test"), { schema });

describe("srs_state 全行読み取り", () => {
  it("srs_state からの select(キュー側で due 判定するため where を付けない)", () => {
    const { sql } = buildSrsRowsSelect(db).toSQL();
    expect(sql).toContain('from "srs_state"');
    expect(sql).not.toContain("where");
  });
});

describe("正解済み question_id 集合", () => {
  it("is_correct = true の attempt から question_id を distinct で読む(coverage 用)", () => {
    const { sql, params } = buildCorrectIdsSelect(db).toSQL();
    expect(sql).toContain("select distinct");
    expect(sql).toContain('"question_id"');
    expect(sql).toContain('from "attempt"');
    expect(sql).toMatch(/where "attempt"\."is_correct" = \$1/);
    expect(params).toEqual([true]);
  });
});

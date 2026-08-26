import { describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { buildCorrectIdsSelect, buildIntroducedBeforeSelect, buildSrsRowsSelect, buildTodayLearnAttemptsSelect } from "./load";

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

describe("消費シグナル用の当日 attempt(D1-5)", () => {
  const todayStart = new Date("2026-08-26T15:00:00Z"); // 8/27 00:00 JST

  it("当日 drill/practice attempt: mode の in-list と answered_at >= 境界", () => {
    const { sql, params } = buildTodayLearnAttemptsSelect(db, todayStart).toSQL();
    expect(sql).toContain('"question_id"');
    expect(sql).toContain('"applied_rating"');
    expect(sql).toContain('"mode"');
    expect(sql).toContain('from "attempt"');
    expect(sql).toMatch(/"attempt"\."mode" in \(\$1, \$2\)/);
    expect(sql).toMatch(/"attempt"\."answered_at" >= \$3/);
    expect(params).toEqual(["drill", "practice", todayStart.toISOString()]);
  });

  it("当日より前の導入済み question: applied_rating 非 null かつ answered_at < 境界を distinct で", () => {
    const { sql, params } = buildIntroducedBeforeSelect(db, todayStart).toSQL();
    expect(sql).toContain("select distinct");
    expect(sql).toContain('"question_id"');
    expect(sql).toMatch(/"attempt"\."applied_rating" is not null/);
    expect(sql).toMatch(/"attempt"\."answered_at" < \$1/);
    expect(params).toEqual([todayStart.toISOString()]);
  });
});

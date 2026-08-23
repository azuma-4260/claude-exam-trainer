import { describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { buildAttemptInsert, buildSrsUpsert } from "./store";

// T-write: 原子的書込に使う SQL の形(specs/03 §書込プロトコル 5、禁止パターン)。接続はしない。

const db = drizzle(neon("postgresql://test:test@localhost/test"), { schema });
const NOW = new Date("2026-08-27T07:30:00+09:00");

describe("attempt INSERT", () => {
  it("ON CONFLICT を持たない素の INSERT(PK 競合で batch 全体を rollback させる)", () => {
    const { sql } = buildAttemptInsert(db, {
      attemptId: "11111111-1111-4111-8111-111111111111", questionId: "f-d2-q001", questionRev: 1, exam: "ccar-f", mode: "drill",
      sessionId: null, appliedRating: 3, isCorrect: true, chosen: ["B"], elapsedMs: 100, answeredAt: NOW,
    }).toSQL();
    expect(sql).toContain('insert into "attempt"');
    expect(sql).not.toContain("on conflict");
  });
});

describe("srs_state upsert", () => {
  it("question_id 主キーで衝突したら全 FSRS 列を置き換える(lossless)", () => {
    const { sql } = buildSrsUpsert(db, {
      questionId: "f-d2-q001", exam: "ccar-f", dueAt: NOW, stability: 1, difficulty: 5, elapsedDays: 0, scheduledDays: 0,
      reps: 1, lapses: 0, learningSteps: 1, state: 1, lastReviewAt: NOW,
    }).toSQL();
    expect(sql).toMatch(/on conflict \("question_id"\) do update set/);
    for (const col of ["due_at", "stability", "difficulty", "elapsed_days", "scheduled_days", "reps", "lapses", "learning_steps", "state", "last_review_at", "updated_at"]) {
      expect(sql.slice(sql.indexOf("do update set"))).toContain(`"${col}"`);
    }
  });
});

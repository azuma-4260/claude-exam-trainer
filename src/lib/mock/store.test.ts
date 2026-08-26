import { describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { PgDialect } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ExamSessionRow } from "@/db/schema";
import {
  buildAbandon,
  buildPatchAnswer,
  buildSavePosition,
  buildStartAnswersInsert,
  buildStartSessionInsert,
  buildSubmitClaim,
  buildSubmitFinalize,
} from "./store";

// T-mock/D3-1: 条件付き更新・排他・提出 2 文の SQL の形(specs/03 §exam_session, §Mock の attempt 生成)。接続はしない。

const db = drizzle(neon("postgresql://test:test@localhost/test"), { schema });
const dialect = new PgDialect();
const compile = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => {
  const c = dialect.sqlToQuery(q);
  return { text: c.sql.replace(/\s+/g, " "), params: c.params };
};
const NOW = new Date("2026-08-27T12:00:00+09:00");
const SID = "11111111-1111-4111-8111-111111111111";

describe("保存系の条件付き UPDATE(terminal 後は 0 行で書き換わらない)", () => {
  it("回答保存は親 session 行を for update でロックして提出と直列化する(単文で原子的)", () => {
    const { sql } = buildPatchAnswer(db, SID, "f-d1-q001", { chosen: ["B"] }, NOW).toSQL();
    expect(sql).toContain('update "exam_session_answer" set');
    expect(sql).toContain('"chosen"');
    expect(sql).toContain('"answer_updated_at"');
    expect(sql).toMatch(/in \(select "id" from "exam_session"/);
    expect(sql).toContain("for update");
    expect(sql).toContain('"exam_session"."status" = $');
  });
  it("フラグのみの更新は answer_updated_at を SET に含めない(03: 回答変更時のみ更新)", () => {
    const { sql } = buildPatchAnswer(db, SID, "f-d1-q001", { flagged: true }, NOW).toSQL();
    expect(sql).toContain('"flagged"');
    expect(sql).not.toContain('"answer_updated_at"');
    expect(sql).not.toContain('"chosen"');
  });
  it("current_index / abandon も in_progress 条件付き(exam_session 行の UPDATE 自体が提出と直列化する)", () => {
    for (const q of [buildSavePosition(db, SID, 3), buildAbandon(db, SID, NOW)]) {
      const { sql } = q.toSQL();
      expect(sql).toContain('update "exam_session" set');
      expect(sql).toContain('"exam_session"."status" = $');
    }
    expect(buildAbandon(db, SID, NOW).toSQL().params).toContain("abandoned");
  });
});

describe("開始の 2 文(advisory lock 下で「進行中 1 件」チェックと生成を原子化)", () => {
  const session: ExamSessionRow = {
    id: SID,
    exam: "ccar-f",
    kind: "full",
    formId: "form-a",
    domainId: null,
    questionIds: ["f-d1-q001", "f-d1-q002"],
    status: "in_progress",
    submissionReason: null,
    startedAt: NOW,
    deadlineAt: new Date(NOW.getTime() + 120 * 60_000),
    currentIndex: 0,
    finishedAt: null,
    scoreRaw: null,
  };
  it("session INSERT は進行中ゼロのときだけ(not exists)", () => {
    const { text, params } = compile(buildStartSessionInsert(session));
    expect(text).toContain("insert into exam_session");
    expect(text).toContain("where not exists (select 1 from exam_session where status = 'in_progress')");
    expect(text).toContain("returning id");
    expect(params).toContain(SID);
    expect(params.some((p) => typeof p === "string" && p.includes("f-d1-q002"))).toBe(true);
  });
  it("answer 一括 INSERT は自 session が作られたときだけ(exists)、rev snapshot を jsonb で渡す", () => {
    const { text, params } = compile(buildStartAnswersInsert(SID, [
      { sessionId: SID, questionId: "f-d1-q001", questionRev: 3, chosen: null, flagged: false, answerUpdatedAt: null, updatedAt: NOW },
    ]));
    expect(text).toContain("insert into exam_session_answer");
    expect(text).toContain(`where exists (select 1 from exam_session where id = $`);
    const rows = params.find((p) => typeof p === "string" && p.includes("question_rev"));
    expect(rows).toContain('"question_rev":3');
  });
});

describe("提出の 2 文(claim → 新スナップショットで採点・attempt 生成)", () => {
  it("第 1 文 claim は in_progress からの条件付き terminal 更新のみ(attempt を含まない)", () => {
    const { text, params } = compile(buildSubmitClaim(SID, "timeout", NOW));
    expect(text).toContain("update exam_session");
    expect(text).toContain("status = 'in_progress'");
    expect(text).toContain("status = 'submitted'");
    expect(text).not.toContain("attempt");
    expect(params).toContain("timeout");
  });
  const { text, params } = compile(
    buildSubmitFinalize(SID, NOW, [
      { questionId: "f-d1-q001", correct: ["B"] },
      { questionId: "f-d1-q002", correct: null },
    ]),
  );
  it("第 2 文は claim marker(finished_at 一致)で守られ、exam_session_answer から attempt を導出する", () => {
    expect(text).toContain("status = 'submitted' and finished_at = $");
    expect(text).toContain("insert into attempt");
    expect(text).toContain("from exam_session_answer a");
    expect(text).toContain("gen_random_uuid()");
    expect(text).toMatch(/'mock'/);
    expect(text).toMatch(/null, coalesce\(g\.is_correct, false\)/);
  });
  it("answered_at: 最終状態が未回答(chosen null)なら finished_at、回答済みなら answer_updated_at", () => {
    expect(text).toContain("case when g.chosen is null then c.finished_at");
    expect(text).toContain("coalesce(g.answer_updated_at, c.finished_at)");
  });
  it("score_raw は同一文内の集合一致採点から導出し、正答は jsonb パラメータで渡す", () => {
    expect(text).toContain("set score_raw = (select count(*)::int from graded where is_correct)");
    expect(text).toContain("array_agg(x order by x)");
    const keyParam = params.find((p) => typeof p === "string" && p.includes("question_id"));
    expect(keyParam).toContain('"correct":["B"]');
    expect(keyParam).toContain('"correct":null');
  });
});

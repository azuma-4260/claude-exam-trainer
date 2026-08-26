import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { examSession, examSessionAnswer, type ExamSessionAnswerRow, type ExamSessionRow, type SubmissionReason } from "@/db/schema";
import type { AnswerKeyEntry, AnswerPatch, MockStore } from "./lifecycle";

/**
 * MockStore の Drizzle / neon-http 実装(specs/06 §接続方式、03 §exam_session)。
 *
 * 並行性の設計(いずれも neon-http の non-interactive transaction = db.batch / 単文で完結):
 * - 開始: advisory xact lock で「進行中は全 kind で 1 件」のチェックと INSERT を直列化し、
 *   session + 全 answer 行を同一トランザクションで一括生成(部分生成なし)
 * - 回答保存: 親 session 行を `for update` でロックする条件付き単文 UPDATE。
 *   提出(claim)と必ず直列化され、提出後の保存は 0 行になる
 * - 提出: [claim UPDATE] → [採点 + attempt 一括 INSERT + score_raw 確定] の 2 文を
 *   1 トランザクションで実行。第 2 文は claim 後の新しいスナップショットで
 *   exam_session_answer を読むため、claim 前に commit された保存は必ず採点に含まれ、
 *   claim 以降の保存は行ロックで排除される(specs/03 §Mock の attempt 生成: final answer から生成)。
 *   claim 0 行なら第 2 文は marker(finished_at)不一致で no-op になり副作用を残さない
 */

/** 進行中 session の行ロックつき参照(保存系 UPDATE の WHERE で使い、提出と直列化する) */
const lockInProgress = (db: Db, sessionId: string) =>
  db
    .select({ id: examSession.id })
    .from(examSession)
    .where(and(eq(examSession.id, sessionId), eq(examSession.status, "in_progress")))
    .for("update");

export function buildPatchAnswer(db: Db, sessionId: string, questionId: string, patch: AnswerPatch, now: Date) {
  const set: Partial<ExamSessionAnswerRow> = { updatedAt: now };
  if (patch.chosen !== undefined) {
    set.chosen = patch.chosen;
    set.answerUpdatedAt = now; // 回答変更時のみ更新(03)。フラグのみの操作では動かさない
  }
  if (patch.flagged !== undefined) set.flagged = patch.flagged;
  return db
    .update(examSessionAnswer)
    .set(set)
    .where(
      and(
        eq(examSessionAnswer.sessionId, sessionId),
        eq(examSessionAnswer.questionId, questionId),
        inArray(examSessionAnswer.sessionId, lockInProgress(db, sessionId)),
      ),
    )
    .returning({ questionId: examSessionAnswer.questionId });
}

export function buildSavePosition(db: Db, sessionId: string, currentIndex: number) {
  return db
    .update(examSession)
    .set({ currentIndex })
    .where(and(eq(examSession.id, sessionId), eq(examSession.status, "in_progress")))
    .returning({ id: examSession.id });
}

export function buildAbandon(db: Db, sessionId: string, finishedAt: Date) {
  return db
    .update(examSession)
    .set({ status: "abandoned", finishedAt })
    .where(and(eq(examSession.id, sessionId), eq(examSession.status, "in_progress")))
    .returning({ id: examSession.id });
}

/** 開始の排他 advisory lock キー(トランザクション終了で自動解放) */
export const START_LOCK_KEY = "exam_session_start";

/** 開始 第 1 文: 進行中が 1 件も無いときだけ session を INSERT(advisory lock 下で評価) */
export function buildStartSessionInsert(sessionRow: ExamSessionRow): SQL {
  const s = sessionRow;
  const ids = JSON.stringify(s.questionIds);
  return sql`
    insert into exam_session (id, exam, kind, form_id, domain_id, question_ids, status,
                              submission_reason, started_at, deadline_at, current_index, finished_at, score_raw)
    select ${s.id}, ${s.exam}, ${s.kind}, ${s.formId}, ${s.domainId},
           (select coalesce(array_agg(x order by ord), array[]::text[])
              from jsonb_array_elements_text(${ids}::jsonb) with ordinality t(x, ord)),
           'in_progress', null, ${s.startedAt}, ${s.deadlineAt}, ${s.currentIndex}, null, null
    where not exists (select 1 from exam_session where status = 'in_progress')
    returning id
  `;
}

/** 開始 第 2 文: 自 session が作られたときだけ全 answer 行を一括 INSERT */
export function buildStartAnswersInsert(sessionId: string, answers: readonly ExamSessionAnswerRow[]): SQL {
  const rows = JSON.stringify(
    answers.map((a) => ({ question_id: a.questionId, question_rev: a.questionRev })),
  );
  return sql`
    insert into exam_session_answer (session_id, question_id, question_rev, chosen, flagged, answer_updated_at, updated_at)
    select ${sessionId}, e->>'question_id', (e->>'question_rev')::int, null, false, null, now()
    from jsonb_array_elements(${rows}::jsonb) e
    where exists (select 1 from exam_session where id = ${sessionId})
  `;
}

/** 提出 第 1 文: terminal の獲得(claim)。0 行なら先着あり */
export function buildSubmitClaim(sessionId: string, reason: SubmissionReason, finishedAt: Date): SQL {
  return sql`
    update exam_session
       set status = 'submitted', submission_reason = ${reason}, finished_at = ${finishedAt}
     where id = ${sessionId} and status = 'in_progress'
     returning id
  `;
}

/**
 * 提出 第 2 文: claim 成功(finished_at が自分の marker と一致)のときだけ、
 * この文の新しいスナップショットで exam_session_answer を読み、採点 → attempt 一括 INSERT →
 * score_raw 確定を行う。意味論は lifecycle.gradeMockAnswers と同一。
 */
export function buildSubmitFinalize(sessionId: string, finishedAt: Date, key: readonly AnswerKeyEntry[]): SQL {
  const keyJson = JSON.stringify(key.map((k) => ({ question_id: k.questionId, correct: k.correct })));
  return sql`
    with claimed as (
      select id, exam, finished_at from exam_session
      where id = ${sessionId} and status = 'submitted' and finished_at = ${finishedAt}
    ),
    key as (
      select e->>'question_id' as question_id,
             case when jsonb_typeof(e->'correct') = 'array'
                  then (select coalesce(array_agg(x order by x), array[]::text[]) from jsonb_array_elements_text(e->'correct') x)
                  else null end as correct
      from jsonb_array_elements(${keyJson}::jsonb) e
    ),
    graded as (
      select a.question_id, a.question_rev, a.chosen, a.answer_updated_at,
             (a.chosen is not null and k.correct is not null and
              (select coalesce(array_agg(x order by x), array[]::text[]) from unnest(a.chosen) x) = k.correct) as is_correct
      from exam_session_answer a
      left join key k on k.question_id = a.question_id
      where a.session_id = ${sessionId}
    ),
    ins as (
      insert into attempt (attempt_id, question_id, question_rev, exam, mode, session_id,
                           applied_rating, is_correct, chosen, elapsed_ms, answered_at)
      select gen_random_uuid(), g.question_id, g.question_rev, c.exam, 'mock', c.id,
             null, coalesce(g.is_correct, false), g.chosen, null,
             case when g.chosen is null then c.finished_at
                  else coalesce(g.answer_updated_at, c.finished_at) end
      from graded g cross join claimed c
      returning question_id
    )
    update exam_session
       set score_raw = (select count(*)::int from graded where is_correct)
     where id = ${sessionId} and status = 'submitted' and finished_at = ${finishedAt}
     returning id
  `;
}

const PG_UNIQUE_VIOLATION = "23505";

/**
 * 並行 submit が同一ミリ秒の finished_at を持つと、後着(claim 0 行)側の finalize が
 * marker 一致で attempt INSERT を試み unique 違反になる。仕様の最終防衛線
 * (03: 冪等性は attempt_mock_session_question_uq で保証)どおり、この違反は
 * 「claim に負けた」として扱い batch 全体 rollback + false を返す(呼び出し側が既提出 200 にする)
 */
function isMockAttemptConflict(e: unknown): boolean {
  const err = e as { code?: string; constraint?: string; sourceError?: { code?: string; constraint?: string } };
  const code = err?.code ?? err?.sourceError?.code;
  const constraint = err?.constraint ?? err?.sourceError?.constraint;
  return code === PG_UNIQUE_VIOLATION && (constraint === undefined || constraint === "attempt_mock_session_question_uq");
}

export function createMockStore(db: Db): MockStore {
  return {
    async findInProgress() {
      const rows = await db
        .select()
        .from(examSession)
        .where(eq(examSession.status, "in_progress"))
        .orderBy(desc(examSession.startedAt))
        .limit(1);
      return rows[0] ?? null;
    },
    async findSession(id) {
      const rows = await db.select().from(examSession).where(eq(examSession.id, id)).limit(1);
      return rows[0] ?? null;
    },
    async listAnswers(sessionId) {
      return db.select().from(examSessionAnswer).where(eq(examSessionAnswer.sessionId, sessionId));
    },
    async createSession(session: ExamSessionRow, answers: ExamSessionAnswerRow[]) {
      const [, inserted] = await db.batch([
        db.execute(sql`select pg_advisory_xact_lock(hashtext(${START_LOCK_KEY}))`),
        db.execute(buildStartSessionInsert(session)),
        db.execute(buildStartAnswersInsert(session.id, answers)),
      ]);
      return inserted.rows.length > 0;
    },
    async patchAnswer(sessionId, questionId, patch, now) {
      return (await buildPatchAnswer(db, sessionId, questionId, patch, now)).length > 0;
    },
    async savePosition(sessionId, currentIndex) {
      return (await buildSavePosition(db, sessionId, currentIndex)).length > 0;
    },
    async submit(sessionId, reason, finishedAt, key) {
      try {
        const [claimed] = await db.batch([
          db.execute(buildSubmitClaim(sessionId, reason, finishedAt)),
          db.execute(buildSubmitFinalize(sessionId, finishedAt, key)),
        ]);
        return claimed.rows.length > 0;
      } catch (e) {
        if (isMockAttemptConflict(e)) return false;
        throw e;
      }
    },
    async abandon(sessionId, finishedAt) {
      return (await buildAbandon(db, sessionId, finishedAt)).length > 0;
    },
  };
}

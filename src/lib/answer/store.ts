import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attempt, examSession, questionFlag, srsState, type AttemptRow } from "@/db/schema";
import { isNull } from "drizzle-orm";
import type { PoolContext } from "@/lib/bank/pool";
import type { MockForm } from "@/lib/bank/schema";
import type { SrsStateUpsert } from "@/lib/srs/card-row";
import { AttemptPkConflictError, type AnswerStore } from "./process";

/**
 * AnswerStore の Drizzle / neon-http 実装(specs/06 §接続方式)。
 * commit は db.batch()(Neon HTTP の non-interactive transaction)で attempt INSERT + srs_state upsert を
 * 1 トランザクションにする。attempt は素の INSERT(ON CONFLICT を付けない)なので PK 競合で
 * batch 全体が rollback され、srs_state は更新されない(03 の禁止パターンを構造的に避ける)。
 */

const PG_UNIQUE_VIOLATION = "23505";

function isAttemptPkConflict(e: unknown): boolean {
  const err = e as { code?: string; constraint?: string; sourceError?: { code?: string; constraint?: string } };
  const code = err?.code ?? err?.sourceError?.code;
  const constraint = err?.constraint ?? err?.sourceError?.constraint;
  return code === PG_UNIQUE_VIOLATION && (constraint === undefined || constraint === "attempt_pkey");
}

export function buildAttemptInsert(db: Db, row: AttemptRow) {
  return db.insert(attempt).values(row);
}

export function buildSrsUpsert(db: Db, row: SrsStateUpsert) {
  const { questionId: _q, ...rest } = row;
  void _q;
  return db
    .insert(srsState)
    .values({ ...row, updatedAt: new Date() })
    .onConflictDoUpdate({ target: srsState.questionId, set: { ...rest, updatedAt: new Date() } });
}

export function createAnswerStore(db: Db): AnswerStore {
  return {
    async findAttempt(attemptId) {
      const rows = await db.select().from(attempt).where(eq(attempt.attemptId, attemptId)).limit(1);
      return rows[0] ?? null;
    },
    async findSrsState(questionId) {
      const rows = await db.select().from(srsState).where(eq(srsState.questionId, questionId)).limit(1);
      if (!rows[0]) return null;
      const { updatedAt: _u, ...row } = rows[0];
      void _u;
      return row;
    },
    async commit(attemptRow, srs) {
      try {
        if (srs) await db.batch([buildAttemptInsert(db, attemptRow), buildSrsUpsert(db, srs)]);
        else await db.batch([buildAttemptInsert(db, attemptRow)]);
      } catch (e) {
        if (isAttemptPkConflict(e)) throw new AttemptPkConflictError();
        throw e;
      }
    },
  };
}

/** 出題判定に必要な DB 行を読む(forms はバンク側から渡す) */
export async function loadPoolContext(db: Db, forms: readonly MockForm[]): Promise<PoolContext> {
  const [sessions, flags] = await Promise.all([
    db
      .select({ exam: examSession.exam, formId: examSession.formId, kind: examSession.kind, status: examSession.status })
      .from(examSession)
      .where(eq(examSession.status, "submitted")),
    db
      .select({ questionId: questionFlag.questionId, questionRev: questionFlag.questionRev, resolvedAt: questionFlag.resolvedAt })
      .from(questionFlag)
      .where(isNull(questionFlag.resolvedAt)),
  ]);
  return { forms, sessions, flags };
}

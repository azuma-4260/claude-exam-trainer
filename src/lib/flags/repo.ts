import { and, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Db } from "@/db/client";
import { questionFlag, type QuestionFlagRow } from "@/db/schema";
import type { OpenFlag } from "@/lib/bank/pool";
import type { FlagRequest } from "./schema";

/**
 * question_flag の読み書き(specs/03 §question_flag)。
 * - 未解決(resolved_at is null)は同一 (question_id, question_rev) につき 1 行
 *   (partial unique index question_flag_one_open)
 * - 同一 rev の再フラグは既存 open 行の update(reason / memo)。別 rev は新規行
 * - 「現行 rev のフラグだけを出題除外する」判定は src/lib/bank/pool.ts の evaluatePool が
 *   行うので、ここは open 行をそのまま供給するだけにして判定を重複させない
 */

/** 出題判定(PoolContext.flags)に渡す形は pool.ts の OpenFlag をそのまま使う */
export type { OpenFlag };

/** INSERT ... ON CONFLICT(partial unique)DO UPDATE を 1 文で組む(テストで SQL を検証する) */
export function buildUpsertOpenFlag(db: Db, input: FlagRequest, now: Date) {
  return db
    .insert(questionFlag)
    .values({
      id: randomUUID(),
      questionId: input.question_id,
      questionRev: input.question_rev,
      reason: input.reason,
      memo: input.memo ?? null,
      createdAt: now,
      resolvedAt: null,
    })
    .onConflictDoUpdate({
      target: [questionFlag.questionId, questionFlag.questionRev],
      targetWhere: sql`${questionFlag.resolvedAt} is null`,
      set: { reason: input.reason, memo: input.memo ?? null },
    })
    .returning();
}

export async function upsertOpenFlag(db: Db, input: FlagRequest, now: Date = new Date()): Promise<QuestionFlagRow> {
  const rows = await buildUpsertOpenFlag(db, input, now);
  const row = rows[0];
  if (!row) throw new Error("question_flag の upsert が行を返さなかった");
  return row;
}

/** 特定 (question_id, question_rev) の open フラグ(メニューの「フラグ済み」表示用) */
export async function findOpenFlag(db: Db, questionId: string, questionRev: number): Promise<QuestionFlagRow | null> {
  const rows = await db
    .select()
    .from(questionFlag)
    .where(
      and(
        eq(questionFlag.questionId, questionId),
        eq(questionFlag.questionRev, questionRev),
        isNull(questionFlag.resolvedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** 全 open フラグ。旧 rev の superseded 判定は evaluatePool 側(現行 rev 一致のみ除外) */
export async function loadOpenFlags(db: Db): Promise<OpenFlag[]> {
  return db
    .select({
      questionId: questionFlag.questionId,
      questionRev: questionFlag.questionRev,
      resolvedAt: questionFlag.resolvedAt,
    })
    .from(questionFlag)
    .where(isNull(questionFlag.resolvedAt));
}

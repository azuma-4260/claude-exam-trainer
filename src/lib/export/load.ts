import { isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  attempt,
  examSession,
  examSessionAnswer,
  questionFlag,
  srsState,
  studySetting,
  type QuestionFlagRow,
} from "@/db/schema";
import type { Bank } from "@/lib/bank/load";
import type { Question } from "@/lib/bank/schema";

/** 意味変更で retired になった旧 ID は「現行問題」に含めない(specs/07 Step 6)。 */
export function activeQuestionRevisions(
  questions: readonly Pick<Question, "id" | "rev" | "status">[],
): ReadonlyMap<string, number> {
  return new Map(questions.filter((q) => q.status === "active").map((q) => [q.id, q.rev]));
}

/** 旧 rev と解決済みを superseded として除外する(specs/03 §question_flag)。 */
export function filterCurrentOpenFlags(
  rows: readonly QuestionFlagRow[],
  currentRevisions: ReadonlyMap<string, number>,
): QuestionFlagRow[] {
  return rows.filter(
    (row) => row.resolvedAt === null && currentRevisions.get(row.questionId) === row.questionRev,
  );
}

export async function listCurrentOpenFlags(db: Db, bank: Bank): Promise<QuestionFlagRow[]> {
  const open = await db.select().from(questionFlag).where(isNull(questionFlag.resolvedAt));
  return filterCurrentOpenFlags(open, activeQuestionRevisions(bank.questions));
}

/**
 * /api/export の全体 export(全 exam)。5 テーブル + study_setting。question_flag は現行 rev の未解決行だけ。
 * bank は全 exam の和集合を渡す(スコープ非依存。01 FR-10)。5 テーブルの select 形は D6-1 以前と同一に保つ
 * (deploy 前後の比較のため)。exam 別の絞り込みは filterExportByExam。
 */
export async function loadExportData(db: Db, bank: Bank) {
  const [srsRows, attempts, sessions, answers, flags, settings] = await Promise.all([
    db.select().from(srsState),
    db.select().from(attempt),
    db.select().from(examSession),
    db.select().from(examSessionAnswer),
    listCurrentOpenFlags(db, bank),
    db.select().from(studySetting),
  ]);
  return {
    srs_state: srsRows,
    attempt: attempts,
    exam_session: sessions,
    exam_session_answer: answers,
    question_flag: flags,
    study_setting: settings,
  };
}

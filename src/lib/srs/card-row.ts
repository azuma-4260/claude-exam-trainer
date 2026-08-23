import { State, type Card } from "ts-fsrs";
import { FSRS_STATE_VALUES, type SrsStateRow } from "@/db/schema";
import type { Exam } from "@/lib/bank/schema";

/**
 * ts-fsrs Card と srs_state 行の lossless 相互変換(specs/03 §srs_state)。
 * updated_at は DB 側で管理するため書込値には含めない。
 */

export type SrsStateUpsert = Omit<SrsStateRow, "updatedAt">;

export function cardToRow(questionId: string, exam: Exam, card: Card): SrsStateUpsert {
  return {
    questionId,
    exam,
    dueAt: new Date(card.due.getTime()),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    learningSteps: card.learning_steps,
    state: card.state,
    lastReviewAt: card.last_review ? new Date(card.last_review.getTime()) : null,
  };
}

export function rowToCard(row: SrsStateUpsert): Card {
  if (!(FSRS_STATE_VALUES as readonly number[]).includes(row.state)) {
    throw new Error(`srs_state.state が ts-fsrs State enum 値ではない: ${row.state}`);
  }
  const card: Card = {
    due: new Date(row.dueAt.getTime()),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    reps: row.reps,
    lapses: row.lapses,
    learning_steps: row.learningSteps,
    state: row.state as State,
  };
  if (row.lastReviewAt) {
    card.last_review = new Date(row.lastReviewAt.getTime());
  }
  return card;
}

import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { Rating, State } from "ts-fsrs";
import { EXAMS, MODES } from "../lib/bank/schema";

/**
 * 進捗 DB スキーマの単一ソース(specs/03 §2)。
 * mode / exam / reason / status / kind は CHECK で TypeScript union と一致させる。
 * 数値は double precision、日時は timestamptz。
 */

export const SESSION_KINDS = ["full", "domain_mini", "half"] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export const SESSION_STATUSES = ["in_progress", "submitted", "abandoned"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SUBMISSION_REASONS = ["manual", "timeout"] as const;
export type SubmissionReason = (typeof SUBMISSION_REASONS)[number];

export const FLAG_REASONS = ["ambiguous", "wrong", "outdated"] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];

/** ts-fsrs 5.4.1 State enum の許容値(New=0 / Learning=1 / Review=2 / Relearning=3) */
export const FSRS_STATE_VALUES = [State.New, State.Learning, State.Review, State.Relearning] as const;

/** applied_rating に入りうる値(Again=1 / Hard=2 / Good=3 / Easy=4。Manual=0 は渡さない) */
export const FSRS_RATING_VALUES = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;

/** CHECK 制約は DDL に直接埋め込む必要があるため、値をリテラルとして展開する */
const inTextList = (column: AnyPgColumn, values: readonly string[]): SQL =>
  sql`${column} in (${sql.raw(values.map((v) => `'${v}'`).join(", "))})`;

const inNumberList = (column: AnyPgColumn, values: readonly number[]): SQL =>
  sql`${column} in (${sql.raw(values.join(", "))})`;

/** srs_state — ts-fsrs 5.4.1 Card の lossless 永続化。初回 rating commit 時に生成 */
export const srsState = pgTable(
  "srs_state",
  {
    questionId: text("question_id").primaryKey(),
    exam: text("exam").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    stability: doublePrecision("stability").notNull(),
    difficulty: doublePrecision("difficulty").notNull(),
    elapsedDays: integer("elapsed_days").notNull(),
    scheduledDays: integer("scheduled_days").notNull(),
    reps: integer("reps").notNull(),
    lapses: integer("lapses").notNull(),
    learningSteps: integer("learning_steps").notNull(),
    state: smallint("state").notNull(),
    lastReviewAt: timestamp("last_review_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("srs_state_exam_check", inTextList(t.exam, EXAMS)),
    check("srs_state_state_check", inNumberList(t.state, FSRS_STATE_VALUES)),
  ],
);

/** attempt — 追記専用ログ。mock の冪等性は partial unique index で保証 */
export const attempt = pgTable(
  "attempt",
  {
    attemptId: uuid("attempt_id").primaryKey(),
    questionId: text("question_id").notNull(),
    questionRev: integer("question_rev").notNull(),
    exam: text("exam").notNull(),
    mode: text("mode").notNull(),
    sessionId: uuid("session_id"),
    appliedRating: smallint("applied_rating"),
    isCorrect: boolean("is_correct"),
    chosen: text("chosen").array(),
    elapsedMs: integer("elapsed_ms"),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("attempt_mock_session_question_uq")
      .on(t.sessionId, t.questionId)
      .where(sql`${t.mode} = 'mock'`),
    check("attempt_exam_check", inTextList(t.exam, EXAMS)),
    check("attempt_mode_check", inTextList(t.mode, MODES)),
    check("attempt_applied_rating_check", inNumberList(t.appliedRating, FSRS_RATING_VALUES)),
  ],
);

export const examSession = pgTable(
  "exam_session",
  {
    id: uuid("id").primaryKey(),
    exam: text("exam").notNull(),
    kind: text("kind").notNull(),
    formId: text("form_id"),
    domainId: text("domain_id"),
    questionIds: text("question_ids").array().notNull(),
    status: text("status").notNull(),
    submissionReason: text("submission_reason"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    currentIndex: integer("current_index").notNull().default(0),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    scoreRaw: integer("score_raw"),
  },
  (t) => [
    check("exam_session_exam_check", inTextList(t.exam, EXAMS)),
    check("exam_session_kind_check", inTextList(t.kind, SESSION_KINDS)),
    check("exam_session_status_check", inTextList(t.status, SESSION_STATUSES)),
    check("exam_session_submission_reason_check", inTextList(t.submissionReason, SUBMISSION_REASONS)),
  ],
);

/** 模試中の回答状態。セッション開始時に全問題分の行を一括生成し question_rev を snapshot */
export const examSessionAnswer = pgTable(
  "exam_session_answer",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => examSession.id),
    questionId: text("question_id").notNull(),
    questionRev: integer("question_rev").notNull(),
    chosen: text("chosen").array(),
    flagged: boolean("flagged").notNull().default(false),
    answerUpdatedAt: timestamp("answer_updated_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.questionId] })],
);

/** question_flag — 未解決(resolved_at is null)は同一 (question_id, rev) につき 1 行 */
export const questionFlag = pgTable(
  "question_flag",
  {
    id: uuid("id").primaryKey(),
    questionId: text("question_id").notNull(),
    questionRev: integer("question_rev").notNull(),
    reason: text("reason").notNull(),
    memo: text("memo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("question_flag_one_open")
      .on(t.questionId, t.questionRev)
      .where(sql`${t.resolvedAt} is null`),
    check("question_flag_reason_check", inTextList(t.reason, FLAG_REASONS)),
  ],
);

export type SrsStateRow = typeof srsState.$inferSelect;
export type AttemptRow = typeof attempt.$inferSelect;
export type ExamSessionRow = typeof examSession.$inferSelect;
export type ExamSessionAnswerRow = typeof examSessionAnswer.$inferSelect;
export type QuestionFlagRow = typeof questionFlag.$inferSelect;

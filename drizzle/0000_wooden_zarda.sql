CREATE TABLE "attempt" (
	"attempt_id" uuid PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"question_rev" integer NOT NULL,
	"exam" text NOT NULL,
	"mode" text NOT NULL,
	"session_id" uuid,
	"applied_rating" smallint,
	"is_correct" boolean,
	"chosen" text[],
	"elapsed_ms" integer,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_exam_check" CHECK ("attempt"."exam" in ('ccar-f', 'ccar-p')),
	CONSTRAINT "attempt_mode_check" CHECK ("attempt"."mode" in ('drill', 'practice', 'mock')),
	CONSTRAINT "attempt_applied_rating_check" CHECK ("attempt"."applied_rating" in (1, 2, 3, 4))
);
--> statement-breakpoint
CREATE TABLE "exam_session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"exam" text NOT NULL,
	"kind" text NOT NULL,
	"form_id" text,
	"domain_id" text,
	"question_ids" text[] NOT NULL,
	"status" text NOT NULL,
	"submission_reason" text,
	"started_at" timestamp with time zone NOT NULL,
	"deadline_at" timestamp with time zone,
	"current_index" integer DEFAULT 0 NOT NULL,
	"finished_at" timestamp with time zone,
	"score_raw" integer,
	CONSTRAINT "exam_session_exam_check" CHECK ("exam_session"."exam" in ('ccar-f', 'ccar-p')),
	CONSTRAINT "exam_session_kind_check" CHECK ("exam_session"."kind" in ('full', 'domain_mini', 'half')),
	CONSTRAINT "exam_session_status_check" CHECK ("exam_session"."status" in ('in_progress', 'submitted', 'abandoned')),
	CONSTRAINT "exam_session_submission_reason_check" CHECK ("exam_session"."submission_reason" in ('manual', 'timeout'))
);
--> statement-breakpoint
CREATE TABLE "exam_session_answer" (
	"session_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"question_rev" integer NOT NULL,
	"chosen" text[],
	"flagged" boolean DEFAULT false NOT NULL,
	"answer_updated_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "exam_session_answer_session_id_question_id_pk" PRIMARY KEY("session_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "question_flag" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"question_rev" integer NOT NULL,
	"reason" text NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "question_flag_reason_check" CHECK ("question_flag"."reason" in ('ambiguous', 'wrong', 'outdated'))
);
--> statement-breakpoint
CREATE TABLE "srs_state" (
	"question_id" text PRIMARY KEY NOT NULL,
	"exam" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"stability" double precision NOT NULL,
	"difficulty" double precision NOT NULL,
	"elapsed_days" integer NOT NULL,
	"scheduled_days" integer NOT NULL,
	"reps" integer NOT NULL,
	"lapses" integer NOT NULL,
	"learning_steps" integer NOT NULL,
	"state" smallint NOT NULL,
	"last_review_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "srs_state_exam_check" CHECK ("srs_state"."exam" in ('ccar-f', 'ccar-p')),
	CONSTRAINT "srs_state_state_check" CHECK ("srs_state"."state" in (0, 1, 2, 3))
);
--> statement-breakpoint
ALTER TABLE "exam_session_answer" ADD CONSTRAINT "exam_session_answer_session_id_exam_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."exam_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_mock_session_question_uq" ON "attempt" USING btree ("session_id","question_id") WHERE "attempt"."mode" = 'mock';--> statement-breakpoint
CREATE UNIQUE INDEX "question_flag_one_open" ON "question_flag" USING btree ("question_id","question_rev") WHERE "question_flag"."resolved_at" is null;
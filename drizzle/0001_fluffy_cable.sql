CREATE TABLE "study_setting" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"scope" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_setting_id_check" CHECK ("study_setting"."id" = 1)
);

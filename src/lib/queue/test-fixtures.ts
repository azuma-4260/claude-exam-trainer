import { mockFormSchema, questionSchema, syllabusFileSchema, type MockForm, type Question, type Syllabus } from "@/lib/bank/schema";
import type { PoolContext } from "@/lib/bank/pool";
import type { SrsStateUpsert } from "@/lib/srs/card-row";

/**
 * queue テスト共有 fixture(T-queue)。
 * content/ 実データに依存せず、schema.parse を通した仮バンクで組む(pool.test.ts と同じ方針)。
 */

/** 試験日 2026-09-27 の 34 日前(daysLeft - buffer = 27) */
export const NOW = new Date("2026-08-24T12:00:00+09:00");

/** id から domain(f-dN)を取り出す */
const domainOf = (id: string): string => id.split("-").slice(0, 2).join("-");

const mcqBase = {
  exam: "ccar-f",
  secondary_topic_ids: [],
  type: "mcq_single",
  scenario_id: null,
  eligible_modes: ["drill", "practice"],
  srs_eligible: true,
  stem_en: "Which transport should the MCP server use?",
  choices: [
    { label: "A", text_en: "stdio" },
    { label: "B", text_en: "Streamable HTTP" },
  ],
  answer: ["B"],
  answer_en: null,
  explanation_ja: "リモート公開には Streamable HTTP が適切。",
  refs: ["https://docs.claude.com/en/docs/mcp"],
  difficulty: 2,
  status: "active",
  rev: 1,
} as const;

/** 短問 MCQ(scenario_id=null)。over.scenario_id を与えるとシナリオ MCQ になる */
export const mcq = (id: string, over: Partial<Question> = {}): Question =>
  questionSchema.parse({
    ...mcqBase,
    id,
    domain_id: domainOf(id),
    primary_topic_id: `${domainOf(id)}-t1-01`,
    ...over,
  });

/** flash(schema 制約により drill 専用) */
export const flash = (id: string, over: Partial<Question> = {}): Question =>
  questionSchema.parse({
    ...mcqBase,
    id,
    domain_id: domainOf(id),
    primary_topic_id: `${domainOf(id)}-t1-01`,
    type: "flash",
    choices: null,
    answer: null,
    answer_en: "Streamable HTTP",
    eligible_modes: ["drill"],
    ...over,
  });

/** d1: weight 60 / d2: weight 40(合計 100、form_questions 合計 60) */
export const syllabus: Syllabus = syllabusFileSchema.parse({
  exam: "ccar-f",
  version: 1,
  source: "test fixture",
  domains: [
    {
      id: "f-d1",
      name: "Domain 1",
      weight: 60,
      form_questions: 30,
      task_statements: [
        {
          id: "f-d1-t1",
          name: "TS 1",
          topics: [
            { id: "f-d1-t1-01", name: "Topic 1-1", scope_ja: "範囲" },
            { id: "f-d1-t1-02", name: "Topic 1-2", scope_ja: "範囲" },
          ],
        },
      ],
    },
    {
      id: "f-d2",
      name: "Domain 2",
      weight: 40,
      form_questions: 30,
      task_statements: [
        {
          id: "f-d2-t1",
          name: "TS 2",
          topics: [{ id: "f-d2-t1-01", name: "Topic 2-1", scope_ja: "範囲" }],
        },
      ],
    },
  ],
});

/** due 済み(dueAt 過去)の Review 状態行。over で上書き */
export const srsRow = (questionId: string, over: Partial<SrsStateUpsert> = {}): SrsStateUpsert => ({
  questionId,
  exam: "ccar-f",
  dueAt: new Date("2026-08-23T09:00:00+09:00"),
  stability: 5,
  difficulty: 5,
  elapsedDays: 1,
  scheduledDays: 5,
  reps: 2,
  lapses: 0,
  learningSteps: 0,
  state: 2, // Review
  lastReviewAt: new Date("2026-08-20T09:00:00+09:00"),
  ...over,
});

export const emptyCtx = (forms: readonly MockForm[] = []): PoolContext => ({ forms, sessions: [], flags: [] });

/** 60 問収載の未提出フォーム(holdout ゲート検証用) */
export const holdoutForm = (id: string, questionIds: readonly string[]): MockForm =>
  mockFormSchema.parse({ id, exam: "ccar-f", scenario_ids: ["sc-1"], question_ids: questionIds });

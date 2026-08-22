import { z } from "zod";

/**
 * 問題バンクのスキーマ単一ソース(specs/03 §1)。
 * 型は z.infer で導出し、scripts/validate-bank.ts も本ファイルを import する。
 * ここで強制するのは「1 問の中で閉じる」不変条件。ファイル横断の整合(syllabus・
 * scenarios・mock_forms との照合)は validate-bank.ts 側で行う。
 */

export const EXAMS = ["ccar-f", "ccar-p"] as const;
export const examSchema = z.enum(EXAMS);
export type Exam = z.infer<typeof examSchema>;

/** exam → ID 接頭辞(f-d2-q014 の "f") */
export const EXAM_PREFIX: Record<Exam, string> = { "ccar-f": "f", "ccar-p": "p" };

export const MODES = ["drill", "practice", "mock"] as const;
export const modeSchema = z.enum(MODES);
export type Mode = z.infer<typeof modeSchema>;

export const QUESTION_STATUSES = ["active", "flagged", "retired"] as const;
export const questionStatusSchema = z.enum(QUESTION_STATUSES);
export type QuestionStatus = z.infer<typeof questionStatusSchema>;

export const domainIdSchema = z.string().regex(/^[fp]-d[1-7]$/, "domain_id は f-d1 形式");
export const topicIdSchema = z.string().regex(/^[fp]-d[1-7]-t\d+-\d{2}$/, "topic_id は f-d2-t1-03 形式");
export const questionIdSchema = z.string().regex(/^[fp]-d[1-7]-q\d{3,}$/, "question id は f-d2-q014 形式");
export const scenarioIdSchema = z.string().regex(/^sc-[a-z0-9-]+$/, "scenario_id は sc-1 形式");
export const formIdSchema = z.string().regex(/^form-[a-z0-9-]+$/, "form id は form-a 形式");

const choiceLabelSchema = z.string().regex(/^[A-F]$/);

export const choiceSchema = z
  .object({
    label: choiceLabelSchema,
    text_en: z.string().trim().min(1),
  })
  .strict();
export type Choice = z.infer<typeof choiceSchema>;

const uniqueArray = <T>(items: readonly T[]) => new Set(items).size === items.length;

const questionBase = z.object({
  id: questionIdSchema,
  exam: examSchema,
  domain_id: domainIdSchema,
  primary_topic_id: topicIdSchema,
  secondary_topic_ids: z.array(topicIdSchema),
  scenario_id: scenarioIdSchema.nullable(),
  eligible_modes: z.array(modeSchema).min(1),
  srs_eligible: z.boolean(),
  stem_en: z.string().trim().min(1),
  explanation_ja: z.string().trim().min(1),
  refs: z.array(z.string().url()).min(1),
  difficulty: z.number().int().min(1).max(3),
  status: questionStatusSchema,
  rev: z.number().int().min(1),
});

const mcqBase = questionBase.extend({
  choices: z.array(choiceSchema).min(2),
  answer: z.array(choiceLabelSchema).min(1),
  answer_en: z.null(),
});

const flashQuestionSchema = questionBase
  .extend({
    type: z.literal("flash"),
    choices: z.null(),
    answer: z.null(),
    answer_en: z.string().trim().min(1),
  })
  .strict();

const mcqSingleQuestionSchema = mcqBase
  .extend({
    type: z.literal("mcq_single"),
    answer: z.array(choiceLabelSchema).length(1),
  })
  .strict();

const mcqMultiQuestionSchema = mcqBase
  .extend({
    type: z.literal("mcq_multi"),
    answer: z.array(choiceLabelSchema).min(2),
  })
  .strict();

/** "Select TWO" / "Select THREE" … と answer 件数の対応 */
const SELECT_WORDS: Record<number, string> = { 2: "TWO", 3: "THREE", 4: "FOUR", 5: "FIVE" };

export const questionSchema = z
  .discriminatedUnion("type", [flashQuestionSchema, mcqSingleQuestionSchema, mcqMultiQuestionSchema])
  .superRefine((q, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    // --- ID と exam / domain の整合 ---
    const prefix = EXAM_PREFIX[q.exam];
    if (!q.id.startsWith(`${prefix}-`)) issue("id", `exam=${q.exam} の id は ${prefix}- で始まる`);
    if (!q.id.startsWith(`${q.domain_id}-`)) issue("id", "id は domain_id 配下でなければならない");
    if (!q.primary_topic_id.startsWith(`${q.domain_id}-`))
      issue("primary_topic_id", "primary_topic_id は domain_id 配下でなければならない");
    for (const t of q.secondary_topic_ids) {
      if (!t.startsWith(`${q.domain_id}-`)) issue("secondary_topic_ids", `${t} は domain_id 配下でない`);
    }
    if (q.secondary_topic_ids.includes(q.primary_topic_id))
      issue("secondary_topic_ids", "primary_topic_id を含めてはならない");
    if (!uniqueArray(q.secondary_topic_ids)) issue("secondary_topic_ids", "重複がある");

    // --- modes ---
    if (!uniqueArray(q.eligible_modes)) issue("eligible_modes", "重複がある");
    // 注: 「フォーム収載問題は全問 scenario_id != null」は mock_forms.yaml を参照する
    // ファイル横断条件なので validate-bank.ts で検証する(ミニ模試用の独立 MCQ は
    // eligible_modes に mock を含みつつ scenario_id=null が正当: specs/07 Step 5)

    // --- type 別 ---
    if (q.type === "flash") {
      if (q.eligible_modes.some((m) => m !== "drill")) issue("eligible_modes", "flash は drill 専用");
      return;
    }

    const labels = q.choices.map((c) => c.label);
    if (!uniqueArray(labels)) issue("choices", "label が重複している");
    if (!uniqueArray(q.answer)) issue("answer", "重複がある");
    for (const a of q.answer) {
      if (!labels.includes(a)) issue("answer", `${a} は choices に存在しない`);
    }

    if (q.type === "mcq_multi") {
      const word = SELECT_WORDS[q.answer.length];
      const re = /\bSelect (TWO|THREE|FOUR|FIVE)\b/;
      const m = re.exec(q.stem_en);
      if (!m) issue("stem_en", "mcq_multi は stem に 'Select TWO' 等の件数明記が必要");
      else if (m[1] !== word) issue("stem_en", `stem の 'Select ${m[1]}' と answer 件数(${q.answer.length})が不一致`);
    }
  });

export type Question = z.infer<typeof questionSchema>;
export type FlashQuestion = Extract<Question, { type: "flash" }>;
export type McqQuestion = Extract<Question, { type: "mcq_single" | "mcq_multi" }>;

/** questions/*.json: 1 ファイル = 問題配列。ファイル内 id 重複を拒否(ファイル横断は validator) */
export const questionsFileSchema = z.array(questionSchema).superRefine((qs, ctx) => {
  const seen = new Set<string>();
  qs.forEach((q, i) => {
    if (seen.has(q.id))
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, "id"], message: `id 重複: ${q.id}` });
    seen.add(q.id);
  });
});

/** mock_forms.yaml の forms[] 1 件(specs/03 §mock_forms.yaml) */
export const MOCK_FORM_SIZE = 60;

export const mockFormSchema = z
  .object({
    id: formIdSchema,
    exam: examSchema,
    scenario_ids: z.array(scenarioIdSchema).min(1),
    question_ids: z.array(questionIdSchema).length(MOCK_FORM_SIZE),
  })
  .strict()
  .superRefine((f, ctx) => {
    if (!uniqueArray(f.scenario_ids))
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scenario_ids"], message: "重複がある" });
    if (!uniqueArray(f.question_ids))
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["question_ids"], message: "重複がある" });
  });
export type MockForm = z.infer<typeof mockFormSchema>;

export const mockFormsFileSchema = z.object({ forms: z.array(mockFormSchema) }).strict();

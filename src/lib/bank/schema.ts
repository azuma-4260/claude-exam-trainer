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
/** full form のシナリオ本数(specs/01 FR-5: 各 60 問・4 シナリオ)。件数の整合は validate-bank が照合 */
export const FORM_SCENARIO_COUNT = 4;

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

export const mockFormsFileSchema = z
  .object({ forms: z.array(mockFormSchema) })
  .strict()
  .superRefine((f, ctx) => {
    const seen = new Set<string>();
    f.forms.forEach((form, i) => {
      if (seen.has(form.id))
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["forms", i, "id"], message: `form id 重複: ${form.id}` });
      seen.add(form.id);
    });
  });

/**
 * 固定フォームのドメイン配分(specs/03 §mock_forms, 06 §バンク静的検証: 16-11-12-12-9)。
 * syllabus.yaml の form_questions はこの値と一致しなければならない(validate-bank が照合)。
 * 配分はリリースゲートなので、同じ deploy に入る content 側の値を正としない。
 */
export const FORM_DOMAIN_QUOTA: Partial<Record<Exam, Readonly<Record<string, number>>>> = {
  "ccar-f": { "f-d1": 16, "f-d2": 11, "f-d3": 12, "f-d4": 12, "f-d5": 9 },
};

// ---------------------------------------------------------------------------
// syllabus.yaml / scenarios.yaml(ファイル横断の照合元。validate-bank.ts が import)
// ---------------------------------------------------------------------------

const syllabusTopicSchema = z
  .object({
    id: topicIdSchema,
    name: z.string().trim().min(1),
    scope_ja: z.string().trim().min(1),
  })
  .strict();

const syllabusTaskStatementSchema = z
  .object({
    id: z.string().regex(/^[fp]-d[1-7]-t\d+$/, "task_statement id は f-d1-t1 形式"),
    name: z.string().trim().min(1),
    topics: z.array(syllabusTopicSchema).min(1),
  })
  .strict();

const syllabusDomainSchema = z
  .object({
    id: domainIdSchema,
    name: z.string().trim().min(1),
    weight: z.number().int().min(0).max(100),
    form_questions: z.number().int().min(0),
    task_statements: z.array(syllabusTaskStatementSchema).min(1),
  })
  .strict();

/**
 * syllabus.yaml(specs/02 §トピックツリー)。
 * 階層整合(task_statement / topic が自 domain 配下)・ID の全体一意性・
 * weight 合計 100・form_questions 合計 = MOCK_FORM_SIZE をここで強制する。
 */
export const syllabusFileSchema = z
  .object({
    exam: examSchema,
    version: z.number().int().min(1),
    source: z.string().trim().min(1),
    domains: z.array(syllabusDomainSchema).min(1),
  })
  .strict()
  .superRefine((s, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    const prefix = EXAM_PREFIX[s.exam];
    const seen = new Set<string>();
    const dup = (id: string, path: (string | number)[]) => {
      if (seen.has(id)) issue(path, `id 重複: ${id}`);
      seen.add(id);
    };
    s.domains.forEach((d, di) => {
      dup(d.id, ["domains", di, "id"]);
      if (!d.id.startsWith(`${prefix}-`)) issue(["domains", di, "id"], `exam=${s.exam} の id は ${prefix}- で始まる`);
      d.task_statements.forEach((t, ti) => {
        const tp = ["domains", di, "task_statements", ti];
        dup(t.id, [...tp, "id"]);
        if (!t.id.startsWith(`${d.id}-`)) issue([...tp, "id"], `${t.id} は ${d.id} 配下でない`);
        t.topics.forEach((tc, ci) => {
          const cp = [...tp, "topics", ci, "id"];
          dup(tc.id, cp);
          if (!tc.id.startsWith(`${t.id}-`)) issue(cp, `${tc.id} は ${t.id} 配下でない`);
        });
      });
    });
    const weight = s.domains.reduce((a, d) => a + d.weight, 0);
    if (weight !== 100) issue(["domains"], `weight 合計が 100 でない(${weight})`);
    const fq = s.domains.reduce((a, d) => a + d.form_questions, 0);
    if (fq !== MOCK_FORM_SIZE) issue(["domains"], `form_questions 合計が ${MOCK_FORM_SIZE} でない(${fq})`);
  });
export type Syllabus = z.infer<typeof syllabusFileSchema>;
export type SyllabusDomain = Syllabus["domains"][number];

/**
 * scenarios.yaml(specs/03 §1)。本文の項目は spec 未定義(C3a で確定)のため、
 * ここでは validator が参照する id だけを固定し、他キーは passthrough で許容する。
 */
export const scenarioSchema = z.object({ id: scenarioIdSchema }).passthrough();
export type Scenario = z.infer<typeof scenarioSchema>;

export const scenariosFileSchema = z
  .object({ scenarios: z.array(scenarioSchema) })
  .strict()
  .superRefine((s, ctx) => {
    const seen = new Set<string>();
    s.scenarios.forEach((sc, i) => {
      if (seen.has(sc.id))
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scenarios", i, "id"], message: `id 重複: ${sc.id}` });
      seen.add(sc.id);
    });
  });

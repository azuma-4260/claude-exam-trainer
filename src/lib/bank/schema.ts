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

/**
 * 構造化解説フィールド(specs/03 §1、v1.3.3・S-4)。任意。値はバンクの静的ファイルにだけあり DB の意味は変えない。
 * 正解の選択肢だけ持たないため、フィールドの有無で正解が分かる → Mock の試験中 DTO には含めない(src/lib/mock/dto.ts)
 */
const explanationTextSchema = z.string().trim().min(1);

export const LIFECYCLE_PHASES = ["discovery", "design", "deployment", "monitoring", "iteration"] as const;
export const lifecyclePhaseSchema = z.enum(LIFECYCLE_PHASES);
export type LifecyclePhase = z.infer<typeof lifecyclePhaseSchema>;

export const choiceSchema = z
  .object({
    label: choiceLabelSchema,
    text_en: z.string().trim().min(1),
    /** どんな条件なら正解になるか(正解でない選択肢のみ) */
    plausible_ja: explanationTextSchema.optional(),
    /** このシナリオでなぜ BEST でないか(正解でない選択肢のみ) */
    not_best_ja: explanationTextSchema.optional(),
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
  /** 決め手になる制約(書くなら正解でない選択肢すべてに plausible_ja / not_best_ja を書く) */
  binding_constraint_ja: explanationTextSchema.optional(),
  /** フェーズが判断を左右する問題だけに設定する(単独で設定してよい) */
  lifecycle_phase: lifecyclePhaseSchema.nullable().optional(),
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

/**
 * MCQ の選択肢数(specs/03 §1 P の MCQ の不変条件: P はフォーム収載に限らず全 MCQ で 4〜5 択)。
 * 定義の無い exam(F)は検証しない(既存バンクの受理集合を変えない)
 */
export const MCQ_CHOICE_RANGE: Partial<Record<Exam, { readonly min: number; readonly max: number }>> = {
  "ccar-p": { min: 4, max: 5 },
};

/** mcq_multi の answer 件数を固定する exam(P は "Select TWO" のみ。specs/03 §1) */
const MULTI_ANSWER_COUNT: Partial<Record<Exam, number>> = { "ccar-p": 2 };

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
      const fixed = MULTI_ANSWER_COUNT[q.exam];
      if (fixed !== undefined && q.answer.length !== fixed)
        issue("answer", `exam=${q.exam} の mcq_multi は Select ${SELECT_WORDS[fixed]} のみ(answer ${q.answer.length} 件)`);
    }

    // --- P の MCQ の選択肢数(specs/03 §1) ---
    const range = MCQ_CHOICE_RANGE[q.exam];
    if (range && (q.choices.length < range.min || q.choices.length > range.max))
      issue("choices", `exam=${q.exam} の MCQ は選択肢 ${range.min}〜${range.max} 個(${q.choices.length} 個)`);

    // --- 構造化解説フィールド: 書くなら全部書く(specs/03 §1) ---
    const hasBc = q.binding_constraint_ja !== undefined;
    q.choices.forEach((c) => {
      const isAnswer = q.answer.includes(c.label);
      const has = [c.plausible_ja, c.not_best_ja].filter((v) => v !== undefined).length;
      if (isAnswer || !hasBc) {
        if (has > 0)
          issue(
            "choices",
            isAnswer
              ? `正解の選択肢 ${c.label} は plausible_ja / not_best_ja を持たない`
              : `binding_constraint_ja が無い問題の選択肢 ${c.label} は plausible_ja / not_best_ja を持たない`,
          );
      } else if (has !== 2) {
        issue("choices", `binding_constraint_ja がある問題は正解でない選択肢 ${c.label} に plausible_ja と not_best_ja が必要`);
      }
    });
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

/**
 * 固定フォームの構造(specs/03 §mock_forms。exam ごと)。
 * size = 1 フォームの問題数、scenarioCount = シナリオ本数(0 は独立問題形式で scenario_ids は空)。
 * F: 60 問・4 シナリオ(01 FR-5)/ P: 63 問・独立問題形式(T-pmock、オーナー決定 2026-10-03)
 */
export const FORM_STRUCTURE: Readonly<Record<Exam, { readonly size: number; readonly scenarioCount: number }>> = {
  "ccar-f": { size: 60, scenarioCount: 4 },
  "ccar-p": { size: 63, scenarioCount: 0 },
};

/**
 * フォーム収載問題で構造化解説フィールド(binding_constraint_ja + 正解でない選択肢の plausible_ja / not_best_ja)を
 * 必須にする exam(specs/03 §mock_forms §CCAR-P、v1.3.3・S-4)。ファイル横断条件なので validate-bank が検査する
 */
export const FORM_REQUIRES_STRUCTURED_EXPLANATION: Readonly<Record<Exam, boolean>> = {
  "ccar-f": false,
  "ccar-p": true,
};

/** mock_forms.yaml の forms[] 1 件(specs/03 §mock_forms.yaml)。問題数とシナリオ有無は exam ごと(FORM_STRUCTURE) */
export const mockFormSchema = z
  .object({
    id: formIdSchema,
    exam: examSchema,
    scenario_ids: z.array(scenarioIdSchema),
    question_ids: z.array(questionIdSchema),
  })
  .strict()
  .superRefine((f, ctx) => {
    const { size, scenarioCount } = FORM_STRUCTURE[f.exam];
    if (f.question_ids.length !== size)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["question_ids"],
        message: `exam=${f.exam} の question_ids は ${size} 件(${f.question_ids.length} 件)`,
      });
    if (scenarioCount === 0 && f.scenario_ids.length > 0)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scenario_ids"], message: `exam=${f.exam} は独立問題形式のため scenario_ids を空にする` });
    if (scenarioCount > 0 && f.scenario_ids.length === 0)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scenario_ids"], message: `exam=${f.exam} は scenario_ids が 1 件以上必要` });
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
 * 固定フォームのドメイン配分(specs/03 §mock_forms, 06 §バンク静的検証。F: 16-11-12-12-9 / P: 11-8-12-10-9-9-4)。
 * syllabus.yaml の form_questions はこの値と一致しなければならない(validate-bank が照合)。
 * 配分はリリースゲートなので、同じ deploy に入る content 側の値を正としない。
 */
export const FORM_DOMAIN_QUOTA: Partial<Record<Exam, Readonly<Record<string, number>>>> = {
  "ccar-f": { "f-d1": 16, "f-d2": 11, "f-d3": 12, "f-d4": 12, "f-d5": 9 },
  "ccar-p": { "p-d1": 11, "p-d2": 8, "p-d3": 12, "p-d4": 10, "p-d5": 9, "p-d6": 9, "p-d7": 4 },
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
    /** 固定フォーム配分が確定した exam のみ必須、未確定の exam は書かない(specs/03 §1。下の superRefine で強制) */
    form_questions: z.number().int().min(0).optional(),
    task_statements: z.array(syllabusTaskStatementSchema).min(1),
  })
  .strict();

/**
 * syllabus.yaml(specs/02 §トピックツリー)。
 * 階層整合(task_statement / topic が自 domain 配下)・ID の全体一意性・
 * weight 合計 100 をここで強制する。form_questions は固定フォーム配分が確定した exam(FORM_DOMAIN_QUOTA あり)でのみ
 * 必須で合計 = その exam のフォーム問題数(FORM_STRUCTURE)、未確定の exam では書かない(specs/03 §1, D6-3 / T-pmock)。
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
    if (FORM_DOMAIN_QUOTA[s.exam]) {
      s.domains.forEach((d, di) => {
        if (d.form_questions === undefined)
          issue(["domains", di, "form_questions"], `exam=${s.exam} は固定フォーム配分が確定しているため form_questions が必須`);
      });
      const fq = s.domains.reduce((a, d) => a + (d.form_questions ?? 0), 0);
      const size = FORM_STRUCTURE[s.exam].size;
      if (fq !== size) issue(["domains"], `form_questions 合計が ${size} でない(${fq})`);
    } else {
      s.domains.forEach((d, di) => {
        if (d.form_questions !== undefined)
          issue(["domains", di, "form_questions"], `exam=${s.exam} は固定フォーム配分が未確定のため form_questions を書かない`);
      });
    }
  });
export type Syllabus = z.infer<typeof syllabusFileSchema>;
export type SyllabusDomain = Syllabus["domains"][number];

/**
 * scenarios.yaml(specs/03 §1)。形式は 2026-08-24, C3a で確定:
 * id / title_en / context_en / refs の 4 フィールドのみ。未知キーは strict で拒否。
 * シナリオ→ドメイン対応は独立フィールドとして持たない(参照する question の domain_id から導出)。
 */
export const scenarioSchema = z
  .object({
    id: scenarioIdSchema,
    title_en: z.string().trim().min(1),
    context_en: z.string().trim().min(1),
    refs: z.array(z.string().url()).min(1),
  })
  .strict();
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

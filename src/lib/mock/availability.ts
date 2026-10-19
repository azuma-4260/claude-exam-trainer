import {
  filterPool,
  formAvailability,
  formKey,
  unsubmittedFormKeys,
  type FormAvailability,
  type OpenFlag,
  type PoolContext,
  type PoolSession,
} from "@/lib/bank/pool";
import type { Exam, MockForm, Question, Syllabus } from "@/lib/bank/schema";
import { MINI_MINUTES_PER_QUESTION, MINI_QUESTION_MAX, MINI_QUESTION_MIN } from "./mini";

/**
 * S-5 開始画面のフォーム選択肢(01 FR-5、05 S-5)。
 * availability・submitted(rehearsal)・推奨フォームは DB に保存せず、
 * exam_session / question_flag から都度導出する(specs/03 に rehearsal 列は無い)。
 */

export interface MockFormOption {
  /** フォームは (exam, formId) で識別する(F と P に同名 form があってよい) */
  exam: Exam;
  formId: string;
  questionCount: number;
  /** true = 提出済み(再受験は rehearsal ラベル付きで選択可) */
  submitted: boolean;
  availability: FormAvailability;
}

export interface MockFormOptions {
  /** mock_forms の定義順 */
  options: MockFormOption[];
  /** 未実施 + available の定義順先頭(「次の有効な未実施フォーム」)。無ければ null */
  recommendedFormId: string | null;
  /** exam ごとの「次の有効な未実施フォーム」(提出状態・推奨は exam ごとに独立。01 FR-5) */
  recommendedByExam: Partial<Record<Exam, string | null>>;
  /** form が 1 件以上あり全 form が開始不可(悪問修正を要求して Mock 開始を拒否) */
  allBlocked: boolean;
}

export function buildMockFormOptions(
  forms: readonly MockForm[],
  sessions: readonly PoolSession[],
  flags: readonly OpenFlag[],
  findQuestion: (id: string) => Question | null,
): MockFormOptions {
  const unsubmitted = unsubmittedFormKeys({ forms, sessions });
  const options: MockFormOption[] = forms.map((f) => ({
    exam: f.exam,
    formId: f.id,
    questionCount: f.question_ids.length,
    submitted: !unsubmitted.has(formKey(f.exam, f.id)),
    availability: formAvailability(f.question_ids.map(findQuestion), flags),
  }));
  const isNext = (o: MockFormOption) => !o.submitted && o.availability.available;
  const recommendedByExam: Partial<Record<Exam, string | null>> = {};
  for (const o of options) {
    if (!(o.exam in recommendedByExam)) recommendedByExam[o.exam] = null;
    if (recommendedByExam[o.exam] === null && isNext(o)) recommendedByExam[o.exam] = o.formId;
  }
  return {
    options,
    recommendedFormId: options.find(isNext)?.formId ?? null,
    recommendedByExam,
    allBlocked: options.length > 0 && options.every((o) => !o.availability.available),
  };
}

/**
 * S-5 開始画面の 1 フォームの開始可否(D6-2)。推奨は exam ごと(`recommendedByExam`)で判定する。
 * - 未実施フォームは exam ごとの「次の有効な未実施フォーム」のみ開始可(01 FR-5)
 * - 提出済みフォームは available なら rehearsal として常に開始可
 * - 開始は `{ exam, form_id }`(D6-4、B-T-exam-2)なので、F と P に同名 form があってもそれぞれ開始できる
 */
export type FormStartability = {
  recommended: boolean;
  startable: boolean;
  blocked: null | "unavailable" | "not_next";
};

export function formStartability(option: MockFormOption, all: MockFormOptions): FormStartability {
  const recommended = all.recommendedByExam[option.exam] === option.formId;
  if (!option.availability.available) return { recommended, startable: false, blocked: "unavailable" };
  if (!option.submitted && !recommended) return { recommended, startable: false, blocked: "not_next" };
  return { recommended, startable: true, blocked: null };
}

/** S-5 開始画面のドメイン別ミニ模試の選択肢(D4-1, 01 FR-5)。DB 保存せず都度導出 */
export interface MiniDomainOption {
  /** domain_id は exam 内でのみ意味を持つ(開始は `{ exam, domain_id }`) */
  exam: Exam;
  domainId: string;
  name: string;
  weight: number;
  /** domain_mini 判定を通過した独立 MCQ 数 */
  poolCount: number;
  /** 開始時の出題数 = min(MAX, poolCount)。開始不可なら 0 */
  questionCount: number;
  /** 制限時間(分)= questionCount × 2。開始不可なら 0 */
  durationMin: number;
  /** poolCount >= MIN */
  available: boolean;
  minCount: number;
}

export function buildMiniDomainOptions(
  syllabus: Syllabus,
  questions: readonly Question[],
  ctx: PoolContext,
): MiniDomainOption[] {
  return syllabus.domains.map((d) => {
    const poolCount = filterPool(
      questions.filter((q) => q.exam === syllabus.exam),
      { mode: "mock", kind: "domain_mini", domainId: d.id },
      ctx,
    ).length;
    const available = poolCount >= MINI_QUESTION_MIN;
    const questionCount = available ? Math.min(MINI_QUESTION_MAX, poolCount) : 0;
    return {
      exam: syllabus.exam,
      domainId: d.id,
      name: d.name,
      weight: d.weight,
      poolCount,
      questionCount,
      durationMin: questionCount * MINI_MINUTES_PER_QUESTION,
      available,
      minCount: MINI_QUESTION_MIN,
    };
  });
}

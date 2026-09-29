import {
  formAvailability,
  formKey,
  unsubmittedFormKeys,
  type FormAvailability,
  type OpenFlag,
  type PoolSession,
} from "@/lib/bank/pool";
import type { Exam, MockForm, Question } from "@/lib/bank/schema";

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
 * - 開始候補に同名 form が複数 exam 分あると開始 API は `{ form_id }` だけでは特定できず 409 ambiguous_form になる。
 *   押しても必ず失敗するボタンを出さないため開始不可にする(開始リクエストへの exam 追加は D6-4、B-T-exam-2)
 */
export type FormStartability = {
  recommended: boolean;
  startable: boolean;
  blocked: null | "unavailable" | "ambiguous_form" | "not_next";
};

export function formStartability(option: MockFormOption, all: MockFormOptions): FormStartability {
  const recommended = all.recommendedByExam[option.exam] === option.formId;
  if (all.options.filter((o) => o.formId === option.formId).length > 1) {
    return { recommended, startable: false, blocked: "ambiguous_form" };
  }
  if (!option.availability.available) return { recommended, startable: false, blocked: "unavailable" };
  if (!option.submitted && !recommended) return { recommended, startable: false, blocked: "not_next" };
  return { recommended, startable: true, blocked: null };
}

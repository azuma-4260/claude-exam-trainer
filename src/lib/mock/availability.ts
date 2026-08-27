import {
  formAvailability,
  unsubmittedFormIds,
  type FormAvailability,
  type OpenFlag,
  type PoolSession,
} from "@/lib/bank/pool";
import type { MockForm, Question } from "@/lib/bank/schema";

/**
 * S-5 開始画面のフォーム選択肢(01 FR-5、05 S-5)。
 * availability・submitted(rehearsal)・推奨フォームは DB に保存せず、
 * exam_session / question_flag から都度導出する(specs/03 に rehearsal 列は無い)。
 */

export interface MockFormOption {
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
  /** form が 1 件以上あり全 form が開始不可(悪問修正を要求して Mock 開始を拒否) */
  allBlocked: boolean;
}

export function buildMockFormOptions(
  forms: readonly MockForm[],
  sessions: readonly PoolSession[],
  flags: readonly OpenFlag[],
  findQuestion: (id: string) => Question | null,
): MockFormOptions {
  const unsubmitted = unsubmittedFormIds({ forms, sessions });
  const options: MockFormOption[] = forms.map((f) => ({
    formId: f.id,
    questionCount: f.question_ids.length,
    submitted: !unsubmitted.has(f.id),
    availability: formAvailability(f.question_ids.map(findQuestion), flags),
  }));
  const recommended = options.find((o) => !o.submitted && o.availability.available);
  return {
    options,
    recommendedFormId: recommended?.formId ?? null,
    allBlocked: options.length > 0 && options.every((o) => !o.availability.available),
  };
}

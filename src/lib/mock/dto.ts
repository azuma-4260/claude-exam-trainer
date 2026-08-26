import type { ExamSessionAnswerRow, ExamSessionRow } from "@/db/schema";
import type { Question, Scenario } from "@/lib/bank/schema";

/**
 * 試験中クライアントへ渡す DTO(05 S-5)。
 * 採点・解説は提出まで非表示のため、answer / explanation_ja / refs は**構造上含めない**
 * (ネットワーク層でも正解を漏らさない)。
 */

export interface MockQuestionDto {
  id: string;
  type: "mcq_single" | "mcq_multi";
  scenario_id: string | null;
  stem_en: string;
  choices: { label: string; text_en: string }[];
  /** mcq_multi の選択数(answer 自体は含めない) */
  select_count: number;
}

export interface MockScenarioDto {
  id: string;
  title_en: string | null;
  context_en: string | null;
}

export interface MockSessionDto {
  id: string;
  exam: string;
  kind: string;
  form_id: string | null;
  domain_id: string | null;
  question_ids: string[];
  status: string;
  submission_reason: string | null;
  started_at: string;
  deadline_at: string | null;
  current_index: number;
  finished_at: string | null;
  score_raw: number | null;
}

export interface MockAnswerDto {
  question_id: string;
  chosen: string[] | null;
  flagged: boolean;
}

export function toSessionDto(s: ExamSessionRow): MockSessionDto {
  return {
    id: s.id,
    exam: s.exam,
    kind: s.kind,
    form_id: s.formId,
    domain_id: s.domainId,
    question_ids: s.questionIds,
    status: s.status,
    submission_reason: s.submissionReason,
    started_at: s.startedAt.toISOString(),
    deadline_at: s.deadlineAt?.toISOString() ?? null,
    current_index: s.currentIndex,
    finished_at: s.finishedAt?.toISOString() ?? null,
    score_raw: s.scoreRaw,
  };
}

export function toAnswerDtos(answers: readonly ExamSessionAnswerRow[]): MockAnswerDto[] {
  return answers.map((a) => ({ question_id: a.questionId, chosen: a.chosen, flagged: a.flagged }));
}

/** flash はフォーム収載され得ない(validator が保証)。混入していたら null を返し呼び出し側で 500 にする */
export function toQuestionDtos(
  questionIds: readonly string[],
  findQuestion: (id: string) => Question | null,
): MockQuestionDto[] | null {
  const dtos: MockQuestionDto[] = [];
  for (const id of questionIds) {
    const q = findQuestion(id);
    if (!q || q.type === "flash") return null;
    dtos.push({
      id: q.id,
      type: q.type,
      scenario_id: q.scenario_id,
      stem_en: q.stem_en,
      choices: q.choices.map((c) => ({ label: c.label, text_en: c.text_en })),
      select_count: q.answer.length,
    });
  }
  return dtos;
}

/**
 * シナリオ見出し(05 S-5)。scenarios.yaml の契約は C3a が策定中(id / title_en / context_en / refs)。
 * main の schema はまだ id 以外を passthrough で通すだけなので、文字列のときだけ拾う
 * (C3a merge 後は Scenario 型が閉じ、この防御は型的に自明になる)
 */
export function toScenarioDtos(scenarioIds: readonly string[], scenarios: readonly Scenario[] | null): MockScenarioDto[] {
  const byId = new Map((scenarios ?? []).map((s) => [s.id, s as Record<string, unknown>]));
  const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
  return scenarioIds.map((id) => {
    const s = byId.get(id);
    return { id, title_en: str(s?.title_en), context_en: str(s?.context_en) };
  });
}

/** DTO 化した出題順から、画面のシナリオ見出し対象 id を出現順で抽出する */
export function scenarioIdsInOrder(questions: readonly MockQuestionDto[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const q of questions) {
    if (q.scenario_id && !seen.has(q.scenario_id)) {
      seen.add(q.scenario_id);
      ids.push(q.scenario_id);
    }
  }
  return ids;
}

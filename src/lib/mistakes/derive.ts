import { evaluatePool, holdoutFormOf, type PoolContext } from "@/lib/bank/pool";
import type { Bank } from "@/lib/bank/load";
import type { McqQuestion, Scenario } from "@/lib/bank/schema";
import { toScenarioDtos, type MockScenarioDto } from "@/lib/mock/dto";
import { estSec } from "@/lib/queue/estimate";
import { SESSION_MAX, type DrillItem } from "@/lib/queue/serve";

/** 間違いノート導出に必要な attempt の最小射影。 */
export type MistakeAttempt = {
  attemptId: string;
  questionId: string;
  mode: string;
  isCorrect: boolean | null;
  answeredAt: Date;
};

export type MistakeSummary = {
  questionId: string;
  wrongCount: number;
  correctStreak: number;
  lastAnsweredAt: Date;
};

export type MistakeListItem = MistakeSummary & {
  rev: number;
  domainId: string;
  stemEn: string;
  released: boolean;
};

export type MistakesView =
  | { kind: "empty" }
  | {
      kind: "ok";
      items: MistakeListItem[];
      review: {
        items: DrillItem[];
        scenarios: MockScenarioDto[];
        remainingAfterBatch: number;
      };
    };

/**
 * attempt から状態レスに間違いノートを導出する(specs/03 §間違いノート)。
 * 同時刻は attempt_id で順序を固定し、入力元の並びに結果を依存させない。
 */
export function deriveMistakeSummaries(attempts: readonly MistakeAttempt[]): MistakeSummary[] {
  const eligible = attempts
    .filter((a) => a.mode === "practice" || a.mode === "mock")
    .toSorted((a, b) => a.answeredAt.getTime() - b.answeredAt.getTime() || a.attemptId.localeCompare(b.attemptId));
  const state = new Map<string, MistakeSummary>();

  for (const row of eligible) {
    // 通常の保存経路では boolean が必須。過去の不完全行は連続数を変えず無視する。
    if (row.isCorrect === null) continue;
    const current = state.get(row.questionId) ?? {
      questionId: row.questionId,
      wrongCount: 0,
      correctStreak: 0,
      lastAnsweredAt: row.answeredAt,
    };
    if (row.isCorrect) current.correctStreak += 1;
    else {
      current.wrongCount += 1;
      current.correctStreak = 0;
    }
    current.lastAnsweredAt = row.answeredAt;
    state.set(row.questionId, current);
  }

  return [...state.values()]
    .filter((item) => item.wrongCount > 0 && item.correctStreak < 3)
    .sort(
      (a, b) =>
        b.wrongCount - a.wrongCount ||
        b.lastAnsweredAt.getTime() - a.lastAnsweredAt.getTime() ||
        a.questionId.localeCompare(b.questionId),
    );
}

export type AssembleMistakesInputs = {
  bank: Bank;
  poolCtx: PoolContext;
  scenarios: readonly Scenario[] | null;
  attempts: readonly MistakeAttempt[];
  /** 「総ざらい」の同一周回ですでに提示した問題。一覧表示からは除外しない。 */
  reviewExcludeIds?: ReadonlySet<string>;
};

/** 一覧と「総ざらい」用の practice バッチを、同じ出題可否判定と順序から組み立てる。 */
export function assembleMistakesView(inputs: AssembleMistakesInputs): MistakesView {
  const summaries = deriveMistakeSummaries(inputs.attempts);
  const visible: { summary: MistakeSummary; question: McqQuestion }[] = [];

  for (const summary of summaries) {
    const question = inputs.bank.byId.get(summary.questionId);
    if (!question || !evaluatePool(question, { mode: "practice" }, inputs.poolCtx).allowed) continue;
    // evaluatePool の mode 判定で flash は通常除外されるが、総ざらいは MCQ UI のため fail safe でも落とす。
    if (question.type === "flash") continue;
    visible.push({ summary, question });
  }

  if (visible.length === 0) return { kind: "empty" };

  const items: MistakeListItem[] = visible.map(({ summary, question }) => ({
    ...summary,
    rev: question.rev,
    domainId: question.domain_id,
    stemEn: question.stem_en,
    released: holdoutFormOf(question.id, inputs.bank.forms) !== null,
  }));
  const reviewCandidates = visible.filter(({ question }) => !inputs.reviewExcludeIds?.has(question.id));
  const reviewItems: DrillItem[] = reviewCandidates.slice(0, SESSION_MAX).map(({ question }) => ({
    questionId: question.id,
    rev: question.rev,
    type: question.type,
    scenarioId: question.scenario_id,
    stemEn: question.stem_en,
    choices: question.choices.map((choice) => ({ label: choice.label, textEn: choice.text_en })),
    answer: [...question.answer],
    explanationJa: question.explanation_ja,
    refs: [...question.refs],
    answerEn: null,
    source: "mistake",
    estSec: estSec(question),
  }));
  const scenarioIds: string[] = [];
  const seenScenarioIds = new Set<string>();
  for (const item of reviewItems) {
    if (item.scenarioId && !seenScenarioIds.has(item.scenarioId)) {
      seenScenarioIds.add(item.scenarioId);
      scenarioIds.push(item.scenarioId);
    }
  }

  return {
    kind: "ok",
    items,
    review: {
      items: reviewItems,
      scenarios: toScenarioDtos(scenarioIds, inputs.scenarios),
      remainingAfterBatch: reviewCandidates.length - reviewItems.length,
    },
  };
}

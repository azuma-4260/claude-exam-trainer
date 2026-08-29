import type { AttemptRow, ExamSessionRow, SrsStateRow } from "@/db/schema";
import type { Question, Syllabus } from "@/lib/bank/schema";
import { domainProficiencies, topicProficiencies } from "@/lib/queue/proficiency";
import { jstCalendarDate } from "@/lib/srs/jst";
import { isRehearsal } from "@/lib/mock/report";

/** S-8 Stats の DB 非依存導出。日付は全て JST 暦日で扱う。 */

export interface StatsDomain {
  domainId: string;
  name: string;
  weight: number;
  proficiency: number;
}

export interface StatsMockPoint {
  sessionId: string;
  formId: string;
  finishedAt: string;
  scoreRaw: number;
  total: number;
  percent: number;
  weightedPercent: number;
}

export interface StatsView {
  domains: StatsDomain[];
  dailyAnswers: { date: string; count: number }[];
  mockTrends: { initial: StatsMockPoint[]; rehearsal: StatsMockPoint[] };
}

type StatsAttempt = Pick<
  AttemptRow,
  "questionId" | "isCorrect" | "answeredAt" | "mode" | "chosen" | "sessionId"
>;

function weightedMockPercent(
  session: ExamSessionRow,
  attempts: readonly StatsAttempt[],
  questions: ReadonlyMap<string, Question>,
  syllabus: Syllabus,
): number {
  const attemptByQuestion = new Map(
    attempts
      .filter((row) => row.mode === "mock" && row.sessionId === session.id)
      .map((row) => [row.questionId, row]),
  );
  let weighted = 0;
  let includedWeight = 0;
  for (const domain of syllabus.domains) {
    const ids = session.questionIds.filter((id) => questions.get(id)?.domain_id === domain.id);
    if (ids.length === 0) continue;
    const correct = ids.filter((id) => attemptByQuestion.get(id)?.isCorrect === true).length;
    weighted += (correct / ids.length) * domain.weight;
    includedWeight += domain.weight;
  }
  return includedWeight > 0 ? Math.round((weighted / includedWeight) * 100) : 0;
}

const mockPoint = (
  session: ExamSessionRow,
  attempts: readonly StatsAttempt[],
  questions: ReadonlyMap<string, Question>,
  syllabus: Syllabus,
): StatsMockPoint => {
  const total = session.questionIds.length;
  const scoreRaw = session.scoreRaw ?? 0;
  return {
    sessionId: session.id,
    formId: session.formId as string,
    finishedAt: (session.finishedAt ?? session.startedAt).toISOString(),
    scoreRaw,
    total,
    percent: total > 0 ? Math.round((scoreRaw / total) * 100) : 0,
    weightedPercent: weightedMockPercent(session, attempts, questions, syllabus),
  };
};

export function buildStatsView(args: {
  questions: readonly Question[];
  syllabus: Syllabus;
  srsRows: readonly SrsStateRow[];
  attempts: readonly StatsAttempt[];
  sessions: readonly ExamSessionRow[];
  now: Date;
}): StatsView {
  const correctQuestionIds = new Set(
    args.attempts.filter((a) => a.isCorrect === true).map((a) => a.questionId),
  );
  const topics = topicProficiencies({
    questions: args.questions,
    syllabus: args.syllabus,
    srsRows: args.srsRows,
    correctQuestionIds,
    now: args.now,
  });
  const domainValues = domainProficiencies(args.syllabus, topics);
  const domains = args.syllabus.domains.map((domain) => ({
    domainId: domain.id,
    name: domain.name,
    weight: domain.weight,
    proficiency: domainValues.get(domain.id) ?? 0,
  }));

  const daily = new Map<string, number>();
  for (const row of args.attempts) {
    // Mock は未回答でも提出時に attempt が生成されるため、実際の回答だけ数える。
    if (row.mode === "mock" && row.chosen === null) continue;
    const date = jstCalendarDate(row.answeredAt);
    daily.set(date, (daily.get(date) ?? 0) + 1);
  }
  const dailyAnswers = [...daily]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const full = args.sessions
    .filter(
      (session): session is ExamSessionRow & { formId: string } =>
        session.kind === "full" &&
        session.status === "submitted" &&
        session.formId !== null &&
        session.finishedAt !== null,
    )
    .sort((a, b) => {
      const byTime = (a.finishedAt as Date).getTime() - (b.finishedAt as Date).getTime();
      return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
    });
  const mockTrends: StatsView["mockTrends"] = { initial: [], rehearsal: [] };
  const questionById = new Map(args.questions.map((question) => [question.id, question]));
  for (const session of full) {
    const series = isRehearsal(session, full) ? mockTrends.rehearsal : mockTrends.initial;
    series.push(mockPoint(session, args.attempts, questionById, args.syllabus));
  }

  return { domains, dailyAnswers, mockTrends };
}

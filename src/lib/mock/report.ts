import type { AttemptRow, ExamSessionRow } from "@/db/schema";
import type { Question, Syllabus } from "@/lib/bank/schema";

/**
 * S-6 模試レポートの導出(specs/05 S-6、01 FR-5)。DB 非依存の純関数。
 * - 正誤の単一ソースは提出時に一括生成された attempt(mode='mock')。ここで再採点しない
 *   (attempt が欠落した問題だけ未回答=誤答として防御的に扱う)
 * - rehearsal は DB 列を持たず毎回導出する(決定事項 6: 再受験 = rehearsal)。
 *   判定: 同一 (exam, form_id) の submitted full セッションのうち、自分より先に終了した
 *   ものが 1 件でもあれば rehearsal。finished_at 同時刻は id 昇順で先行を決める(決定的)
 */

export type MockAttempt = Pick<AttemptRow, "questionId" | "questionRev" | "isCorrect" | "chosen">;

export type SubmittedFullSession = Pick<
  ExamSessionRow,
  "id" | "exam" | "kind" | "formId" | "status" | "startedAt" | "finishedAt"
>;

/** 提出済みセッションは finished_at 非 null が不変条件だが、欠けても比較可能にしておく */
const finishTime = (s: Pick<ExamSessionRow, "startedAt" | "finishedAt">): number =>
  (s.finishedAt ?? s.startedAt).getTime();

export function isRehearsal(session: SubmittedFullSession, others: readonly SubmittedFullSession[]): boolean {
  if (session.kind !== "full" || session.formId === null) return false;
  const mine = finishTime(session);
  return others.some((s) => {
    if (s.id === session.id || s.kind !== "full" || s.status !== "submitted") return false;
    if (s.exam !== session.exam || s.formId !== session.formId) return false;
    const t = finishTime(s);
    return t < mine || (t === mine && s.id < session.id);
  });
}

export interface MockReportDomain {
  domainId: string;
  name: string;
  weight: number;
  total: number;
  correct: number;
}

export interface MockReportWrongItem {
  questionId: string;
  /** 出題順の 1 始まり位置(画面の問題番号) */
  position: number;
  unanswered: boolean;
  chosen: string[];
  /** バンクに現行問題が無ければ null */
  correct: string[] | null;
  stemEn: string | null;
  choices: { label: string; text_en: string }[] | null;
  explanationJa: string | null;
  refs: string[];
  /** 開始時 snapshot の rev と現行 rev が異なる(解説が改訂後のものである可能性) */
  revChanged: boolean;
}

export interface MockReport {
  sessionId: string;
  formId: string | null;
  kind: string;
  scoreRaw: number;
  total: number;
  rehearsal: boolean;
  submissionReason: string | null;
  finishedAt: string | null;
  domains: MockReportDomain[];
  wrong: MockReportWrongItem[];
  /** 出題があったドメインのうち正答率最小(同率は weight が大きい方)。出題ゼロなら null */
  weakestDomainId: string | null;
  /** バンクに存在しない収載問題(整合性の防御。通常は空) */
  unknownQuestionIds: string[];
}

export function buildMockReport(args: {
  session: ExamSessionRow;
  attempts: readonly MockAttempt[];
  priorSessions: readonly SubmittedFullSession[];
  findQuestion(id: string): Question | null;
  syllabus: Syllabus;
}): MockReport {
  const { session, attempts, priorSessions, findQuestion, syllabus } = args;
  const attemptById = new Map(attempts.map((a) => [a.questionId, a]));

  const counts = new Map(syllabus.domains.map((d) => [d.id, { total: 0, correct: 0 }]));
  const wrong: MockReportWrongItem[] = [];
  const unknownQuestionIds: string[] = [];
  let derivedScore = 0;

  session.questionIds.forEach((questionId, i) => {
    const a = attemptById.get(questionId) ?? null;
    const isCorrect = a?.isCorrect === true;
    if (isCorrect) derivedScore += 1;

    const q = findQuestion(questionId);
    if (!q) unknownQuestionIds.push(questionId);
    const domain = q ? counts.get(q.domain_id) : undefined;
    if (domain) {
      domain.total += 1;
      if (isCorrect) domain.correct += 1;
    }

    if (!isCorrect) {
      const chosen = a?.chosen ?? null;
      wrong.push({
        questionId,
        position: i + 1,
        unanswered: chosen === null || chosen.length === 0,
        chosen: chosen ?? [],
        correct: q && q.type !== "flash" ? q.answer : null,
        stemEn: q?.stem_en ?? null,
        choices: q && q.type !== "flash" ? q.choices : null,
        explanationJa: q?.explanation_ja ?? null,
        refs: q?.refs ?? [],
        revChanged: q !== null && a !== null && a.questionRev !== q.rev,
      });
    }
  });

  const domains: MockReportDomain[] = syllabus.domains.map((d) => {
    const c = counts.get(d.id) as { total: number; correct: number };
    return { domainId: d.id, name: d.name, weight: d.weight, total: c.total, correct: c.correct };
  });

  // 正答率の比較は分数のまま(correct_a * total_b と correct_b * total_a)行い浮動小数を避ける
  let weakest: MockReportDomain | null = null;
  for (const d of domains) {
    if (d.total === 0) continue;
    if (
      weakest === null ||
      d.correct * weakest.total < weakest.correct * d.total ||
      (d.correct * weakest.total === weakest.correct * d.total && d.weight > weakest.weight)
    ) {
      weakest = d;
    }
  }

  return {
    sessionId: session.id,
    formId: session.formId,
    kind: session.kind,
    scoreRaw: session.scoreRaw ?? derivedScore,
    total: session.questionIds.length,
    rehearsal: isRehearsal(session, priorSessions),
    submissionReason: session.submissionReason,
    finishedAt: session.finishedAt?.toISOString() ?? null,
    domains,
    wrong,
    weakestDomainId: weakest?.domainId ?? null,
    unknownQuestionIds,
  };
}

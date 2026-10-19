import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { loadMultiBank } from "@/lib/bank/runtime";
import { loadPoolContext } from "@/lib/answer/store";
import type { PoolContext } from "@/lib/bank/pool";
import type { ExamSessionAnswerRow, ExamSessionRow } from "@/db/schema";
import type { Exam, MockForm, Question, Scenario, Syllabus } from "@/lib/bank/schema";
import { getStudyScope } from "@/lib/scope/repo";
import type { StudyScope } from "@/lib/scope/scope";
import { mockBankContext, startFormsFor } from "./context";
import { scenarioIdsInOrder, toAnswerDtos, toQuestionDtos, toScenarioDtos, toSessionDto } from "./dto";
import type { MockDeps } from "./lifecycle";
import { createMockStore } from "./store";

/**
 * Mock API ルート共通の依存組み立て(server 専用)。バンクはプロセス内キャッシュ。
 * 進行中セッションの操作は学習スコープに依存しない(問題は全 exam、シナリオはセッションの exam から引く)。
 */

/** S-6 レポートのドメイン名・重み用。セッションの exam の syllabus(未整備の exam は null) */
export function syllabusFor(exam: Exam): Syllabus | null {
  return loadMultiBank().get(exam).syllabus;
}

export interface MockServerContext {
  deps: MockDeps;
  /** 全 exam のフォーム */
  forms: readonly MockForm[];
  /** domain mini のプール判定用(全 exam の問題。exam の絞り込みは startDomainMini 側) */
  questions: readonly Question[];
  scenariosFor: (exam: Exam) => readonly Scenario[] | null;
  /** ドメイン名(mini ヘッダ)・mini 開始の検証用。syllabus 未整備の exam は null */
  syllabusFor: (exam: Exam) => Syllabus | null;
}

export function mockServerContext(): MockServerContext {
  const multi = loadMultiBank();
  const ctx = mockBankContext(multi);
  return {
    deps: {
      store: createMockStore(getDb()),
      findQuestion: ctx.findQuestion,
      now: new Date(),
      newSessionId: () => randomUUID(),
    },
    forms: ctx.forms,
    questions: multi.all.questions,
    scenariosFor: ctx.scenariosFor,
    syllabusFor: (exam) => multi.get(exam).syllabus,
  };
}

/**
 * 開始 API の availability・自動選択検証用に submitted セッションと open フラグを読み、
 * 開始候補を学習スコープ内 exam のフォームに絞る(mockServerContext は同期・軽量のまま保つ)
 */
export async function loadStartPool(
  forms: MockServerContext["forms"],
): Promise<PoolContext & { startForms: MockForm[]; scope: StudyScope }> {
  const db = getDb();
  const [pool, scope] = await Promise.all([loadPoolContext(db, forms), getStudyScope(db)]);
  return { ...pool, startForms: startFormsFor(forms, scope), scope };
}

/** 開始・復元が返すセッション一式(出題 DTO のみ。正解・解説は含めない)。バンク不整合は null */
export function sessionPayload(
  session: ExamSessionRow,
  answers: readonly ExamSessionAnswerRow[],
  ctx: MockServerContext,
): Record<string, unknown> | null {
  const questions = toQuestionDtos(session.questionIds, ctx.deps.findQuestion);
  if (!questions) return null;
  return {
    session: toSessionDto(session),
    answers: toAnswerDtos(answers),
    questions,
    scenarios: toScenarioDtos(scenarioIdsInOrder(questions), ctx.scenariosFor(session.exam as Exam)),
    // 試験中ヘッダ用(domain mini のみ非 null)。DTO に正解・解説を混ぜない方針は変えない
    domain_name: session.domainId
      ? (ctx.syllabusFor(session.exam as Exam)?.domains.find((d) => d.id === session.domainId)?.name ?? null)
      : null,
  };
}

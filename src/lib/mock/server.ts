import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { bankDir, loadBank } from "@/lib/bank/load";
import { loadScenarios } from "@/lib/bank/syllabus";
import { loadPoolContext } from "@/lib/answer/store";
import type { PoolContext } from "@/lib/bank/pool";
import type { ExamSessionAnswerRow, ExamSessionRow } from "@/db/schema";
import type { MockForm, Scenario } from "@/lib/bank/schema";
import { scenarioIdsInOrder, toAnswerDtos, toQuestionDtos, toScenarioDtos, toSessionDto } from "./dto";
import type { MockDeps } from "./lifecycle";
import { createMockStore } from "./store";

/** Mock API ルート共通の依存組み立て(server 専用)。バンク同様、シナリオもプロセス内キャッシュ */

let scenariosCache: { loaded: true; value: Scenario[] | null } | null = null;

function loadScenariosCached(): Scenario[] | null {
  scenariosCache ??= { loaded: true, value: loadScenarios(bankDir()) };
  return scenariosCache.value;
}

export interface MockServerContext {
  deps: MockDeps;
  forms: readonly MockForm[];
  scenarios: readonly Scenario[] | null;
}

export function mockServerContext(): MockServerContext {
  const bank = loadBank();
  return {
    deps: {
      store: createMockStore(getDb()),
      findQuestion: (id) => bank.byId.get(id) ?? null,
      now: new Date(),
      newSessionId: () => randomUUID(),
    },
    forms: bank.forms,
    scenarios: loadScenariosCached(),
  };
}

/**
 * 開始 API の availability・自動選択検証用に submitted セッションと open フラグを読む
 * (mockServerContext は同期・軽量のまま保つ)
 */
export async function loadStartPool(forms: MockServerContext["forms"]): Promise<PoolContext> {
  return loadPoolContext(getDb(), forms);
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
    scenarios: toScenarioDtos(scenarioIdsInOrder(questions), ctx.scenarios),
  };
}

import { getDb } from "@/db/client";
import { processAnswer } from "@/lib/answer/process";
import { answerRequestSchema } from "@/lib/answer/schema";
import { createAnswerStore, loadPoolContext } from "@/lib/answer/store";
import { requireSession } from "@/lib/auth/session";
import { loadBank } from "@/lib/bank/load";

/**
 * 学習回答 API(drill / practice。specs/03 §学習回答の書込プロトコル — 厳密 ACK 方式)。
 * クライアントは 200 を受けるまで Next を活性化しない。失敗時は同じ attempt_id で Retry する。
 * Proxy の optimistic check に加え、ハンドラ内で requireSession により再検証する(06)。
 *
 * POST /api/answers  → 200 { replayed, attempt, srs } | 400 | 401 | 404 | 409 { error, reason? } | 500
 */
const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function POST(request: Request) {
  const denied = requireSession(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = answerRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request", issues: parsed.error.issues }, 400);

  try {
    const db = getDb();
    const bank = loadBank();
    const result = await processAnswer(parsed.data, {
      store: createAnswerStore(db),
      findQuestion: (id) => bank.byId.get(id) ?? null,
      poolContext: () => loadPoolContext(db, bank.forms),
      now: new Date(),
    });
    if (result.status === 200) return json({ replayed: result.replayed, attempt: result.attempt, srs: result.srs });
    return json({ error: result.error, ...("reason" in result && result.reason ? { reason: result.reason } : {}) }, result.status);
  } catch (e) {
    console.error("[api/answers] 保存に失敗", e);
    return json({ error: "internal_error" }, 500);
  }
}

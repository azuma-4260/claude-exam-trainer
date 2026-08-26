import { requireSession } from "@/lib/auth/session";
import { questionIdSchema } from "@/lib/bank/schema";
import { toSessionDto } from "@/lib/mock/dto";
import { saveAnswer } from "@/lib/mock/lifecycle";
import { answerPatchRequestSchema, sessionIdSchema } from "@/lib/mock/schema";
import { mockServerContext } from "@/lib/mock/server";

/**
 * 回答・見直しフラグの即時保存(specs/03: 操作ごとに保存)。
 * サーバー時刻で期限検査 → 超過は timeout 提出に収束し、保存は 409 になる。
 *
 * PATCH /api/mock/sessions/[id]/answers/[qid] → 200 | 400 | 401 | 404 | 409 { error, session? } | 500
 */
const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; qid: string }> }) {
  const denied = requireSession(request);
  if (denied) return denied;

  const { id, qid } = await params;
  if (!sessionIdSchema.safeParse(id).success || !questionIdSchema.safeParse(qid).success)
    return json({ error: "invalid_request" }, 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = answerPatchRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request", issues: parsed.error.issues }, 400);

  try {
    const ctx = mockServerContext();
    const result = await saveAnswer(id, qid, parsed.data, ctx.deps);
    if (result.status === 200) return json({ ok: true });
    if (result.status === 409) return json({ error: result.error, session: toSessionDto(result.session) }, 409);
    return json({ error: result.error }, result.status);
  } catch (e) {
    console.error("[api/mock] 回答保存に失敗", e);
    return json({ error: "internal_error" }, 500);
  }
}

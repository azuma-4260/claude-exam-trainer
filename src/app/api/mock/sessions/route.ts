import { requireSession } from "@/lib/auth/session";
import { toSessionDto } from "@/lib/mock/dto";
import { startFullMock } from "@/lib/mock/lifecycle";
import { startMockRequestSchema } from "@/lib/mock/schema";
import { mockServerContext, sessionPayload } from "@/lib/mock/server";

/**
 * full Mock の開始(specs/03 §exam_session、05 S-5)。form_id 明示指定。
 * 進行中セッションが既にあれば(kind を問わず)409 + 参照(オーナー決定: 全 kind で 1 件)。
 *
 * POST /api/mock/sessions → 201 | 400 | 401 | 404 | 409 { error, session? } | 500
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
  const parsed = startMockRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request", issues: parsed.error.issues }, 400);

  try {
    const ctx = mockServerContext();
    const result = await startFullMock(parsed.data.form_id, ctx.forms, ctx.deps);
    if (result.status === 201) {
      const payload = sessionPayload(result.session, result.answers, ctx);
      if (!payload) return json({ error: "bank_inconsistent" }, 500);
      return json(payload, 201);
    }
    if (result.status === 409) return json({ error: result.error, session: toSessionDto(result.session) }, 409);
    return json({ error: result.error }, 404);
  } catch (e) {
    console.error("[api/mock/sessions] 開始に失敗", e);
    return json({ error: "internal_error" }, 500);
  }
}

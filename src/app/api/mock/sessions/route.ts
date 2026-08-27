import { requireSession } from "@/lib/auth/session";
import { toSessionDto } from "@/lib/mock/dto";
import { startFullMock } from "@/lib/mock/lifecycle";
import { startMockRequestSchema } from "@/lib/mock/schema";
import { loadStartPool, mockServerContext, sessionPayload } from "@/lib/mock/server";

/**
 * full Mock の開始(specs/03 §exam_session、05 S-5、01 FR-5)。form_id 明示指定。
 * 進行中セッションが既にあれば(kind を問わず)409 + 参照(オーナー決定: 全 kind で 1 件)。
 * availability NG(status≠active / 現行 rev 未解決フラグ)の form は 409 form_blocked(D3-2)。
 *
 * POST /api/mock/sessions → 201 | 400 | 401 | 404 | 409 { error, session? | open_flag_count, inactive_count } | 500
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
    const pool = await loadStartPool(ctx.forms);
    const result = await startFullMock(parsed.data.form_id, ctx.forms, pool.sessions, pool.flags, ctx.deps);
    if (result.status === 201) {
      const payload = sessionPayload(result.session, result.answers, ctx);
      if (!payload) return json({ error: "bank_inconsistent" }, 500);
      return json(payload, 201);
    }
    if (result.status === 409) {
      if (result.error === "form_blocked") {
        return json({ error: result.error, open_flag_count: result.openFlagCount, inactive_count: result.inactiveCount }, 409);
      }
      if (result.error === "form_not_next") {
        return json({ error: result.error, recommended_form_id: result.recommendedFormId }, 409);
      }
      return json({ error: result.error, session: toSessionDto(result.session) }, 409);
    }
    return json({ error: result.error }, 404);
  } catch (e) {
    console.error("[api/mock/sessions] 開始に失敗", e);
    return json({ error: "internal_error" }, 500);
  }
}

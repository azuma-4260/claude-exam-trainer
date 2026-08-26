import { requireSession } from "@/lib/auth/session";
import { toSessionDto } from "@/lib/mock/dto";
import { savePosition } from "@/lib/mock/lifecycle";
import { positionRequestSchema, sessionIdSchema } from "@/lib/mock/schema";
import { mockServerContext } from "@/lib/mock/server";

/**
 * 現在位置の即時保存(specs/03: 操作ごとに保存)。
 *
 * PATCH /api/mock/sessions/[id]/position → 200 | 400 | 401 | 404 | 409 { error, session? } | 500
 */
const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSession(request);
  if (denied) return denied;

  const { id } = await params;
  if (!sessionIdSchema.safeParse(id).success) return json({ error: "invalid_request" }, 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = positionRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request", issues: parsed.error.issues }, 400);

  try {
    const ctx = mockServerContext();
    const result = await savePosition(id, parsed.data.current_index, ctx.deps);
    if (result.status === 200) return json({ ok: true });
    if (result.status === 409) return json({ error: result.error, session: toSessionDto(result.session) }, 409);
    return json({ error: result.error }, result.status);
  } catch (e) {
    console.error("[api/mock] 位置保存に失敗", e);
    return json({ error: "internal_error" }, 500);
  }
}

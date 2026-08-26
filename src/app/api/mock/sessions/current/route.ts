import { requireSession } from "@/lib/auth/session";
import { toSessionDto } from "@/lib/mock/dto";
import { restoreCurrent } from "@/lib/mock/lifecycle";
import { mockServerContext, sessionPayload } from "@/lib/mock/server";

/**
 * 進行中セッションの復元(specs/05 S-5)。サーバー時刻で期限を検査し、
 * 超過していれば timeout 提出して kind="timed_out" で返す(クライアント時計に依存しない)。
 *
 * GET /api/mock/sessions/current → 200 { kind, ... } | 204 | 401 | 500
 */
const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function GET(request: Request) {
  const denied = requireSession(request);
  if (denied) return denied;

  try {
    const ctx = mockServerContext();
    const result = await restoreCurrent(ctx.deps);
    if (result.status === 204) return new Response(null, { status: 204 });
    if (result.kind === "timed_out") return json({ kind: "timed_out", session: toSessionDto(result.session) });
    const payload = sessionPayload(result.session, result.answers, ctx);
    if (!payload) return json({ error: "bank_inconsistent" }, 500);
    return json({ kind: "in_progress", ...payload });
  } catch (e) {
    console.error("[api/mock/sessions/current] 復元に失敗", e);
    return json({ error: "internal_error" }, 500);
  }
}

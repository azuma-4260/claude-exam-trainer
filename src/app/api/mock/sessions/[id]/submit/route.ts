import { requireSession } from "@/lib/auth/session";
import { toSessionDto } from "@/lib/mock/dto";
import { submitSession } from "@/lib/mock/lifecycle";
import { sessionIdSchema } from "@/lib/mock/schema";
import { mockServerContext } from "@/lib/mock/server";

/**
 * 提出(specs/03 §Mock の attempt 生成)。期限超過は timeout として記録される。
 * 再提出(リトライ)は claim 0 行 + submitted 検知で 200 replayed=true。
 *
 * POST /api/mock/sessions/[id]/submit → 200 { replayed, session } | 400 | 401 | 404 | 409 | 500
 */
const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSession(request);
  if (denied) return denied;

  const { id } = await params;
  if (!sessionIdSchema.safeParse(id).success) return json({ error: "invalid_request" }, 400);

  try {
    const result = await submitSession(id, mockServerContext().deps);
    if (result.status === 200) return json({ replayed: result.replayed, session: toSessionDto(result.session) });
    if (result.status === 409) return json({ error: result.error, session: toSessionDto(result.session) }, 409);
    return json({ error: result.error }, 404);
  } catch (e) {
    console.error("[api/mock] 提出に失敗", e);
    return json({ error: "internal_error" }, 500);
  }
}

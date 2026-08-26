import { requireSession } from "@/lib/auth/session";
import { toSessionDto } from "@/lib/mock/dto";
import { abandonSession } from "@/lib/mock/lifecycle";
import { sessionIdSchema } from "@/lib/mock/schema";
import { mockServerContext } from "@/lib/mock/server";

/**
 * abandon(specs/01 FR-5: full 不可・domain_mini のみ可)。
 *
 * POST /api/mock/sessions/[id]/abandon → 200 { session } | 400 | 401 | 404 | 409 | 500
 */
const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSession(request);
  if (denied) return denied;

  const { id } = await params;
  if (!sessionIdSchema.safeParse(id).success) return json({ error: "invalid_request" }, 400);

  try {
    const result = await abandonSession(id, mockServerContext().deps);
    if (result.status === 200) return json({ session: toSessionDto(result.session) });
    if (result.status === 409) return json({ error: result.error, session: toSessionDto(result.session) }, 409);
    return json({ error: result.error }, 404);
  } catch (e) {
    console.error("[api/mock] abandon に失敗", e);
    return json({ error: "internal_error" }, 500);
  }
}

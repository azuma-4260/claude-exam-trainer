import { z } from "zod";
import { getDb } from "@/db/client";
import { requireSession } from "@/lib/auth/session";
import { getStudyScope, setStudyScope } from "@/lib/scope/repo";
import { studyScopeSchema } from "@/lib/scope/scope";

/**
 * 学習スコープ API(specs/03 §study_setting、01 FR-10)。切替 UI は D6-2。
 * Proxy の optimistic check に加え、ハンドラ内で requireSession により再検証する(他の write API と同じ境界)。
 *
 * GET /api/study-setting              → 200 { scope }(行が無ければ ccar-f)
 * PUT /api/study-setting { scope }    → 200 { scope } | 400 | 401
 *                                       | 409 { error: "exam_date_unset", exams }(試験日未設定の exam を含む。fail closed)
 * 書込は study_setting の 1 行だけ(他テーブルは一切変更しない)。
 */

const json = (body: unknown, status = 200) => Response.json(body, { status });
const putRequestSchema = z.object({ scope: studyScopeSchema }).strict();

export async function GET(request: Request) {
  const denied = requireSession(request);
  if (denied) return denied;
  try {
    return json({ scope: await getStudyScope(getDb()) });
  } catch (e) {
    console.error("[api/study-setting] 取得に失敗", e);
    return json({ error: "internal_error" }, 500);
  }
}

export async function PUT(request: Request) {
  const denied = requireSession(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = putRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request", issues: parsed.error.issues }, 400);

  try {
    const result = await setStudyScope(getDb(), parsed.data.scope, new Date());
    if (!result.ok) return json({ error: result.error, exams: result.exams }, 409);
    return json({ scope: result.scope });
  } catch (e) {
    console.error("[api/study-setting] 保存に失敗", e);
    return json({ error: "internal_error" }, 500);
  }
}

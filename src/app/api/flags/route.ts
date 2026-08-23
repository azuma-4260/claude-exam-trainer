import { getDb } from "@/db/client";
import { requireSession } from "@/lib/auth/session";
import { findOpenFlag, upsertOpenFlag } from "@/lib/flags/repo";
import { flagRequestSchema } from "@/lib/flags/schema";
import { questionIdSchema } from "@/lib/bank/schema";

/**
 * 悪問フラグ API(specs/03 §question_flag、01 FR-9、06 §認証)。
 * Proxy の optimistic check に加え、ハンドラ内で requireSession により再検証する。
 *
 * POST /api/flags  { question_id, question_rev, reason, memo? } → 200 { flag }
 *   同一 rev の再フラグは既存 open 行の update、別 rev は新規行
 * GET  /api/flags?question_id=&question_rev=  → 200 { flag: row | null }
 *   特定 rev の open フラグの有無のみ。未解決一覧(現行 rev のみ)は D4-3 の設定画面で実装する
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
  const parsed = flagRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  }

  try {
    const flag = await upsertOpenFlag(getDb(), parsed.data);
    return json({ flag });
  } catch (e) {
    console.error("[api/flags] upsert に失敗", e);
    return json({ error: "internal_error" }, 500);
  }
}

export async function GET(request: Request) {
  const denied = requireSession(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const id = questionIdSchema.safeParse(url.searchParams.get("question_id"));
  const rev = Number(url.searchParams.get("question_rev"));
  if (!id.success || !Number.isInteger(rev) || rev < 1) {
    return json({ error: "invalid_request" }, 400);
  }

  try {
    const flag = await findOpenFlag(getDb(), id.data, rev);
    return json({ flag });
  } catch (e) {
    console.error("[api/flags] 取得に失敗", e);
    return json({ error: "internal_error" }, 500);
  }
}

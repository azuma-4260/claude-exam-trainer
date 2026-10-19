import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { toSessionDto } from "@/lib/mock/dto";
import { startDomainMini, startFullMock } from "@/lib/mock/lifecycle";
import { startMiniRequestSchema, startMockRequestSchema } from "@/lib/mock/schema";
import { loadStartPool, mockServerContext, sessionPayload } from "@/lib/mock/server";
import { inScope } from "@/lib/scope/scope";

/**
 * Mock の開始(specs/03 §exam_session、05 S-5、01 FR-5)。
 * - `{ exam, form_id }`: full(D6-4)。form を明示指定。availability NG(status≠active / 現行 rev 未解決フラグ)の
 *   form は 409 form_blocked、自動選択外の未実施フォームは 409 form_not_next(D3-2)
 * - `{ kind: "domain_mini", exam, domain_id }`: ドメイン別ミニ(D4-1)。独立 MCQ プールからサーバーが選定。
 *   プール不足は 409 domain_pool_short { pool_count, min_count }。学習スコープ外の exam・未知ドメインは 404 unknown_domain
 * 進行中セッションが既にあれば(kind を問わず)409 + 参照(オーナー決定: 全 kind で 1 件)。
 *
 * POST /api/mock/sessions → 201 | 400 | 401 | 404 | 409 { error, session? | open_flag_count, inactive_count | recommended_form_id | pool_count, min_count } | 500
 * full の開始候補は学習スコープ内 exam のフォーム。スコープ外の exam・未知の (exam, form_id) は 404 unknown_form。
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
  const parsed = z.union([startMockRequestSchema, startMiniRequestSchema]).safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request", issues: parsed.error.issues }, 400);

  try {
    const ctx = mockServerContext();
    const pool = await loadStartPool(ctx.forms);
    // 開始候補は学習スコープ内 exam だけ(01 FR-5 / FR-10)。提出状態は全 exam の session で判定する
    const result =
      "form_id" in parsed.data
        ? await startFullMock({ exam: parsed.data.exam, formId: parsed.data.form_id }, pool.startForms, pool.sessions, pool.flags, ctx.deps)
        : await startDomainMini(
            parsed.data.domain_id,
            ctx.questions,
            pool,
            inScope(pool.scope, parsed.data.exam) ? ctx.syllabusFor(parsed.data.exam) : null,
            ctx.deps,
          );
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
      if (result.error === "domain_pool_short") {
        return json({ error: result.error, pool_count: result.poolCount, min_count: result.minCount }, 409);
      }
      return json({ error: result.error, session: toSessionDto(result.session) }, 409);
    }
    return json({ error: result.error }, 404);
  } catch (e) {
    console.error("[api/mock/sessions] 開始に失敗", e);
    return json({ error: "internal_error" }, 500);
  }
}

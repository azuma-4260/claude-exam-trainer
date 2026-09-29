import { getDb } from "@/db/client";
import { loadPoolContext } from "@/lib/answer/store";
import { loadMultiBank } from "@/lib/bank/runtime";
import { buildMockFormOptions } from "@/lib/mock/availability";
import { mockBankContext, startFormsFor } from "@/lib/mock/context";
import { getStudyScope } from "@/lib/scope/repo";
import { showExamLabel } from "@/lib/scope/scope";
import { MockStartScreen } from "@/components/mock/start-screen";

/**
 * S-5 Mock 開始画面(specs/05、01 FR-5)。
 * D3-2: availability 検証結果の表示・未実施フォーム自動選択・rehearsal ラベル。
 * 開始候補は学習スコープ内 exam のフォーム(v1.3)。提出状態は (exam, form_id) で判定する。
 * D6-2: both ではフォームに exam ラベル、推奨は exam ごと。開始リクエストへの exam 追加は D6-4。ドメイン別ミニは D4-1。
 */

// DB(exam_session / question_flag)を読むためビルド時静的化を禁止(Home / Drill と同じ)
export const dynamic = "force-dynamic";

export default async function MockPage() {
  const ctx = mockBankContext(loadMultiBank());
  const db = getDb();
  const [poolCtx, scope] = await Promise.all([loadPoolContext(db, ctx.forms), getStudyScope(db)]);
  const formOptions = buildMockFormOptions(startFormsFor(ctx.forms, scope), poolCtx.sessions, poolCtx.flags, ctx.findQuestion);
  return <MockStartScreen formOptions={formOptions} showExamLabel={showExamLabel(scope)} />;
}

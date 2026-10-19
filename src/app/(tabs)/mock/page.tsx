import { getDb } from "@/db/client";
import { loadPoolContext } from "@/lib/answer/store";
import { loadMultiBank, scopeBank } from "@/lib/bank/runtime";
import { domainIdSchema } from "@/lib/bank/schema";
import { buildMiniDomainOptions, buildMockFormOptions } from "@/lib/mock/availability";
import { mockBankContext, startFormsFor } from "@/lib/mock/context";
import { getStudyScope } from "@/lib/scope/repo";
import { showExamLabel } from "@/lib/scope/scope";
import { MockStartScreen } from "@/components/mock/start-screen";

/**
 * S-5 Mock 開始画面(specs/05、01 FR-5)。
 * D3-2: availability 検証結果の表示・未実施フォーム自動選択・rehearsal ラベル。
 * 開始候補は学習スコープ内 exam のフォーム(v1.3)。提出状態は (exam, form_id) で判定する。
 * D6-2: both ではフォームに exam ラベル、推奨は exam ごと。
 * D4-1: ドメイン別ミニ模試の選択肢(スコープ内 exam の独立 MCQ プール数から導出)。`?domain=f-d2` は S-6 の
 * 「弱点ドメインのミニ模試」ショートカットからの初期選択
 */

// DB(exam_session / question_flag)を読むためビルド時静的化を禁止(Home / Drill と同じ)
export const dynamic = "force-dynamic";

export default async function MockPage({ searchParams }: { searchParams: Promise<{ domain?: string | string[] }> }) {
  const { domain } = await searchParams;
  const requested = Array.isArray(domain) ? domain[0] : domain;
  const initialDomainId = domainIdSchema.safeParse(requested).success ? (requested as string) : null;

  const multi = loadMultiBank();
  const ctx = mockBankContext(multi);
  const db = getDb();
  const [poolCtx, scope] = await Promise.all([loadPoolContext(db, ctx.forms), getStudyScope(db)]);
  const formOptions = buildMockFormOptions(startFormsFor(ctx.forms, scope), poolCtx.sessions, poolCtx.flags, ctx.findQuestion);
  const scoped = scopeBank(multi, scope);
  const miniOptions = scoped.syllabi.flatMap((s) => buildMiniDomainOptions(s, scoped.bank.questions, poolCtx));
  return (
    <MockStartScreen
      formOptions={formOptions}
      miniOptions={miniOptions}
      initialDomainId={initialDomainId}
      showExamLabel={showExamLabel(scope)}
    />
  );
}

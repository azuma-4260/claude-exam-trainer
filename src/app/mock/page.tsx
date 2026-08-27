import { getDb } from "@/db/client";
import { loadPoolContext } from "@/lib/answer/store";
import { loadBank } from "@/lib/bank/load";
import { buildMockFormOptions } from "@/lib/mock/availability";
import { MockStartScreen } from "@/components/mock/start-screen";

/**
 * S-5 Mock 開始画面(specs/05、01 FR-5)。
 * D3-2: availability 検証結果の表示・未実施フォーム自動選択・rehearsal ラベル。
 * ドメイン別ミニは D4-1。
 */

// DB(exam_session / question_flag)を読むためビルド時静的化を禁止(Home / Drill と同じ)
export const dynamic = "force-dynamic";

export default async function MockPage() {
  const bank = loadBank();
  const poolCtx = await loadPoolContext(getDb(), bank.forms);
  const formOptions = buildMockFormOptions(bank.forms, poolCtx.sessions, poolCtx.flags, (id) => bank.byId.get(id) ?? null);
  return <MockStartScreen formOptions={formOptions} />;
}

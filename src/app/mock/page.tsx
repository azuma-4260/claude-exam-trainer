import { loadBank } from "@/lib/bank/load";
import { MockStartScreen } from "@/components/mock/start-screen";

/**
 * S-5 Mock 開始画面(specs/05)。
 * D3-1 スコープ: 進行中の「再開」最優先表示 + form_id 明示指定の full 開始。
 * availability 検証・未実施フォーム自動選択・rehearsal ラベルは D3-2、ドメイン別ミニは D4-1。
 */
export default function MockPage() {
  const bank = loadBank();
  const forms = bank.forms.map((f) => ({ id: f.id, questionCount: f.question_ids.length }));
  return <MockStartScreen forms={forms} />;
}

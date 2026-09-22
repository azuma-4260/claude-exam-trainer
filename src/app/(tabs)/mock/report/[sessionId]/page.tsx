import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { loadBank } from "@/lib/bank/load";
import { buildMockReport } from "@/lib/mock/report";
import { sessionIdSchema } from "@/lib/mock/schema";
import { loadSyllabusCached } from "@/lib/mock/server";
import { createMockStore, listMockAttempts, listSubmittedFullSessions } from "@/lib/mock/store";
import { MockReportScreen } from "@/components/mock/report-screen";

/**
 * S-6 模試レポート(specs/05 S-6)。提出済みセッションのみ表示する:
 * - in_progress は採点・解説を漏らさないため試験画面へ戻す(期限超過の解決もそちらの復元経路が担う)
 * - abandoned は開始画面へ
 * 正誤は提出時一括生成の attempt、rehearsal は同一 form の先行 submitted から毎回導出する。
 */

export const dynamic = "force-dynamic";

export default async function MockReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!sessionIdSchema.safeParse(sessionId).success) notFound();

  const db = getDb();
  const session = await createMockStore(db).findSession(sessionId);
  if (!session) notFound();
  if (session.status === "in_progress") redirect("/mock/session");
  if (session.status === "abandoned") redirect("/mock");

  const bank = loadBank();
  const [attempts, priorSessions] = await Promise.all([
    listMockAttempts(db, sessionId),
    session.formId ? listSubmittedFullSessions(db, session.exam, session.formId) : Promise.resolve([]),
  ]);
  const report = buildMockReport({
    session,
    attempts,
    priorSessions,
    findQuestion: (id) => bank.byId.get(id) ?? null,
    syllabus: loadSyllabusCached(),
  });
  return <MockReportScreen report={report} />;
}

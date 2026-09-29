import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { loadMultiBank } from "@/lib/bank/runtime";
import type { Exam } from "@/lib/bank/schema";
import { buildMockReport } from "@/lib/mock/report";
import { sessionIdSchema } from "@/lib/mock/schema";
import { syllabusFor } from "@/lib/mock/server";
import { createMockStore, listMockAttempts, listSubmittedFullSessions } from "@/lib/mock/store";
import { MockReportScreen } from "@/components/mock/report-screen";

/**
 * S-6 模試レポート(specs/05 S-6)。提出済みセッションのみ表示する:
 * - in_progress は採点・解説を漏らさないため試験画面へ戻す(期限超過の解決もそちらの復元経路が担う)
 * - abandoned は開始画面へ
 * 正誤は提出時一括生成の attempt、rehearsal は同一 form の先行 submitted から毎回導出する。
 * レポートは学習スコープに依存しない(問題は全 exam のバンク、ドメインはセッションの exam の syllabus)。
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

  const bank = loadMultiBank().all;
  const syllabus = syllabusFor(session.exam as Exam);
  // 提出済みセッションの exam のバンクが無いのは deploy 不整合(ドメイン集計ができない)
  if (!syllabus) throw new Error(`exam ${session.exam} の syllabus が無い(session ${session.id})`);
  const [attempts, priorSessions] = await Promise.all([
    listMockAttempts(db, sessionId),
    session.formId ? listSubmittedFullSessions(db, session.exam, session.formId) : Promise.resolve([]),
  ]);
  const report = buildMockReport({
    session,
    attempts,
    priorSessions,
    findQuestion: (id) => bank.byId.get(id) ?? null,
    syllabus,
  });
  return <MockReportScreen report={report} />;
}

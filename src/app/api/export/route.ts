import { getDb } from "@/db/client";
import { requireSession } from "@/lib/auth/session";
import { loadMultiBank } from "@/lib/bank/runtime";
import { examSchema } from "@/lib/bank/schema";
import { filterExportByExam } from "@/lib/export/filter";
import { loadExportData } from "@/lib/export/load";
import { jstCalendarDate } from "@/lib/srs/jst";

/**
 * specs/03 §3。Proxy に加え、ハンドラ内でも認証を再検証する。
 * GET /api/export            → 全 exam(study_setting を含む)
 * GET /api/export?exam=ccar-f → その exam の行だけ(study_setting は含めない)。不正な exam は 400
 * export は学習スコープに依存しない(01 FR-10)。
 */
export async function GET(request: Request) {
  const denied = requireSession(request);
  if (denied) return denied;

  const examParam = new URL(request.url).searchParams.get("exam");
  const exam = examParam === null ? null : examSchema.safeParse(examParam);
  if (exam && !exam.success) return Response.json({ error: "invalid_exam" }, { status: 400 });

  try {
    const data = await loadExportData(getDb(), loadMultiBank().all);
    const body = exam ? filterExportByExam(data, exam.data) : data;
    const label = exam ? exam.data : "all";
    return Response.json(body, {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="export-${label}-${jstCalendarDate(new Date())}.json"`,
      },
    });
  } catch (e) {
    console.error("[api/export] 取得に失敗", e);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}

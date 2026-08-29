import { getDb } from "@/db/client";
import { loadBank } from "@/lib/bank/load";
import { requireSession } from "@/lib/auth/session";
import { loadExportData } from "@/lib/export/load";
import { jstCalendarDate } from "@/lib/srs/jst";

/** specs/03 §3。Proxy に加え、ハンドラ内でも認証を再検証する。 */
export async function GET(request: Request) {
  const denied = requireSession(request);
  if (denied) return denied;

  try {
    const data = await loadExportData(getDb(), loadBank());
    return Response.json(data, {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="ccar-f-export-${jstCalendarDate(new Date())}.json"`,
      },
    });
  } catch (e) {
    console.error("[api/export] 取得に失敗", e);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}

/**
 * POST /api/answers の応答分類(厳密 ACK の共通部品)。
 * Drill(S-3)/ Practice(S-4)の両状態機械が同じ分類を共有し、拒否理由の解釈が
 * 画面間でずれないようにする(D2-1 で src/lib/drill/machine.ts から切り出し)。
 */

export type SaveState = "saving" | "saved" | "failed";

export type RejectReason =
  | "bad_request"
  | "unauthorized"
  | "unknown_question"
  | "stale_question_rev"
  | "attempt_payload_mismatch"
  | "not_eligible";

/** 保存 ACK の結果イベント。各画面の reducer イベント型はこの union を包含する */
export type AckEvent =
  | { type: "SAVE_OK" }
  | { type: "SAVE_FAIL"; message?: string }
  | { type: "SAVE_REJECTED"; reason: RejectReason };

/**
 * HTTP 応答 → イベント(全ステータス網羅)。
 * 200 → 成功(replayed 含む)/ 409 は body.error で振り分け / その他 4xx は安全側の恒久拒否 /
 * 5xx・ネットワーク例外は SAVE_FAIL(Retry 可能)。
 */
export function classifyAnswerResponse(status: number, body: unknown): AckEvent {
  if (status === 200) return { type: "SAVE_OK" };
  if (status === 401) return { type: "SAVE_REJECTED", reason: "unauthorized" };
  if (status === 404) return { type: "SAVE_REJECTED", reason: "unknown_question" };
  if (status === 409) {
    const error = typeof body === "object" && body !== null ? (body as { error?: string }).error : undefined;
    if (error === "stale_question_rev" || error === "attempt_payload_mismatch" || error === "not_eligible") {
      return { type: "SAVE_REJECTED", reason: error };
    }
    return { type: "SAVE_REJECTED", reason: "bad_request" };
  }
  if (status >= 400 && status < 500) return { type: "SAVE_REJECTED", reason: "bad_request" };
  return { type: "SAVE_FAIL", message: `HTTP ${status}` };
}

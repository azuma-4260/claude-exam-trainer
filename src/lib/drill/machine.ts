import type { AnswerRequest } from "@/lib/answer/schema";
import type { DrillItem } from "@/lib/queue/serve";

/**
 * S-3 Quick Drill の ACK 状態機械(specs/05 S-3、03 §学習回答の書込プロトコル)。
 * 純関数 reducer。UUID(attemptId)と経過時間はイベント payload で注入して純粋性を保つ。
 *
 * 厳密 ACK の要点:
 * - 正誤・解説は回答直後に表示してよいが、保存 ACK(SAVE_OK)まで Next を活性化しない
 * - 失敗(SAVE_FAIL)時は回答状態を保持し Retry(attemptId = 冪等キーを保持して同一 payload 再送)
 * - 恒久エラー(4xx)は rejected とし Retry を出さない。not_eligible のみ SKIP で先へ進める
 * - 自動巻き戻し・次問先行・outbox は実装しない
 */

export type FlashRating = 1 | 2 | 3 | 4;

export type LocalGrade =
  | { kind: "flash"; rating: FlashRating }
  | { kind: "mcq"; chosen: string[]; isCorrect: boolean };

export type SaveState = "saving" | "saved" | "failed";

export type RejectReason =
  | "bad_request"
  | "unauthorized"
  | "unknown_question"
  | "stale_question_rev"
  | "attempt_payload_mismatch"
  | "not_eligible";

export type ItemStep =
  | { step: "front" }
  | { step: "back" }
  | { step: "choosing"; chosen: string[] }
  | {
      step: "answered";
      local: LocalGrade;
      attemptId: string;
      elapsedMs: number | null;
      save: SaveState;
      failMessage?: string;
    }
  | { step: "rejected"; reason: RejectReason };

export type DrillResult = { questionId: string } & (LocalGrade | { kind: "skipped" });

export type DrillState = {
  items: readonly DrillItem[];
  index: number;
  current: ItemStep;
  results: DrillResult[];
  phase: "running" | "summary";
};

export type DrillEvent =
  | { type: "FLIP" }
  | { type: "RATE"; rating: FlashRating; attemptId: string; elapsedMs: number | null }
  | { type: "CHOOSE"; label: string; attemptId: string; elapsedMs: number | null }
  | { type: "TOGGLE"; label: string }
  | { type: "SUBMIT"; attemptId: string; elapsedMs: number | null }
  | { type: "SAVE_OK" }
  | { type: "SAVE_FAIL"; message?: string }
  | { type: "SAVE_REJECTED"; reason: RejectReason }
  | { type: "RETRY" }
  | { type: "NEXT" }
  | { type: "SKIP" }
  | { type: "FLAGGED" };

export function initialStepFor(item: DrillItem): ItemStep {
  return item.type === "flash" ? { step: "front" } : { step: "choosing", chosen: [] };
}

export function initialDrillState(items: readonly DrillItem[]): DrillState {
  if (items.length === 0) throw new Error("Drill セッションは 1 問以上(空は呼び出し側で empty state)");
  return { items, index: 0, current: initialStepFor(items[0]), results: [], phase: "running" };
}

/** MCQ の即時採点(process.ts の grade と同じ集合一致・部分点なし) */
function mcqIsCorrect(item: DrillItem, chosen: readonly string[]): boolean {
  const answer = new Set(item.answer ?? []);
  const picked = new Set(chosen);
  return answer.size === picked.size && [...picked].every((l) => answer.has(l));
}

export function canNext(state: DrillState): boolean {
  return state.current.step === "answered" && state.current.save === "saved";
}

/** 現在の結果を results に積んで次問へ(最終問なら summary) */
function advance(state: DrillState, result: DrillResult): DrillState {
  const results = [...state.results, result];
  const nextIndex = state.index + 1;
  if (nextIndex >= state.items.length) {
    return { ...state, results, phase: "summary" };
  }
  return { ...state, results, index: nextIndex, current: initialStepFor(state.items[nextIndex]) };
}

export function drillReducer(state: DrillState, event: DrillEvent): DrillState {
  if (state.phase === "summary") return state;
  const item = state.items[state.index];
  const cur = state.current;

  switch (event.type) {
    case "FLIP":
      if (item.type !== "flash" || cur.step !== "front") return state;
      return { ...state, current: { step: "back" } };

    case "RATE": {
      // flash は裏面(解答面)を見た上での自己評価がそのまま送信(S-3: 評価ボタンなしの確定操作)
      if (item.type !== "flash" || cur.step !== "back") return state;
      return {
        ...state,
        current: {
          step: "answered",
          local: { kind: "flash", rating: event.rating },
          attemptId: event.attemptId,
          elapsedMs: event.elapsedMs,
          save: "saving",
        },
      };
    }

    case "CHOOSE": {
      // 単一選択は選択 = 即採点 = 送信(評価ボタンなし)
      if (item.type !== "mcq_single" || cur.step !== "choosing") return state;
      const chosen = [event.label];
      return {
        ...state,
        current: {
          step: "answered",
          local: { kind: "mcq", chosen, isCorrect: mcqIsCorrect(item, chosen) },
          attemptId: event.attemptId,
          elapsedMs: event.elapsedMs,
          save: "saving",
        },
      };
    }

    case "TOGGLE": {
      // 複数選択(Select TWO 等)は即時確定できないため選択をトグルし SUBMIT で確定
      if (item.type !== "mcq_multi" || cur.step !== "choosing") return state;
      const chosen = cur.chosen.includes(event.label)
        ? cur.chosen.filter((l) => l !== event.label)
        : [...cur.chosen, event.label];
      return { ...state, current: { step: "choosing", chosen } };
    }

    case "SUBMIT": {
      if (item.type !== "mcq_multi" || cur.step !== "choosing" || cur.chosen.length === 0) return state;
      return {
        ...state,
        current: {
          step: "answered",
          local: { kind: "mcq", chosen: cur.chosen, isCorrect: mcqIsCorrect(item, cur.chosen) },
          attemptId: event.attemptId,
          elapsedMs: event.elapsedMs,
          save: "saving",
        },
      };
    }

    case "SAVE_OK":
      if (cur.step !== "answered" || cur.save !== "saving") return state;
      return { ...state, current: { ...cur, save: "saved", failMessage: undefined } };

    case "SAVE_FAIL":
      if (cur.step !== "answered" || cur.save !== "saving") return state;
      return { ...state, current: { ...cur, save: "failed", failMessage: event.message } };

    case "RETRY":
      // attemptId(冪等キー)を保持したまま再送。コンポーネントが同一 payload を再 POST する
      if (cur.step !== "answered" || cur.save !== "failed") return state;
      return { ...state, current: { ...cur, save: "saving", failMessage: undefined } };

    case "SAVE_REJECTED":
      if (cur.step !== "answered" || cur.save !== "saving") return state;
      return { ...state, current: { step: "rejected", reason: event.reason } };

    case "NEXT": {
      if (cur.step !== "answered" || cur.save !== "saved") return state;
      return advance(state, { questionId: item.questionId, ...cur.local });
    }

    case "SKIP":
      if (cur.step !== "rejected") return state;
      return advance(state, { questionId: item.questionId, kind: "skipped" });

    case "FLAGGED":
      // 未回答でフラグ → open flag により保存は 409 not_eligible になるため先回りして skip 可能化。
      // 回答保存済み・保存中は no-op(保存済み結果は巻き戻さない)
      if (cur.step !== "front" && cur.step !== "back" && cur.step !== "choosing") return state;
      return { ...state, current: { step: "rejected", reason: "not_eligible" } };

    default:
      return state;
  }
}

/** answered ステップ → POST /api/answers の payload(src/lib/answer/schema.ts に適合。mode は常に drill) */
export function toAnswerRequest(item: DrillItem, step: Extract<ItemStep, { step: "answered" }>): AnswerRequest {
  const common = {
    attempt_id: step.attemptId,
    question_id: item.questionId,
    question_rev: item.rev,
    mode: "drill" as const,
    elapsed_ms: step.elapsedMs,
  };
  return step.local.kind === "flash"
    ? { ...common, kind: "flash", rating: step.local.rating }
    : { ...common, kind: "mcq", chosen: step.local.chosen };
}

/**
 * HTTP 応答 → イベント(全ステータス網羅)。
 * 200 → 成功(replayed 含む)/ 409 は body.error で振り分け / その他 4xx は安全側の恒久拒否 /
 * 5xx・ネットワーク例外は SAVE_FAIL(Retry 可能)。
 */
export function classifyAnswerResponse(status: number, body: unknown): DrillEvent {
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

export type DrillSummary = {
  flashRatings: Record<FlashRating, number>;
  mcqTotal: number;
  mcqCorrect: number;
  skipped: number;
};

/** サマリ集計(specs/05 S-3: flash は rating 分布、MCQ のみ正答率。skipped は分母から除外) */
export function summarize(results: readonly DrillResult[]): DrillSummary {
  const summary: DrillSummary = { flashRatings: { 1: 0, 2: 0, 3: 0, 4: 0 }, mcqTotal: 0, mcqCorrect: 0, skipped: 0 };
  for (const r of results) {
    if (r.kind === "skipped") summary.skipped += 1;
    else if (r.kind === "flash") summary.flashRatings[r.rating] += 1;
    else {
      summary.mcqTotal += 1;
      if (r.isCorrect) summary.mcqCorrect += 1;
    }
  }
  return summary;
}

import type { RejectReason, SaveState } from "@/lib/answer/ack";
import type { AnswerRequest } from "@/lib/answer/schema";
import type { PracticeItem } from "./serve";

/**
 * S-4 Practice の ACK 状態機械(specs/05 S-4、03 §学習回答の書込プロトコル)。
 * 純関数 reducer。attemptId と経過時間はイベント payload で注入して純粋性を保つ。
 *
 * S-3(src/lib/drill/machine.ts)との差分は 1 点のみ:
 * - 単一選択でも「選択 → Answer」の明示操作で確定する(S-4。S-3 の単一選択は選択即送信)
 * ACK 意味論(保存 ACK まで Next disabled / 失敗は同一 attemptId で Retry / 4xx は rejected)は S-3 と同一。
 */

export type PracticeStep =
  | { step: "choosing"; chosen: string[] }
  | {
      step: "answered";
      chosen: string[];
      isCorrect: boolean;
      attemptId: string;
      elapsedMs: number | null;
      save: SaveState;
      failMessage?: string;
    }
  | { step: "rejected"; reason: RejectReason };

export type PracticeResult = { questionId: string } & ({ kind: "mcq"; isCorrect: boolean } | { kind: "skipped" });

export type PracticeState = {
  items: readonly PracticeItem[];
  index: number;
  current: PracticeStep;
  results: PracticeResult[];
  phase: "running" | "done";
};

export type PracticeEvent =
  | { type: "TOGGLE"; label: string }
  | { type: "ANSWER"; attemptId: string; elapsedMs: number | null }
  | { type: "SAVE_OK" }
  | { type: "SAVE_FAIL"; message?: string }
  | { type: "SAVE_REJECTED"; reason: RejectReason }
  | { type: "RETRY" }
  | { type: "NEXT" }
  | { type: "SKIP" }
  | { type: "FLAGGED" };

export function initialPracticeState(items: readonly PracticeItem[]): PracticeState {
  if (items.length === 0) throw new Error("Practice バッチは 1 問以上(空は呼び出し側で empty state)");
  return { items, index: 0, current: { step: "choosing", chosen: [] }, results: [], phase: "running" };
}

/** MCQ の即時採点(process.ts の grade と同じ集合一致・部分点なし) */
function mcqIsCorrect(item: PracticeItem, chosen: readonly string[]): boolean {
  const answer = new Set(item.answer);
  const picked = new Set(chosen);
  return answer.size === picked.size && [...picked].every((l) => answer.has(l));
}

export function canNext(state: PracticeState): boolean {
  return state.current.step === "answered" && state.current.save === "saved";
}

/** 現在の結果を results に積んで次問へ(最終問なら done) */
function advance(state: PracticeState, result: PracticeResult): PracticeState {
  const results = [...state.results, result];
  const nextIndex = state.index + 1;
  if (nextIndex >= state.items.length) {
    return { ...state, results, phase: "done" };
  }
  return { ...state, results, index: nextIndex, current: { step: "choosing", chosen: [] } };
}

export function practiceReducer(state: PracticeState, event: PracticeEvent): PracticeState {
  if (state.phase === "done") return state;
  const item = state.items[state.index];
  const cur = state.current;

  switch (event.type) {
    case "TOGGLE": {
      if (cur.step !== "choosing") return state;
      // 単一選択は置換(ラジオ的)、複数選択は追加/削除。どちらも ANSWER で確定する
      const chosen =
        item.type === "mcq_single"
          ? [event.label]
          : cur.chosen.includes(event.label)
            ? cur.chosen.filter((l) => l !== event.label)
            : [...cur.chosen, event.label];
      return { ...state, current: { step: "choosing", chosen } };
    }

    case "ANSWER": {
      if (cur.step !== "choosing" || cur.chosen.length === 0) return state;
      return {
        ...state,
        current: {
          step: "answered",
          chosen: cur.chosen,
          isCorrect: mcqIsCorrect(item, cur.chosen),
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

    case "NEXT":
      if (cur.step !== "answered" || cur.save !== "saved") return state;
      return advance(state, { questionId: item.questionId, kind: "mcq", isCorrect: cur.isCorrect });

    case "SKIP":
      if (cur.step !== "rejected") return state;
      return advance(state, { questionId: item.questionId, kind: "skipped" });

    case "FLAGGED":
      // 未回答でフラグ → open flag により保存は 409 not_eligible になるため先回りして skip 可能化。
      // 回答保存済み・保存中は no-op(保存済み結果は巻き戻さない)
      if (cur.step !== "choosing") return state;
      return { ...state, current: { step: "rejected", reason: "not_eligible" } };

    default:
      return state;
  }
}

/** answered ステップ → POST /api/answers の payload(mode は常に practice) */
export function toAnswerRequest(item: PracticeItem, step: Extract<PracticeStep, { step: "answered" }>): AnswerRequest {
  return {
    attempt_id: step.attemptId,
    question_id: item.questionId,
    question_rev: item.rev,
    mode: "practice",
    elapsed_ms: step.elapsedMs,
    kind: "mcq",
    chosen: step.chosen,
  };
}

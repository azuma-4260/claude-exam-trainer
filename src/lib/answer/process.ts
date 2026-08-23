import { createEmptyCard, Rating, type Card, type Grade } from "ts-fsrs";
import type { AttemptRow } from "@/db/schema";
import { evaluatePool, type PoolContext } from "@/lib/bank/pool";
import type { Question } from "@/lib/bank/schema";
import { cardToRow, rowToCard, type SrsStateUpsert } from "@/lib/srs/card-row";
import { applyRating } from "@/lib/srs/scheduler";
import type { AnswerRequest } from "./schema";

/**
 * 学習回答の書込プロトコル(specs/03 §学習回答の書込プロトコル — 厳密 ACK 方式・唯一の実装)。
 * DB 非依存の純粋な手順として書き、I/O は AnswerStore で注入する(T-write は fake store で検証)。
 *
 * サーバー処理順序(03):
 *  1. session / auth / payload validation(route 側)
 *  2. attempt_id が既存なら既存 payload と照合。一致 → 即 200(再適用しない)、不一致 → 409
 *  3. 現在の srs_state を取得(無ければ createEmptyCard)
 *  4. サーバー側で correctness / rating を確定し、ts-fsrs を実行
 *  5. non-interactive transaction で attempt INSERT + srs_state INSERT/UPDATE を原子的に実行
 *  6. attempt PK 競合で rollback した場合、既存 attempt を再取得し同一 payload なら 200
 *
 * 禁止(03): INSERT ... ON CONFLICT DO NOTHING の後で無条件に srs_state を更新する実装。
 * ここでは attempt は素の INSERT(PK 競合で batch 全体が rollback)とし、競合時は再取得で判定する。
 */

export class AttemptPkConflictError extends Error {
  constructor() {
    super("attempt PK 競合");
  }
}

export interface AnswerStore {
  findAttempt(attemptId: string): Promise<AttemptRow | null>;
  findSrsState(questionId: string): Promise<SrsStateUpsert | null>;
  /** attempt INSERT + srs_state upsert を 1 トランザクションで。attempt PK 競合は AttemptPkConflictError を投げる */
  commit(attempt: AttemptRow, srs: SrsStateUpsert | null): Promise<void>;
}

export interface AnswerDeps {
  store: AnswerStore;
  /** バンクから現行の問題を引く(無ければ null) */
  findQuestion(questionId: string): Question | null;
  /** 出題判定に必要な DB 行(forms / submitted sessions / open flags) */
  poolContext(): Promise<PoolContext>;
  now: Date;
}

export type AnswerResult =
  | { status: 200; replayed: boolean; attempt: AttemptRow; srs: SrsStateUpsert | null }
  | { status: 404; error: "unknown_question" }
  | { status: 409; error: "attempt_payload_mismatch" | "stale_question_rev" | "not_eligible"; reason?: string };

/** 冪等照合はクライアント送信フィールドのみ(サーバー導出の applied_rating / is_correct / answered_at は含めない) */
export function samePayload(existing: AttemptRow, input: AnswerRequest): boolean {
  const chosen = input.kind === "mcq" ? input.chosen : null;
  const elapsed = input.elapsed_ms ?? null;
  return (
    existing.questionId === input.question_id &&
    existing.questionRev === input.question_rev &&
    existing.mode === input.mode &&
    existing.elapsedMs === elapsed &&
    sameArray(existing.chosen, chosen) &&
    // flash は利用者 rating がそのまま applied_rating(SRS 更新あり)か、SRS 非更新なら記録されない
    (input.kind !== "flash" || existing.appliedRating === null || existing.appliedRating === input.rating)
  );
}

function sameArray(a: string[] | null, b: string[] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((v) => sb.has(v));
}

/**
 * 正誤と rating の確定(04 §モード行列)。
 * - MCQ: 集合一致・部分点なし。正解 → Good / 不正解 → Again
 * - flash: 利用者の 4 択評価をそのまま rating にする。is_correct は Again のみ false、Hard / Good / Easy は true
 *   (04 §モード行列で確定: 「思い出せた」を正解とみなし、coverage の「1 回以上正解」もこの定義で数える)
 */
export function grade(q: Question, input: AnswerRequest): { isCorrect: boolean; rating: Grade } {
  if (input.kind === "flash") {
    if (q.type !== "flash") throw new Error("flash 入力だが問題は MCQ");
    return { isCorrect: input.rating !== Rating.Again, rating: input.rating as Grade };
  }
  if (q.type === "flash") throw new Error("MCQ 入力だが問題は flash");
  const isCorrect = sameSet(input.chosen, q.answer);
  return { isCorrect, rating: isCorrect ? Rating.Good : Rating.Again };
}

/** Practice で srs_eligible=false(解放済みフォーム問題等)は applied_rating=null(04 §モード行列) */
export function srsUpdatable(q: Question, mode: AnswerRequest["mode"]): boolean {
  return mode === "drill" || q.srs_eligible;
}

export async function processAnswer(input: AnswerRequest, deps: AnswerDeps): Promise<AnswerResult> {
  const { store, now } = deps;

  // 2. 既存 attempt の照合(再適用しない)
  const existing = await store.findAttempt(input.attempt_id);
  if (existing) return replay(existing, input, store);

  const q = deps.findQuestion(input.question_id);
  if (!q) return { status: 404, error: "unknown_question" };
  // 現行 rev と不一致(deploy を跨いだ回答)は記録せず再読込を促す。attempt.question_rev は現行 rev を指す契約
  if (q.rev !== input.question_rev) return { status: 409, error: "stale_question_rev" };
  // 出題判定を書込経路でも適用(holdout / status / open flag / eligible_modes)。drill は srs_eligible も要求
  const verdict = evaluatePool(q, { mode: input.mode }, await deps.poolContext());
  if (!verdict.allowed) return { status: 409, error: "not_eligible", reason: verdict.reason };
  if (q.type === "flash" && input.kind !== "flash") return { status: 409, error: "not_eligible", reason: "kind" };
  if (q.type !== "flash" && input.kind !== "mcq") return { status: 409, error: "not_eligible", reason: "kind" };
  // 選択肢に存在しないラベルは採点せず拒否(未知ラベルを attempt に残さない)
  if (q.type !== "flash" && input.kind === "mcq") {
    const labels = new Set(q.choices.map((c) => c.label));
    if (!input.chosen.every((l) => labels.has(l))) return { status: 409, error: "not_eligible", reason: "unknown_choice" };
  }

  // 3-4. srs_state(無ければ createEmptyCard)→ サーバー側で採点 → ts-fsrs
  const { isCorrect, rating } = grade(q, input);
  const updatable = srsUpdatable(q, input.mode);
  let srs: SrsStateUpsert | null = null;
  if (updatable) {
    const row = await store.findSrsState(q.id);
    const card: Card = row ? rowToCard(row) : createEmptyCard(now);
    srs = cardToRow(q.id, q.exam, applyRating(card, rating, now).card);
  }
  const attempt: AttemptRow = {
    attemptId: input.attempt_id,
    questionId: q.id,
    questionRev: q.rev,
    exam: q.exam,
    mode: input.mode,
    sessionId: null,
    appliedRating: updatable ? rating : null,
    isCorrect,
    chosen: input.kind === "mcq" ? input.chosen : null,
    elapsedMs: input.elapsed_ms ?? null,
    answeredAt: now,
  };

  // 5-6. 原子的書込。PK 競合(ACK 喪失リトライの並走)は再取得で判定
  try {
    await store.commit(attempt, srs);
  } catch (e) {
    if (!(e instanceof AttemptPkConflictError)) throw e;
    const after = await store.findAttempt(input.attempt_id);
    if (!after) throw e;
    return replay(after, input, store);
  }
  return { status: 200, replayed: false, attempt, srs };
}

async function replay(existing: AttemptRow, input: AnswerRequest, store: AnswerStore): Promise<AnswerResult> {
  if (!samePayload(existing, input)) return { status: 409, error: "attempt_payload_mismatch" };
  const srs = existing.appliedRating === null ? null : await store.findSrsState(existing.questionId);
  return { status: 200, replayed: true, attempt: existing, srs };
}

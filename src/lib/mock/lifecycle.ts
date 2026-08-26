import type { ExamSessionAnswerRow, ExamSessionRow, SessionKind, SubmissionReason } from "@/db/schema";
import type { Exam, MockForm, Question } from "@/lib/bank/schema";

/**
 * 模試ライフサイクル(specs/03 §exam_session, §Mock の attempt 生成、01 FR-5、05 S-5)。
 * DB 非依存の純粋な手順として書き、I/O は MockStore で注入する(T-mock は fake store で検証)。
 *
 * 不変条件:
 * - 進行中(in_progress)セッションは全 kind を通じて最大 1 件(オーナー決定 2026-08-27)
 * - すべての書込・提出・復元経路は最初にサーバー時刻で期限を検査し、超過していれば
 *   timeout 提出に収束させる(クライアント時計・事前 GET に依存しない)
 * - Mock は FSRS を更新しない(04 §モード行列)。attempt は提出時に一括生成
 */

export const FULL_DURATION_MIN = 120;

/** 提出時採点の正答集合。flash 等 MCQ でない問題は correct=null(常に不正解扱い) */
export interface AnswerKeyEntry {
  questionId: string;
  correct: string[] | null;
}

/** gradeMockAnswers が生成する attempt の素(session_id / exam は store 側で付与) */
export interface AttemptSeed {
  questionId: string;
  questionRev: number;
  mode: "mock";
  appliedRating: null;
  isCorrect: boolean;
  chosen: string[] | null;
  elapsedMs: null;
  answeredAt: Date;
}

export interface AnswerPatch {
  chosen?: string[] | null;
  flagged?: boolean;
}

export interface MockStore {
  findInProgress(): Promise<ExamSessionRow | null>;
  findSession(id: string): Promise<ExamSessionRow | null>;
  listAnswers(sessionId: string): Promise<ExamSessionAnswerRow[]>;
  /**
   * session INSERT + 全 answer INSERT を 1 トランザクションで(部分生成を残さない)。
   * 「進行中は全 kind で 1 件」のチェックも同一トランザクション内で排他的に行い、
   * 先着の進行中セッションがあれば何も作らず false を返す
   */
  createSession(session: ExamSessionRow, answers: ExamSessionAnswerRow[]): Promise<boolean>;
  /** 条件付き更新(session が in_progress のときだけ 1 行更新)。0 行なら false */
  patchAnswer(sessionId: string, questionId: string, patch: AnswerPatch, now: Date): Promise<boolean>;
  savePosition(sessionId: string, currentIndex: number): Promise<boolean>;
  /**
   * 提出: terminal 獲得(in_progress からの条件付き更新)に成功した場合だけ、その同一
   * トランザクション内で exam_session_answer から attempt を一括生成し score_raw を確定する。
   * 意味論は gradeMockAnswers と一致させる。claim 0 行なら副作用なしで false
   */
  submit(sessionId: string, reason: SubmissionReason, finishedAt: Date, key: AnswerKeyEntry[]): Promise<boolean>;
  /** in_progress からの条件付き abandon。0 行なら false */
  abandon(sessionId: string, finishedAt: Date): Promise<boolean>;
}

export interface MockDeps {
  store: MockStore;
  /** バンクから現行の問題を引く(無ければ null) */
  findQuestion(questionId: string): Question | null;
  now: Date;
  /** exam_session.id(mock はサーバー生成: 03 §attempt) */
  newSessionId(): string;
}

export type StartInput = {
  exam: Exam;
  kind: SessionKind;
  formId: string | null;
  domainId: string | null;
  questionIds: readonly string[];
  durationMin: number;
};

export type StartResult =
  | { status: 201; session: ExamSessionRow; answers: ExamSessionAnswerRow[] }
  | { status: 409; error: "session_in_progress"; session: ExamSessionRow }
  | { status: 404; error: "unknown_form" | "unknown_question"; questionId?: string };

export type SaveResult =
  | { status: 200; session: ExamSessionRow }
  | { status: 400; error: "invalid_index" }
  | { status: 404; error: "unknown_session" | "unknown_question" }
  | { status: 409; error: "session_terminal"; session: ExamSessionRow };

export type SubmitResult =
  | { status: 200; replayed: boolean; session: ExamSessionRow }
  | { status: 404; error: "unknown_session" }
  | { status: 409; error: "session_abandoned"; session: ExamSessionRow };

export type AbandonResult =
  | { status: 200; session: ExamSessionRow }
  | { status: 404; error: "unknown_session" }
  | { status: 409; error: "abandon_not_allowed" | "session_terminal"; session: ExamSessionRow };

export type RestoreResult =
  | { status: 204 }
  | { status: 200; kind: "in_progress"; session: ExamSessionRow; answers: ExamSessionAnswerRow[] }
  | { status: 200; kind: "timed_out"; session: ExamSessionRow };

const sameSet = (a: readonly string[], b: readonly string[]): boolean => {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((v) => sb.has(v));
};

/**
 * Mock 採点の単一ソース(03 §Mock の attempt 生成 手順 1-2)。
 * store.submit の SQL 実装はこの意味論と一致しなければならない(store.test.ts で形を検証):
 * - is_correct: chosen と正答の集合一致(部分点なし)。未回答・key 欠落は false
 * - answered_at: 回答済 = answer_updated_at、未回答 = finished_at
 * - question_rev: 開始時 snapshot(exam_session_answer の値)
 */
export function gradeMockAnswers(
  answers: readonly ExamSessionAnswerRow[],
  key: readonly AnswerKeyEntry[],
  finishedAt: Date,
): { scoreRaw: number; attempts: AttemptSeed[] } {
  const byId = new Map(key.map((k) => [k.questionId, k.correct]));
  const attempts = answers.map((a): AttemptSeed => {
    const correct = byId.get(a.questionId) ?? null;
    const isCorrect = a.chosen !== null && correct !== null && sameSet(a.chosen, correct);
    return {
      questionId: a.questionId,
      questionRev: a.questionRev,
      mode: "mock",
      appliedRating: null,
      isCorrect,
      chosen: a.chosen,
      elapsedMs: null,
      // 回答済み(最終状態で chosen あり)= answer_updated_at、未回答 = finished_at。
      // 回答を取り消した(chosen=null だが answer_updated_at が残る)問題は未回答として扱う
      answeredAt: a.chosen !== null ? (a.answerUpdatedAt ?? finishedAt) : finishedAt,
    };
  });
  return { scoreRaw: attempts.filter((a) => a.isCorrect).length, attempts };
}

const isExpired = (s: ExamSessionRow, now: Date): boolean =>
  s.status === "in_progress" && s.deadlineAt !== null && now.getTime() > s.deadlineAt.getTime();

const buildKey = (questionIds: readonly string[], deps: MockDeps): AnswerKeyEntry[] =>
  questionIds.map((id) => {
    const q = deps.findQuestion(id);
    return { questionId: id, correct: q && q.type !== "flash" ? q.answer : null };
  });

/**
 * 期限超過なら timeout 提出して最新のセッション行を返す(全経路の共通前段)。
 * claim に負けても(並行提出済みでも)最新行を読み直すだけなので冪等。
 */
async function resolveExpiry(session: ExamSessionRow, deps: MockDeps): Promise<ExamSessionRow> {
  if (!isExpired(session, deps.now)) return session;
  await deps.store.submit(session.id, "timeout", deps.now, buildKey(session.questionIds, deps));
  return (await deps.store.findSession(session.id)) ?? session;
}

/** 共通コア。full は startFullMock から。mini の問題選定・時間は D4-1 がこの上に実装する */
export async function startSession(input: StartInput, deps: MockDeps): Promise<StartResult> {
  const current = await deps.store.findInProgress();
  if (current) {
    const resolved = await resolveExpiry(current, deps);
    if (resolved.status === "in_progress") return { status: 409, error: "session_in_progress", session: resolved };
  }
  const revs = new Map<string, number>();
  for (const id of input.questionIds) {
    const q = deps.findQuestion(id);
    if (!q) return { status: 404, error: "unknown_question", questionId: id };
    revs.set(id, q.rev);
  }
  const now = deps.now;
  const session: ExamSessionRow = {
    id: deps.newSessionId(),
    exam: input.exam,
    kind: input.kind,
    formId: input.formId,
    domainId: input.domainId,
    questionIds: [...input.questionIds],
    status: "in_progress",
    submissionReason: null,
    startedAt: now,
    deadlineAt: new Date(now.getTime() + input.durationMin * 60_000),
    currentIndex: 0,
    finishedAt: null,
    scoreRaw: null,
  };
  const answers: ExamSessionAnswerRow[] = input.questionIds.map((questionId) => ({
    sessionId: session.id,
    questionId,
    questionRev: revs.get(questionId) as number,
    chosen: null,
    flagged: false,
    answerUpdatedAt: null,
    updatedAt: now,
  }));
  const created = await deps.store.createSession(session, answers);
  if (!created) {
    // 同時開始の先着が排他チェックに勝った(store が何も作っていない)
    const winner = await deps.store.findInProgress();
    if (winner) return { status: 409, error: "session_in_progress", session: winner };
    throw new Error("セッション開始に失敗したが進行中セッションも見つからない");
  }
  return { status: 201, session, answers };
}

/** full 開始(05 S-5)。form_id 明示指定。availability 検証・自動選択は D3-2 がここに差し込む */
export async function startFullMock(formId: string, forms: readonly MockForm[], deps: MockDeps): Promise<StartResult> {
  const form = forms.find((f) => f.id === formId);
  if (!form) return { status: 404, error: "unknown_form" };
  return startSession(
    { exam: form.exam, kind: "full", formId: form.id, domainId: null, questionIds: form.question_ids, durationMin: FULL_DURATION_MIN },
    deps,
  );
}

/** 保存系の共通前段: 期限検査 → in_progress でなければ 409 */
async function requireActive(
  sessionId: string,
  deps: MockDeps,
): Promise<{ ok: true; session: ExamSessionRow } | { ok: false; result: SaveResult }> {
  const session = await deps.store.findSession(sessionId);
  if (!session) return { ok: false, result: { status: 404, error: "unknown_session" } };
  const resolved = await resolveExpiry(session, deps);
  if (resolved.status !== "in_progress") return { ok: false, result: { status: 409, error: "session_terminal", session: resolved } };
  return { ok: true, session: resolved };
}

export async function saveAnswer(sessionId: string, questionId: string, patch: AnswerPatch, deps: MockDeps): Promise<SaveResult> {
  const active = await requireActive(sessionId, deps);
  if (!active.ok) return active.result;
  if (!active.session.questionIds.includes(questionId)) return { status: 404, error: "unknown_question" };
  const updated = await deps.store.patchAnswer(sessionId, questionId, patch, deps.now);
  if (!updated) {
    // 検査と更新の間に terminal 化した(並行提出等)
    const latest = (await deps.store.findSession(sessionId)) ?? active.session;
    return { status: 409, error: "session_terminal", session: latest };
  }
  return { status: 200, session: active.session };
}

export async function savePosition(sessionId: string, currentIndex: number, deps: MockDeps): Promise<SaveResult> {
  const active = await requireActive(sessionId, deps);
  if (!active.ok) return active.result;
  if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= active.session.questionIds.length)
    return { status: 400, error: "invalid_index" };
  const updated = await deps.store.savePosition(sessionId, currentIndex);
  if (!updated) {
    const latest = (await deps.store.findSession(sessionId)) ?? active.session;
    return { status: 409, error: "session_terminal", session: latest };
  }
  return { status: 200, session: { ...active.session, currentIndex } };
}

/** 提出(manual 起点)。期限超過していれば timeout として記録する(01 FR-5) */
export async function submitSession(sessionId: string, deps: MockDeps): Promise<SubmitResult> {
  const session = await deps.store.findSession(sessionId);
  if (!session) return { status: 404, error: "unknown_session" };
  if (session.status === "submitted") return { status: 200, replayed: true, session };
  if (session.status === "abandoned") return { status: 409, error: "session_abandoned", session };
  const reason: SubmissionReason = isExpired(session, deps.now) ? "timeout" : "manual";
  const claimed = await deps.store.submit(sessionId, reason, deps.now, buildKey(session.questionIds, deps));
  const latest = (await deps.store.findSession(sessionId)) ?? session;
  if (claimed) return { status: 200, replayed: false, session: latest };
  // claim 0 行 = 並行する提出/abandon が先着した(副作用なし)。最新状態で応答を決める
  if (latest.status === "submitted") return { status: 200, replayed: true, session: latest };
  if (latest.status === "abandoned") return { status: 409, error: "session_abandoned", session: latest };
  throw new Error(`提出 claim に失敗したが in_progress のまま: ${sessionId}`);
}

/** abandon(01 FR-5: full 不可・domain_mini のみ可) */
export async function abandonSession(sessionId: string, deps: MockDeps): Promise<AbandonResult> {
  const session = await deps.store.findSession(sessionId);
  if (!session) return { status: 404, error: "unknown_session" };
  const resolved = await resolveExpiry(session, deps);
  if (resolved.status !== "in_progress") return { status: 409, error: "session_terminal", session: resolved };
  if (resolved.kind === "full") return { status: 409, error: "abandon_not_allowed", session: resolved };
  const updated = await deps.store.abandon(sessionId, deps.now);
  const latest = (await deps.store.findSession(sessionId)) ?? resolved;
  if (!updated && latest.status !== "abandoned") return { status: 409, error: "session_terminal", session: latest };
  return { status: 200, session: latest };
}

/** 復元(05 S-5)。進行中が無ければ 204。期限超過は timeout 提出して timed_out を返す */
export async function restoreCurrent(deps: MockDeps): Promise<RestoreResult> {
  const current = await deps.store.findInProgress();
  if (!current) return { status: 204 };
  const resolved = await resolveExpiry(current, deps);
  if (resolved.status !== "in_progress") return { status: 200, kind: "timed_out", session: resolved };
  const answers = await deps.store.listAnswers(resolved.id);
  return { status: 200, kind: "in_progress", session: resolved, answers };
}

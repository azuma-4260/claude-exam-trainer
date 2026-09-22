// 提出後解放の本番 E2E 検証 `npm run verify:release -- <export.json> --form <form-id> [--now <ISO>]`(specs/09 D3-4)。
//
// 本番 DB には接続しない。認証済み /api/export が返す 5 テーブルの JSON(ファイル)と Git 内バンクだけを入力に、
// 「form 提出後に Practice へ解放 / 未提出 form は一切出ない / 解放問題の applied_rating=null」を機械検証する。
// specs/06 は production DATABASE_URL の参照を禁止するため、本番の読み取りは export 経由に限定する。
//
// 判定(specs/03 §出題プールの判定順序、§exam_session、04 §モード行列):
//   A. 提出の整合 — 対象 form の submitted full session を全件、各 session の question_ids スナップショット基準で検証
//      (現在の forms[].question_ids とは比較しない。C6 の rev++ / 新 ID + retired で収載 ID が変わった過去 session を誤判定しない)
//   B. 解放の整合 — 対象 form 収載問題の非 mock attempt はすべて applied_rating=null、srs_state 行なし
//   C. holdout — 本番と同じ evaluatePool を export 由来の PoolContext で実行。対象 form に reason=holdout の拒否が 0 件、
//      未提出 form の収載問題はすべて holdout 拒否(非 mock attempt / srs_state も 0 件)。open_flag 等は参考情報
//   D. 参考順位 — 第 2 層(日次キューを除く)の並びで対象 form の最初の項目が何番目か。判断には使わない
//
// export には学習履歴が全部入るので、行データは出力しない(件数と question_id のみ)。

import { readFileSync } from "node:fs";
import { loadBank, type Bank } from "../src/lib/bank/load";
import { evaluatePool, holdoutFormOf, unsubmittedFormIds, type PoolContext, type PoolReason } from "../src/lib/bank/pool";
import { MOCK_FORM_SIZE } from "../src/lib/bank/schema";
import { assemblePracticeView, PRACTICE_BATCH_MAX } from "../src/lib/practice/serve";
import { jstCalendarDate } from "../src/lib/srs/jst";

// ---------- export JSON の形(JSON 化後: timestamp は ISO 文字列。必要な列だけ拾う) ----------

export type ExportSrsState = { questionId: string };
export type ExportAttempt = {
  attemptId: string;
  questionId: string;
  questionRev: number;
  mode: string;
  sessionId: string | null;
  appliedRating: number | null;
  answeredAt: string;
};
export type ExportSession = {
  id: string;
  exam: string;
  kind: string;
  formId: string | null;
  domainId: string | null;
  questionIds: string[];
  status: string;
  startedAt: string;
  finishedAt: string | null;
};
export type ExportSessionAnswer = { sessionId: string; questionId: string; questionRev: number };
export type ExportFlag = { questionId: string; questionRev: number; resolvedAt: string | null };

export type ExportData = {
  srs_state: ExportSrsState[];
  attempt: ExportAttempt[];
  exam_session: ExportSession[];
  exam_session_answer: ExportSessionAnswer[];
  question_flag: ExportFlag[];
};

// ---------- 結果 ----------

export type SessionCheck = { sessionId: string; startedAt: string; questionCount: number };

export type VerifyResult = {
  ok: boolean;
  failures: string[];
  submission: { sessions: SessionCheck[]; initialSessionId: string | null; rehearsalCount: number };
  release: { practiceAttemptCount: number; nonMockAttemptCount: number; srsStateCount: number };
  holdout: {
    targetAllowedCount: number;
    targetHoldoutRejected: string[];
    targetOtherRejected: { questionId: string; reason: PoolReason }[];
    unsubmitted: { formId: string; holdoutRejected: number; notHoldout: { questionId: string; reason: string }[] }[];
  };
  layer2: { firstTargetPosition: number | null; batchSize: number; remainingAfterBatch: number; excludedToday: string[] };
};

const setEq = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every((x) => b.has(x));

/** export 由来の PoolContext(本番 loadPoolContext と同じ: submitted session + 未解決フラグ) */
function poolContextFrom(data: ExportData, bank: Bank): PoolContext {
  return {
    forms: bank.forms,
    sessions: data.exam_session
      .filter((s) => s.status === "submitted")
      .map((s) => ({ exam: s.exam, formId: s.formId, kind: s.kind, status: s.status })),
    flags: data.question_flag
      .filter((f) => f.resolvedAt === null)
      .map((f) => ({ questionId: f.questionId, questionRev: f.questionRev, resolvedAt: null })),
  };
}

export function verifyRelease(data: ExportData, bank: Bank, formId: string, now: Date): VerifyResult {
  const failures: string[] = [];
  const result: VerifyResult = {
    ok: false,
    failures,
    submission: { sessions: [], initialSessionId: null, rehearsalCount: 0 },
    release: { practiceAttemptCount: 0, nonMockAttemptCount: 0, srsStateCount: 0 },
    holdout: { targetAllowedCount: 0, targetHoldoutRejected: [], targetOtherRejected: [], unsubmitted: [] },
    layer2: { firstTargetPosition: null, batchSize: 0, remainingAfterBatch: 0, excludedToday: [] },
  };

  const form = bank.forms.find((f) => f.id === formId);
  if (!form) {
    failures.push(`form ${formId} がバンク(mock_forms.yaml)に無い`);
    return result;
  }

  // ---- A. 提出の整合(session ごと、スナップショット基準) ----
  const sessions = data.exam_session
    .filter((s) => s.kind === "full" && s.status === "submitted" && s.exam === form.exam && s.formId === form.id)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id));
  if (sessions.length === 0) failures.push(`${formId}: submitted な full session が無い(提出前)`);
  for (const s of sessions) {
    const snapshot = new Set(s.questionIds);
    // スナップショット自体が full form の 60 問(重複なし)であること。欠けた session が「自己整合」で通らないようにする
    if (s.questionIds.length !== MOCK_FORM_SIZE || snapshot.size !== MOCK_FORM_SIZE) {
      failures.push(`session ${s.id}: question_ids スナップショットが ${MOCK_FORM_SIZE} 問でない(${s.questionIds.length} 件、重複除去後 ${snapshot.size} 件)`);
    }
    const answers = data.exam_session_answer.filter((a) => a.sessionId === s.id);
    const answerIds = new Set(answers.map((a) => a.questionId));
    if (answers.length !== snapshot.size || !setEq(answerIds, snapshot)) {
      failures.push(`session ${s.id}: exam_session_answer が question_ids スナップショット(${snapshot.size} 問)と不一致(${answers.length} 行)`);
    }
    const mocks = data.attempt.filter((a) => a.mode === "mock" && a.sessionId === s.id);
    const mockIds = new Set(mocks.map((a) => a.questionId));
    if (mocks.length !== snapshot.size || !setEq(mockIds, snapshot)) {
      failures.push(`session ${s.id}: mock attempt がスナップショット(${snapshot.size} 問)と不一致(${mocks.length} 行)`);
    }
    const revOf = new Map(answers.map((a) => [a.questionId, a.questionRev]));
    for (const a of mocks) {
      if (a.appliedRating !== null) failures.push(`session ${s.id}: mock attempt ${a.questionId} の applied_rating が null でない`);
      const snapRev = revOf.get(a.questionId);
      if (snapRev !== undefined && snapRev !== a.questionRev) {
        failures.push(`session ${s.id}: mock attempt ${a.questionId} の question_rev(${a.questionRev})が answer の snapshot(${snapRev})と不一致`);
      }
    }
    result.submission.sessions.push({ sessionId: s.id, startedAt: s.startedAt, questionCount: snapshot.size });
  }
  result.submission.initialSessionId = sessions[0]?.id ?? null;
  result.submission.rehearsalCount = Math.max(0, sessions.length - 1);

  // ---- B. 解放の整合(現在の収載問題に対する非 mock attempt / srs_state) ----
  const targetIds = new Set(form.question_ids);
  const nonMock = data.attempt.filter((a) => a.mode !== "mock" && targetIds.has(a.questionId));
  result.release.nonMockAttemptCount = nonMock.length;
  result.release.practiceAttemptCount = nonMock.filter((a) => a.mode === "practice").length;
  for (const a of nonMock) {
    if (a.appliedRating !== null) failures.push(`${formId} 収載 ${a.questionId} の ${a.mode} attempt に applied_rating=${a.appliedRating}(null のはず)`);
  }
  const srsHits = data.srs_state.filter((r) => targetIds.has(r.questionId));
  result.release.srsStateCount = srsHits.length;
  for (const r of srsHits) failures.push(`${formId} 収載 ${r.questionId} に srs_state 行がある(解放問題は FSRS 非更新のはず)`);

  // ---- C. holdout の機械検証(本番と同じ evaluatePool を export 由来の PoolContext で) ----
  const ctx = poolContextFrom(data, bank);
  const unsubmitted = unsubmittedFormIds(ctx);
  if (unsubmitted.has(formId)) failures.push(`${formId} は PoolContext 上も未提出扱い(holdout 継続)`);
  for (const id of form.question_ids) {
    const q = bank.byId.get(id);
    if (!q) {
      failures.push(`${formId} 収載 ${id} がバンクに無い`);
      continue;
    }
    const v = evaluatePool(q, { mode: "practice" }, ctx);
    if (v.allowed) result.holdout.targetAllowedCount += 1;
    else if (v.reason === "holdout") result.holdout.targetHoldoutRejected.push(id);
    else result.holdout.targetOtherRejected.push({ questionId: id, reason: v.reason });
  }
  for (const id of result.holdout.targetHoldoutRejected) failures.push(`${formId} 収載 ${id} が提出後も holdout で拒否される`);

  for (const other of bank.forms) {
    if (!unsubmitted.has(other.id)) continue;
    const entry = { formId: other.id, holdoutRejected: 0, notHoldout: [] as { questionId: string; reason: string }[] };
    for (const id of other.question_ids) {
      const q = bank.byId.get(id);
      if (!q) {
        entry.notHoldout.push({ questionId: id, reason: "bank_missing" });
        continue;
      }
      const v = evaluatePool(q, { mode: "practice" }, ctx);
      if (!v.allowed && v.reason === "holdout") entry.holdoutRejected += 1;
      else entry.notHoldout.push({ questionId: id, reason: v.allowed ? "allowed" : v.reason });
    }
    for (const n of entry.notHoldout) failures.push(`未提出 ${other.id} 収載 ${n.questionId} が holdout で拒否されない(${n.reason})`);
    const otherIds = new Set(other.question_ids);
    for (const a of data.attempt) {
      if (a.mode !== "mock" && otherIds.has(a.questionId)) failures.push(`未提出 ${other.id} 収載 ${a.questionId} に ${a.mode} attempt がある`);
    }
    for (const r of data.srs_state) {
      if (otherIds.has(r.questionId)) failures.push(`未提出 ${other.id} 収載 ${r.questionId} に srs_state 行がある`);
    }
    result.holdout.unsubmitted.push(entry);
  }

  // ---- D. 第 2 層内の参考順位(日次キュー = 第 1 層は再現しない。判断には使わない) ----
  const today = jstCalendarDate(now);
  const excludedToday = [...new Set(data.attempt.filter((a) => a.mode !== "mock" && jstCalendarDate(new Date(a.answeredAt)) === today).map((a) => a.questionId))];
  result.layer2.excludedToday = excludedToday;
  const view = assemblePracticeView({ bank, poolCtx: ctx, scenarios: null, practiceQueue: [], excludeIds: new Set(excludedToday) });
  if (view.kind === "ok") {
    const idx = view.items.findIndex((i) => holdoutFormOf(i.questionId, bank.forms) === formId);
    result.layer2.firstTargetPosition = idx >= 0 ? idx + 1 : null;
    result.layer2.batchSize = view.items.length;
    result.layer2.remainingAfterBatch = view.remainingAfterBatch;
  }

  result.ok = failures.length === 0;
  return result;
}

// ---------- CLI ----------

export function parseArgs(argv: readonly string[]): { file: string; formId: string; now: Date | null } {
  let file: string | null = null;
  let formId: string | null = null;
  let now: Date | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--form") formId = argv[++i] ?? null;
    else if (a === "--now") {
      const d = new Date(argv[++i] ?? "");
      if (Number.isNaN(d.getTime())) throw new Error("--now は ISO 8601 日時で指定する");
      now = d;
    } else if (a.startsWith("--")) throw new Error(`不明なオプション: ${a}`);
    else file ??= a;
  }
  if (!file) throw new Error("export JSON のパスを指定する: verify-release <export.json> --form <form-id>");
  if (!formId) throw new Error("--form <form-id> を指定する");
  return { file, formId, now };
}

export function formatResult(r: VerifyResult, formId: string): string {
  const lines: string[] = [];
  lines.push(`[A] ${formId} submitted full session: ${r.submission.sessions.length} 件(初回 ${r.submission.initialSessionId ?? "-"}、rehearsal ${r.submission.rehearsalCount} 件)`);
  for (const s of r.submission.sessions) lines.push(`    - ${s.sessionId} started_at=${s.startedAt} snapshot=${s.questionCount} 問`);
  lines.push(`[B] 収載問題の非 mock attempt: ${r.release.nonMockAttemptCount} 件(practice ${r.release.practiceAttemptCount} 件)、srs_state: ${r.release.srsStateCount} 行`);
  if (r.release.practiceAttemptCount === 0) lines.push("    ※ practice attempt が 0 件。applied_rating=null の正の証拠を得るには Practice で収載問題を 1 問回答して再 export する");
  lines.push(`[C] 提出済み ${formId}: Practice 通過 ${r.holdout.targetAllowedCount} 問、holdout 拒否 ${r.holdout.targetHoldoutRejected.length} 問、その他除外 ${r.holdout.targetOtherRejected.length} 問`);
  for (const o of r.holdout.targetOtherRejected) lines.push(`    - ${o.questionId}: ${o.reason}(holdout 以外の正当な除外。失敗条件ではない)`);
  for (const u of r.holdout.unsubmitted) lines.push(`[C] 未提出 ${u.formId}: holdout 拒否 ${u.holdoutRejected} 問、holdout 以外 ${u.notHoldout.length} 問`);
  lines.push(
    r.layer2.firstTargetPosition === null
      ? `[D] 参考: 第 2 層のみの試算では先頭 ${PRACTICE_BATCH_MAX} 件(実 ${r.layer2.batchSize} 件、残り ${r.layer2.remainingAfterBatch})に ${formId} 収載問題は無い(当日回答済み除外 ${r.layer2.excludedToday.length} 問)`
      : `[D] 参考: 第 2 層のみの試算で ${formId} 収載問題の最初の項目は ${r.layer2.firstTargetPosition} 番目(当日回答済み除外 ${r.layer2.excludedToday.length} 問)。日次キュー分だけ後ろにずれ得る`,
  );
  if (r.failures.length > 0) {
    lines.push(`NG: ${r.failures.length} 件`);
    for (const f of r.failures) lines.push(`  ✗ ${f}`);
  } else {
    lines.push("OK: 提出の整合 / 解放の整合 / holdout の機械検証をすべて通過");
  }
  return lines.join("\n");
}

if (process.argv[1] && /verify-release\.ts$/.test(process.argv[1])) {
  try {
    const { file, formId, now } = parseArgs(process.argv.slice(2));
    const data = JSON.parse(readFileSync(file, "utf8")) as ExportData;
    for (const k of ["srs_state", "attempt", "exam_session", "exam_session_answer", "question_flag"] as const) {
      if (!Array.isArray(data[k])) throw new Error(`export JSON に ${k} 配列が無い(/api/export の出力か確認する)`);
    }
    const r = verifyRelease(data, loadBank(), formId, now ?? new Date());
    console.log(formatResult(r, formId));
    process.exit(r.ok ? 0 : 1);
  } catch (e) {
    console.error(`verify:release 失敗: ${(e as Error).message}`);
    process.exit(1);
  }
}

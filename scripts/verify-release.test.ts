import { describe, expect, it } from "vitest";
import type { MockForm, Question } from "../src/lib/bank/schema";
import { mcq } from "../src/lib/queue/test-fixtures";
import {
  parseArgs,
  verifyRelease,
  type ExportAttempt,
  type ExportData,
  type ExportSession,
  type ExportSessionAnswer,
} from "./verify-release";

// D3-4: 提出後解放の本番 E2E を export JSON(/api/export)とバンクだけで機械検証する(specs/03 §出題プールの判定順序、04 §モード行列)。
// 判定 A は exam_session.question_ids のスナップショット基準、B は解放問題の applied_rating / srs_state、
// C は本番と同じ evaluatePool を本番データで実行、D は第 2 層内の参考順位。

const ids = (prefix: string, from: number) => Array.from({ length: 60 }, (_, i) => `${prefix}${from + i}`);
const formAIds = ids("f-d1-q", 200);
const formBIds = ids("f-d2-q", 200);
const formQ = (id: string, over: Partial<Question> = {}) =>
  mcq(id, { scenario_id: "sc-1", eligible_modes: ["mock", "practice"], srs_eligible: false, ...over });
const formA: MockForm = { id: "form-a", exam: "ccar-f", scenario_ids: ["sc-1"], question_ids: formAIds };
const formB: MockForm = { id: "form-b", exam: "ccar-f", scenario_ids: ["sc-1"], question_ids: formBIds };

const bankOf = (questions: Question[], forms: MockForm[]) => ({
  questions,
  forms,
  byId: new Map(questions.map((q) => [q.id, q])),
});
const baseBank = () => bankOf([...formAIds.map((id) => formQ(id)), ...formBIds.map((id) => formQ(id)), mcq("f-d1-q001")], [formA, formB]);

const NOW = new Date("2026-09-22T15:00:00+09:00");
const SESSION_ID = "11111111-1111-4111-8111-111111111111";

const session = (over: Partial<ExportSession> = {}): ExportSession => ({
  id: SESSION_ID,
  exam: "ccar-f",
  kind: "full",
  formId: "form-a",
  domainId: null,
  questionIds: formAIds,
  status: "submitted",
  startedAt: "2026-09-21T10:00:00.000Z",
  finishedAt: "2026-09-21T12:00:00.000Z",
  ...over,
});

const answersOf = (sessionId: string, questionIds: readonly string[], rev = 1): ExportSessionAnswer[] =>
  questionIds.map((questionId) => ({ sessionId, questionId, questionRev: rev }));

const mockAttemptsOf = (sessionId: string, questionIds: readonly string[], rev = 1): ExportAttempt[] =>
  questionIds.map((questionId, i) => ({
    attemptId: `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`,
    questionId,
    questionRev: rev,
    mode: "mock",
    sessionId,
    appliedRating: null,
    answeredAt: "2026-09-21T12:00:00.000Z",
  }));

const practiceAttempt = (questionId: string, over: Partial<ExportAttempt> = {}): ExportAttempt => ({
  attemptId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  questionId,
  questionRev: 1,
  mode: "practice",
  sessionId: null,
  appliedRating: null,
  answeredAt: "2026-09-22T05:00:00.000Z", // JST 9/22 14:00
  ...over,
});

const greenExport = (): ExportData => ({
  srs_state: [],
  attempt: [...mockAttemptsOf(SESSION_ID, formAIds), practiceAttempt(formAIds[0])],
  exam_session: [session()],
  exam_session_answer: answersOf(SESSION_ID, formAIds),
  question_flag: [],
});

describe("verifyRelease: 全部そろった本番相当データ", () => {
  it("ok=true、初回提出 1 件・rehearsal 0 件・form-b 60 問が holdout 拒否", () => {
    const r = verifyRelease(greenExport(), baseBank(), "form-a", NOW);
    expect(r.failures).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.submission.sessions).toHaveLength(1);
    expect(r.submission.initialSessionId).toBe(SESSION_ID);
    expect(r.submission.rehearsalCount).toBe(0);
    expect(r.release.practiceAttemptCount).toBe(1);
    expect(r.release.srsStateCount).toBe(0);
    expect(r.holdout.targetHoldoutRejected).toEqual([]);
    expect(r.holdout.targetAllowedCount).toBe(60);
    expect(r.holdout.unsubmitted).toEqual([{ formId: "form-b", holdoutRejected: 60, notHoldout: [] }]);
  });

  it("参考順位(判定 D): 当日回答済みを除いた第 2 層で対象 form の最初の項目位置を返す", () => {
    const r = verifyRelease(greenExport(), baseBank(), "form-a", NOW);
    // 第 2 層 = id 昇順: f-d1-q001 → f-d1-q201(q200 は当日回答済みで除外)… なので 2 番目
    expect(r.layer2.firstTargetPosition).toBe(2);
    expect(r.layer2.excludedToday).toEqual([formAIds[0]]);
  });
});

describe("判定 A: 提出の整合(スナップショット基準)", () => {
  it("submitted full session が無い → 失敗", () => {
    const data = greenExport();
    data.exam_session = [session({ status: "in_progress", finishedAt: null })];
    const r = verifyRelease(data, baseBank(), "form-a", NOW);
    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.includes("submitted"))).toBe(true);
  });

  it("C6 で収載 ID が変わっても、当該 session のスナップショットと一致していれば合格(現在の forms とは比較しない)", () => {
    // 過去 session は f-d1-q200 を出題、その後 q200 が retired → 新 ID f-d1-q300 に置換されたフォーム定義
    const replaced = [...formAIds.slice(1), "f-d1-q300"];
    const bank = bankOf(
      [...formAIds.map((id) => formQ(id, id === formAIds[0] ? { status: "retired" } : {})), formQ("f-d1-q300"), ...formBIds.map((id) => formQ(id))],
      [{ ...formA, question_ids: replaced }, formB],
    );
    const data = greenExport();
    data.attempt = mockAttemptsOf(SESSION_ID, formAIds); // 当日 practice は無し
    const r = verifyRelease(data, bank, "form-a", NOW);
    expect(r.failures).toEqual([]);
    // retired は holdout 以外の理由(status)なので必須条件には触れない
    expect(r.holdout.targetHoldoutRejected).toEqual([]);
    expect(r.holdout.targetAllowedCount).toBe(60);
  });

  it("answer 行がスナップショットと食い違う / mock attempt の rev が snapshot と違う / applied_rating が非 null → 失敗", () => {
    const data = greenExport();
    data.exam_session_answer = answersOf(SESSION_ID, formAIds.slice(0, 59));
    expect(verifyRelease(data, baseBank(), "form-a", NOW).failures.some((f) => f.includes("exam_session_answer"))).toBe(true);

    const data2 = greenExport();
    data2.attempt = [...mockAttemptsOf(SESSION_ID, formAIds, 2)];
    expect(verifyRelease(data2, baseBank(), "form-a", NOW).failures.some((f) => f.includes("question_rev"))).toBe(true);

    const data3 = greenExport();
    data3.attempt = mockAttemptsOf(SESSION_ID, formAIds).map((a, i) => (i === 0 ? { ...a, appliedRating: 3 } : a));
    expect(verifyRelease(data3, baseBank(), "form-a", NOW).failures.some((f) => f.includes("mock attempt") && f.includes("applied_rating"))).toBe(true);
  });

  it("スナップショット自体が 59 問(自己整合だが不完全)/ 重複を含む 60 件 → 失敗(Codex P1)", () => {
    const short = formAIds.slice(0, 59);
    const data = greenExport();
    data.exam_session = [session({ questionIds: short })];
    data.exam_session_answer = answersOf(SESSION_ID, short);
    data.attempt = mockAttemptsOf(SESSION_ID, short);
    const r = verifyRelease(data, baseBank(), "form-a", NOW);
    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.includes("スナップショットが 60 問でない"))).toBe(true);

    const dup = [...short, short[0]];
    const data2 = greenExport();
    data2.exam_session = [session({ questionIds: dup })];
    data2.exam_session_answer = answersOf(SESSION_ID, short);
    data2.attempt = mockAttemptsOf(SESSION_ID, short);
    expect(verifyRelease(data2, baseBank(), "form-a", NOW).failures.some((f) => f.includes("重複除去後 59"))).toBe(true);
  });

  it("複数 session は started_at 最古を初回提出、残りを rehearsal 件数として報告し、各 session を個別に検証する", () => {
    const second = "22222222-2222-4222-8222-222222222222";
    const data = greenExport();
    data.exam_session.push(session({ id: second, startedAt: "2026-09-22T01:00:00.000Z" }));
    data.exam_session_answer.push(...answersOf(second, formAIds));
    data.attempt.push(...mockAttemptsOf(second, formAIds).map((a) => ({ ...a, attemptId: a.attemptId.replace("aaaaaaaa", "cccccccc") })));
    const r = verifyRelease(data, baseBank(), "form-a", NOW);
    expect(r.failures).toEqual([]);
    expect(r.submission.initialSessionId).toBe(SESSION_ID);
    expect(r.submission.rehearsalCount).toBe(1);

    // 2 本目だけ answer 欠落 → その session id を含む失敗
    data.exam_session_answer = data.exam_session_answer.filter((a) => !(a.sessionId === second && a.questionId === formAIds[5]));
    expect(verifyRelease(data, baseBank(), "form-a", NOW).failures.some((f) => f.includes(second))).toBe(true);
  });
});

describe("判定 B: 解放の整合", () => {
  it("解放問題の practice attempt に applied_rating が付いている → 失敗", () => {
    const data = greenExport();
    data.attempt.push(practiceAttempt(formAIds[1], { attemptId: "bbbbbbbb-bbbb-4bbb-8bbb-000000000001", appliedRating: 3 }));
    const r = verifyRelease(data, baseBank(), "form-a", NOW);
    expect(r.failures.some((f) => f.includes(formAIds[1]) && f.includes("applied_rating"))).toBe(true);
  });

  it("解放問題に srs_state 行がある → 失敗", () => {
    const data = greenExport();
    data.srs_state = [{ questionId: formAIds[2] }];
    const r = verifyRelease(data, baseBank(), "form-a", NOW);
    expect(r.failures.some((f) => f.includes("srs_state") && f.includes(formAIds[2]))).toBe(true);
  });

  it("practice attempt が 0 件でも失敗にはせず、件数 0 を報告する", () => {
    const data = greenExport();
    data.attempt = mockAttemptsOf(SESSION_ID, formAIds);
    const r = verifyRelease(data, baseBank(), "form-a", NOW);
    expect(r.ok).toBe(true);
    expect(r.release.practiceAttemptCount).toBe(0);
  });
});

describe("判定 C: holdout の機械検証(evaluatePool を本番データで実行)", () => {
  it("未提出 form の問題に非 mock attempt / srs_state がある、または holdout 以外の理由で判定される → 失敗", () => {
    const data = greenExport();
    data.attempt.push(practiceAttempt(formBIds[0], { attemptId: "bbbbbbbb-bbbb-4bbb-8bbb-000000000002" }));
    data.srs_state = [{ questionId: formBIds[1] }];
    const r = verifyRelease(data, baseBank(), "form-a", NOW);
    expect(r.failures.some((f) => f.includes("form-b") && f.includes(formBIds[0]))).toBe(true);
    expect(r.failures.some((f) => f.includes("srs_state") && f.includes(formBIds[1]))).toBe(true);
  });

  it("対象 form の問題が open_flag で除外されても必須条件には触れず、理由付きで一覧に出る", () => {
    const data = greenExport();
    data.question_flag = [{ questionId: formAIds[3], questionRev: 1, resolvedAt: null }];
    const r = verifyRelease(data, baseBank(), "form-a", NOW);
    expect(r.failures).toEqual([]);
    expect(r.holdout.targetAllowedCount).toBe(59);
    expect(r.holdout.targetOtherRejected).toEqual([{ questionId: formAIds[3], reason: "open_flag" }]);
  });

  it("対象 form の収載問題がバンクに無い → 失敗", () => {
    const bank = baseBank();
    bank.byId.delete(formAIds[4]);
    const r = verifyRelease(greenExport(), { ...bank, questions: bank.questions.filter((q) => q.id !== formAIds[4]) }, "form-a", NOW);
    expect(r.failures.some((f) => f.includes(formAIds[4]) && f.includes("バンク"))).toBe(true);
  });

  it("対象 form がバンクに無い → 失敗", () => {
    const r = verifyRelease(greenExport(), baseBank(), "form-z", NOW);
    expect(r.ok).toBe(false);
    expect(r.failures[0]).toContain("form-z");
  });
});

describe("parseArgs", () => {
  it("export パスと --form を取り出す。--now は任意", () => {
    expect(parseArgs(["out.json", "--form", "form-a"])).toEqual({ file: "out.json", formId: "form-a", now: null });
    expect(parseArgs(["out.json", "--form", "form-b", "--now", "2026-09-22T00:00:00+09:00"]).now?.toISOString()).toBe(
      "2026-09-21T15:00:00.000Z",
    );
    expect(() => parseArgs(["out.json"])).toThrow(/--form/);
    expect(() => parseArgs(["--form", "form-a"])).toThrow(/export/);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import type { ExamSessionRow } from "@/db/schema";
import { mcq, syllabus } from "@/lib/queue/test-fixtures";

// D3-1: Mock 開始 API の認証・入力検証・結果マッピングと、DTO が正解・解説を漏らさないこと

const startFullMock = vi.fn();
const startDomainMini = vi.fn();
vi.mock("@/lib/mock/lifecycle", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mock/lifecycle")>()),
  startFullMock: (...a: unknown[]) => startFullMock(...a),
  startDomainMini: (...a: unknown[]) => startDomainMini(...a),
}));

const Q1 = mcq("f-d1-q001", { scenario_id: "sc-a", eligible_modes: ["mock"], srs_eligible: false });
const SCOPE = "ccar-f" as const;
const Q_MINI = mcq("f-d2-q900", { eligible_modes: ["practice", "mock"] });
const BANK = new Map([Q1, Q_MINI].map((q) => [q.id, q]));
vi.mock("@/lib/mock/server", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/mock/server")>();
  return {
    ...orig,
    mockServerContext: () => ({
      deps: { findQuestion: (id: string) => BANK.get(id) ?? null, store: {}, now: new Date(), newSessionId: () => "x" },
      forms: [],
      questions: [Q1, Q_MINI],
      scenariosFor: () => [{ id: "sc-a", title_en: "Title A", context_en: "Context A" }],
      syllabusFor: (exam: string) => (exam === syllabus.exam ? syllabus : null),
    }),
    // 開始 API は DB から submitted セッションと open フラグを読むが、route テストでは DB に触れない
    loadStartPool: async () => ({ forms: [], sessions: [], flags: [], startForms: [], scope: SCOPE }),
  };
});

const { POST } = await import("./route");
const SECRET = "test-session-secret-0123456789abcdef";
const post = (body: string, auth = true) =>
  POST(
    new Request("https://app.example/api/mock/sessions", {
      method: "POST",
      headers: { "content-type": "application/json", ...(auth ? { cookie: `${SESSION_COOKIE}=${createSessionToken(SECRET)}` } : {}) },
      body,
    }),
  );

const NOW = new Date("2026-08-27T10:00:00+09:00");
const session: ExamSessionRow = {
  id: "11111111-1111-4111-8111-111111111111",
  exam: "ccar-f",
  kind: "full",
  formId: "form-a",
  domainId: null,
  questionIds: [Q1.id],
  status: "in_progress",
  submissionReason: null,
  startedAt: NOW,
  deadlineAt: new Date(NOW.getTime() + 120 * 60_000),
  currentIndex: 0,
  finishedAt: null,
  scoreRaw: null,
};
const answers = [{ sessionId: session.id, questionId: Q1.id, questionRev: 1, chosen: null, flagged: false, answerUpdatedAt: null, updatedAt: NOW }];

describe("POST /api/mock/sessions", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    startFullMock.mockReset();
    startDomainMini.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("未認証は 401", async () => {
    expect((await post(JSON.stringify({ exam: "ccar-f", form_id: "form-a" }), false)).status).toBe(401);
    expect(startFullMock).not.toHaveBeenCalled();
  });
  it("壊れた JSON / form_id 形式不正 / exam 欠落・不正 / kind・domain_id 不正は 400(開始は (exam, form_id)。D6-4)", async () => {
    expect((await post("{")).status).toBe(400);
    expect((await post(JSON.stringify({ exam: "ccar-f", form_id: "A" }))).status).toBe(400);
    expect((await post(JSON.stringify({ form_id: "form-a" }))).status).toBe(400);
    expect((await post(JSON.stringify({ exam: "ccar-x", form_id: "form-a" }))).status).toBe(400);
    expect((await post(JSON.stringify({ kind: "domain_mini", exam: "ccar-f", domain_id: "d2" }))).status).toBe(400);
    expect((await post(JSON.stringify({ kind: "domain_mini", domain_id: "f-d2" }))).status).toBe(400);
    expect((await post(JSON.stringify({ kind: "half", exam: "ccar-f", domain_id: "f-d2" }))).status).toBe(400);
    expect((await post(JSON.stringify({ exam: "ccar-f", form_id: "form-a", kind: "domain_mini", domain_id: "f-d2" }))).status).toBe(400);
    expect(startFullMock).not.toHaveBeenCalled();
    expect(startDomainMini).not.toHaveBeenCalled();
  });
  it("startFullMock に (exam, form_id) を渡す(F と P の同名 form-a を取り違えない)", async () => {
    startFullMock.mockResolvedValue({ status: 404, error: "unknown_form" });
    await post(JSON.stringify({ exam: "ccar-p", form_id: "form-a" }));
    expect(startFullMock.mock.calls[0][0]).toEqual({ exam: "ccar-p", formId: "form-a" });
  });
  it("201: セッション一式を返し、正解・解説・refs をネットワークに載せない(05 S-5: 提出まで非表示)", async () => {
    startFullMock.mockResolvedValue({ status: 201, session, answers });
    const res = await post(JSON.stringify({ exam: "ccar-f", form_id: "form-a" }));
    expect(res.status).toBe(201);
    const text = await res.text();
    const body = JSON.parse(text);
    expect(body.session).toMatchObject({ id: session.id, status: "in_progress" });
    expect(body.questions[0]).toMatchObject({ id: Q1.id, scenario_id: "sc-a", select_count: 1 });
    expect(body.scenarios).toEqual([{ id: "sc-a", title_en: "Title A", context_en: "Context A" }]);
    expect(text).not.toContain('"answer"');
    expect(text).not.toContain("explanation");
    expect(text).not.toContain("refs");
  });
  it("409(進行中あり)は既存セッション参照を返す", async () => {
    startFullMock.mockResolvedValue({ status: 409, error: "session_in_progress", session });
    const res = await post(JSON.stringify({ exam: "ccar-f", form_id: "form-b" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "session_in_progress", session: { id: session.id } });
  });
  it("409(availability NG)は理由の件数を返す(D3-2, 01 FR-5)", async () => {
    startFullMock.mockResolvedValue({ status: 409, error: "form_blocked", openFlagCount: 2, inactiveCount: 1 });
    const res = await post(JSON.stringify({ exam: "ccar-f", form_id: "form-a" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "form_blocked", open_flag_count: 2, inactive_count: 1 });
  });
  it("409(自動選択外の未実施フォーム)は推奨フォームを返す(D3-2, 01 FR-5)", async () => {
    startFullMock.mockResolvedValue({ status: 409, error: "form_not_next", recommendedFormId: "form-a" });
    const res = await post(JSON.stringify({ exam: "ccar-f", form_id: "form-b" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "form_not_next", recommended_form_id: "form-a" });
  });
  it("未知フォームは 404、例外は 500", async () => {
    startFullMock.mockResolvedValue({ status: 404, error: "unknown_form" });
    expect((await post(JSON.stringify({ exam: "ccar-f", form_id: "form-zz" }))).status).toBe(404);
    startFullMock.mockRejectedValue(new Error("neon down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post(JSON.stringify({ exam: "ccar-f", form_id: "form-a" }))).status).toBe(500);
  });

  describe("domain mini(D4-1)", () => {
    const miniSession: ExamSessionRow = {
      ...session,
      id: "22222222-2222-4222-8222-222222222222",
      kind: "domain_mini",
      formId: null,
      domainId: "f-d2",
      questionIds: [Q_MINI.id],
      deadlineAt: new Date(NOW.getTime() + 2 * 60_000),
    };
    const miniAnswers = [{ ...answers[0], sessionId: miniSession.id, questionId: Q_MINI.id }];

    it("201: startDomainMini に domain_id とプール文脈を渡し、domain_name 付きのセッション一式を返す(正解は載せない)", async () => {
      startDomainMini.mockResolvedValue({ status: 201, session: miniSession, answers: miniAnswers });
      const res = await post(JSON.stringify({ kind: "domain_mini", exam: "ccar-f", domain_id: "f-d2" }));
      expect(res.status).toBe(201);
      expect(startDomainMini).toHaveBeenCalledWith("f-d2", [Q1, Q_MINI], expect.objectContaining({ forms: [], sessions: [], flags: [] }), syllabus, expect.anything());
      expect(startFullMock).not.toHaveBeenCalled();
      const text = await res.text();
      const body = JSON.parse(text);
      expect(body.session).toMatchObject({ id: miniSession.id, kind: "domain_mini", domain_id: "f-d2", form_id: null });
      expect(body.domain_name).toBe("Domain 2");
      expect(body.questions[0]).toMatchObject({ id: Q_MINI.id, scenario_id: null });
      expect(body.scenarios).toEqual([]);
      expect(text).not.toContain('"answer"');
      expect(text).not.toContain("explanation");
    });
    it("409(プール不足)は件数を返す", async () => {
      startDomainMini.mockResolvedValue({ status: 409, error: "domain_pool_short", poolCount: 7, minCount: 10 });
      const res = await post(JSON.stringify({ kind: "domain_mini", exam: "ccar-f", domain_id: "f-d2" }));
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ error: "domain_pool_short", pool_count: 7, min_count: 10 });
    });
    it("学習スコープ外の exam は syllabus=null で startDomainMini に渡す(開始候補はスコープ内のみ)", async () => {
      startDomainMini.mockResolvedValue({ status: 404, error: "unknown_domain" });
      const res = await post(JSON.stringify({ kind: "domain_mini", exam: "ccar-p", domain_id: "p-d1" }));
      expect(res.status).toBe(404);
      expect(startDomainMini).toHaveBeenCalledWith("p-d1", expect.anything(), expect.anything(), null, expect.anything());
    });
    it("409(進行中あり)/ 404(未知ドメイン)", async () => {
      startDomainMini.mockResolvedValue({ status: 409, error: "session_in_progress", session });
      expect(await (await post(JSON.stringify({ kind: "domain_mini", exam: "ccar-f", domain_id: "f-d2" }))).json()).toMatchObject({ error: "session_in_progress", session: { id: session.id } });
      startDomainMini.mockResolvedValue({ status: 404, error: "unknown_domain" });
      const res = await post(JSON.stringify({ kind: "domain_mini", exam: "ccar-f", domain_id: "f-d7" }));
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "unknown_domain" });
    });
  });
});

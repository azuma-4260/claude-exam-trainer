import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import type { ExamSessionRow } from "@/db/schema";
import { mcq } from "@/lib/queue/test-fixtures";

// D3-1: Mock 開始 API の認証・入力検証・結果マッピングと、DTO が正解・解説を漏らさないこと

const startFullMock = vi.fn();
vi.mock("@/lib/mock/lifecycle", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mock/lifecycle")>()),
  startFullMock: (...a: unknown[]) => startFullMock(...a),
}));

const Q1 = mcq("f-d1-q001", { scenario_id: "sc-a", eligible_modes: ["mock"], srs_eligible: false });
vi.mock("@/lib/mock/server", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/mock/server")>();
  return {
    ...orig,
    mockServerContext: () => ({
      deps: { findQuestion: (id: string) => (id === Q1.id ? Q1 : null), store: {}, now: new Date(), newSessionId: () => "x" },
      forms: [],
      scenarios: [{ id: "sc-a", title_en: "Title A", context_en: "Context A" }],
    }),
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
  });
  afterEach(() => vi.unstubAllEnvs());

  it("未認証は 401", async () => {
    expect((await post(JSON.stringify({ form_id: "form-a" }), false)).status).toBe(401);
    expect(startFullMock).not.toHaveBeenCalled();
  });
  it("壊れた JSON / form_id 形式不正は 400", async () => {
    expect((await post("{")).status).toBe(400);
    expect((await post(JSON.stringify({ form_id: "A" }))).status).toBe(400);
    expect(startFullMock).not.toHaveBeenCalled();
  });
  it("201: セッション一式を返し、正解・解説・refs をネットワークに載せない(05 S-5: 提出まで非表示)", async () => {
    startFullMock.mockResolvedValue({ status: 201, session, answers });
    const res = await post(JSON.stringify({ form_id: "form-a" }));
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
    const res = await post(JSON.stringify({ form_id: "form-b" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "session_in_progress", session: { id: session.id } });
  });
  it("未知フォームは 404、例外は 500", async () => {
    startFullMock.mockResolvedValue({ status: 404, error: "unknown_form" });
    expect((await post(JSON.stringify({ form_id: "form-zz" }))).status).toBe(404);
    startFullMock.mockRejectedValue(new Error("neon down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post(JSON.stringify({ form_id: "form-a" }))).status).toBe(500);
  });
});

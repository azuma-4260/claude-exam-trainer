import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

// D3-1: 回答・フラグ保存 API の認証・入力検証・結果マッピング

const saveAnswer = vi.fn();
vi.mock("@/lib/mock/lifecycle", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mock/lifecycle")>()),
  saveAnswer: (...a: unknown[]) => saveAnswer(...a),
}));
vi.mock("@/lib/mock/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mock/server")>()),
  mockServerContext: () => ({ deps: { tag: "deps" }, forms: [], scenarios: null }),
}));

const { PATCH } = await import("./route");
const SECRET = "test-session-secret-0123456789abcdef";
const SID = "11111111-1111-4111-8111-111111111111";
const patch = (body: string, { id = SID, qid = "f-d1-q001", auth = true } = {}) =>
  PATCH(
    new Request(`https://app.example/api/mock/sessions/${id}/answers/${qid}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...(auth ? { cookie: `${SESSION_COOKIE}=${createSessionToken(SECRET)}` } : {}) },
      body,
    }),
    { params: Promise.resolve({ id, qid }) },
  );

describe("PATCH /api/mock/sessions/[id]/answers/[qid]", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    saveAnswer.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("未認証は 401", async () => {
    expect((await patch(JSON.stringify({ chosen: ["A"] }), { auth: false })).status).toBe(401);
    expect(saveAnswer).not.toHaveBeenCalled();
  });
  it("id / qid / body の形式不正は 400(chosen も flagged も無い・重複 chosen を含む)", async () => {
    expect((await patch(JSON.stringify({ chosen: ["A"] }), { id: "not-uuid" })).status).toBe(400);
    expect((await patch(JSON.stringify({ chosen: ["A"] }), { qid: "q1" })).status).toBe(400);
    expect((await patch("{")).status).toBe(400);
    expect((await patch(JSON.stringify({}))).status).toBe(400);
    expect((await patch(JSON.stringify({ chosen: ["A", "A"] }))).status).toBe(400);
    expect((await patch(JSON.stringify({ chosen: [] }))).status).toBe(400);
    expect(saveAnswer).not.toHaveBeenCalled();
  });
  it("200: patch を lifecycle にそのまま渡す(chosen: null = 回答取り消しも valid)", async () => {
    saveAnswer.mockResolvedValue({ status: 200, session: {} });
    expect((await patch(JSON.stringify({ chosen: null, flagged: true }))).status).toBe(200);
    expect(saveAnswer.mock.calls[0].slice(0, 3)).toEqual([SID, "f-d1-q001", { chosen: null, flagged: true }]);
  });
  it("409(terminal)はセッション状態を返す。404 はそのまま", async () => {
    const s = { id: SID, exam: "ccar-f", kind: "full", formId: "form-a", domainId: null, questionIds: [], status: "submitted", submissionReason: "timeout", startedAt: new Date(), deadlineAt: null, currentIndex: 0, finishedAt: new Date(), scoreRaw: 0 };
    saveAnswer.mockResolvedValue({ status: 409, error: "session_terminal", session: s });
    const res = await patch(JSON.stringify({ chosen: ["A"] }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "session_terminal", session: { status: "submitted" } });
    saveAnswer.mockResolvedValue({ status: 404, error: "unknown_session" });
    expect((await patch(JSON.stringify({ chosen: ["A"] }))).status).toBe(404);
  });
});

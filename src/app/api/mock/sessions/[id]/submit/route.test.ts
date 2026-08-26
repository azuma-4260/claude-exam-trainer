import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

// D3-1: 提出 API(再提出 200 / abandon 先着 409)

const submitSession = vi.fn();
vi.mock("@/lib/mock/lifecycle", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mock/lifecycle")>()),
  submitSession: (...a: unknown[]) => submitSession(...a),
}));
vi.mock("@/lib/mock/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mock/server")>()),
  mockServerContext: () => ({ deps: { tag: "deps" }, forms: [], scenarios: null }),
}));

const { POST } = await import("./route");
const SECRET = "test-session-secret-0123456789abcdef";
const SID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-08-27T10:00:00+09:00");
const session = { id: SID, exam: "ccar-f", kind: "full", formId: "form-a", domainId: null, questionIds: [], status: "submitted", submissionReason: "manual", startedAt: NOW, deadlineAt: NOW, currentIndex: 0, finishedAt: NOW, scoreRaw: 42 };
const post = (id = SID, auth = true) =>
  POST(
    new Request(`https://app.example/api/mock/sessions/${id}/submit`, {
      method: "POST",
      headers: auth ? { cookie: `${SESSION_COOKIE}=${createSessionToken(SECRET)}` } : {},
    }),
    { params: Promise.resolve({ id }) },
  );

describe("POST /api/mock/sessions/[id]/submit", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    submitSession.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("未認証 401 / id 不正 400", async () => {
    expect((await post(SID, false)).status).toBe(401);
    expect((await post("not-uuid")).status).toBe(400);
    expect(submitSession).not.toHaveBeenCalled();
  });
  it("200: replayed と score_raw 入りセッションを返す(再提出リトライも同じ形)", async () => {
    submitSession.mockResolvedValue({ status: 200, replayed: true, session });
    const body = await (await post()).json();
    expect(body).toMatchObject({ replayed: true, session: { score_raw: 42, submission_reason: "manual" } });
  });
  it("abandon 先着は 409、未知セッションは 404", async () => {
    submitSession.mockResolvedValue({ status: 409, error: "session_abandoned", session: { ...session, status: "abandoned" } });
    expect((await post()).status).toBe(409);
    submitSession.mockResolvedValue({ status: 404, error: "unknown_session" });
    expect((await post()).status).toBe(404);
  });
});

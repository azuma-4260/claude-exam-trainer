import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

// D3-1: abandon API(full 不可 / mini 可は lifecycle 側でテスト済み。ここはマッピング)

const abandonSession = vi.fn();
vi.mock("@/lib/mock/lifecycle", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mock/lifecycle")>()),
  abandonSession: (...a: unknown[]) => abandonSession(...a),
}));
vi.mock("@/lib/mock/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mock/server")>()),
  mockServerContext: () => ({ deps: { tag: "deps" }, forms: [], scenarios: null }),
}));

const { POST } = await import("./route");
const SECRET = "test-session-secret-0123456789abcdef";
const SID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-08-27T10:00:00+09:00");
const session = { id: SID, exam: "ccar-f", kind: "domain_mini", formId: null, domainId: "f-d2", questionIds: [], status: "abandoned", submissionReason: null, startedAt: NOW, deadlineAt: NOW, currentIndex: 0, finishedAt: NOW, scoreRaw: null };
const post = (id = SID, auth = true) =>
  POST(
    new Request(`https://app.example/api/mock/sessions/${id}/abandon`, {
      method: "POST",
      headers: auth ? { cookie: `${SESSION_COOKIE}=${createSessionToken(SECRET)}` } : {},
    }),
    { params: Promise.resolve({ id }) },
  );

describe("POST /api/mock/sessions/[id]/abandon", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    abandonSession.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("未認証 401 / id 不正 400", async () => {
    expect((await post(SID, false)).status).toBe(401);
    expect((await post("not-uuid")).status).toBe(400);
  });
  it("200: abandoned セッションを返す", async () => {
    abandonSession.mockResolvedValue({ status: 200, session });
    expect(await (await post()).json()).toMatchObject({ session: { status: "abandoned" } });
  });
  it("full の abandon は 409(abandon_not_allowed)", async () => {
    abandonSession.mockResolvedValue({ status: 409, error: "abandon_not_allowed", session: { ...session, kind: "full", status: "in_progress" } });
    const res = await post();
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "abandon_not_allowed" });
  });
});

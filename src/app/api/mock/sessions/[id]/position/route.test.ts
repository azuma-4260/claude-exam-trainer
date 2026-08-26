import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

// D3-1: 現在位置保存 API のマッピング

const savePosition = vi.fn();
vi.mock("@/lib/mock/lifecycle", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mock/lifecycle")>()),
  savePosition: (...a: unknown[]) => savePosition(...a),
}));
vi.mock("@/lib/mock/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mock/server")>()),
  mockServerContext: () => ({ deps: { tag: "deps" }, forms: [], scenarios: null }),
}));

const { PATCH } = await import("./route");
const SECRET = "test-session-secret-0123456789abcdef";
const SID = "11111111-1111-4111-8111-111111111111";
const patch = (body: string, id = SID, auth = true) =>
  PATCH(
    new Request(`https://app.example/api/mock/sessions/${id}/position`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...(auth ? { cookie: `${SESSION_COOKIE}=${createSessionToken(SECRET)}` } : {}) },
      body,
    }),
    { params: Promise.resolve({ id }) },
  );

describe("PATCH /api/mock/sessions/[id]/position", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    savePosition.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("未認証 401 / 入力不正 400(負数・小数・欠落)", async () => {
    expect((await patch(JSON.stringify({ current_index: 1 }), SID, false)).status).toBe(401);
    expect((await patch(JSON.stringify({ current_index: -1 }))).status).toBe(400);
    expect((await patch(JSON.stringify({ current_index: 1.5 }))).status).toBe(400);
    expect((await patch(JSON.stringify({}))).status).toBe(400);
    expect(savePosition).not.toHaveBeenCalled();
  });
  it("200 と、範囲外 400(lifecycle 判定)のマッピング", async () => {
    savePosition.mockResolvedValue({ status: 200, session: {} });
    expect((await patch(JSON.stringify({ current_index: 3 }))).status).toBe(200);
    expect(savePosition.mock.calls[0].slice(0, 2)).toEqual([SID, 3]);
    savePosition.mockResolvedValue({ status: 400, error: "invalid_index" });
    expect((await patch(JSON.stringify({ current_index: 999 }))).status).toBe(400);
  });
});

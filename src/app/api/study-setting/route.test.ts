import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { decideProxy } from "@/lib/auth/proxy-decision";

// T-exam: 学習スコープ API の認証境界・入力検証・fail closed(specs/03 §study_setting、06 §認証)。
// DB には触れず repo を mock する。

const getStudyScope = vi.fn();
const setStudyScope = vi.fn();
vi.mock("@/lib/scope/repo", () => ({
  getStudyScope: (...a: unknown[]) => getStudyScope(...a),
  setStudyScope: (...a: unknown[]) => setStudyScope(...a),
}));
vi.mock("@/db/client", () => ({ getDb: () => ({ tag: "fake-db" }) }));

const { GET, PUT } = await import("./route");
const SECRET = "test-session-secret-0123456789abcdef";
const cookie = () => `${SESSION_COOKIE}=${createSessionToken(SECRET)}`;
const put = (body: string, withCookie = true) =>
  PUT(
    new Request("https://app.example/api/study-setting", {
      method: "PUT",
      headers: { "content-type": "application/json", ...(withCookie ? { cookie: cookie() } : {}) },
      body,
    }),
  );

describe("/api/study-setting", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    getStudyScope.mockReset();
    setStudyScope.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("Proxy も未認証の /api/study-setting を 401 にする", () => {
    expect(decideProxy("/api/study-setting", null, SECRET)).toEqual({ kind: "unauthorized" });
  });

  it("未認証の GET / PUT は 401 で、repo に触れない", async () => {
    expect((await GET(new Request("https://app.example/api/study-setting"))).status).toBe(401);
    expect((await put(JSON.stringify({ scope: "ccar-p" }), false)).status).toBe(401);
    expect(getStudyScope).not.toHaveBeenCalled();
    expect(setStudyScope).not.toHaveBeenCalled();
  });

  it("GET は現在のスコープを返す", async () => {
    getStudyScope.mockResolvedValue("ccar-f");
    const res = await GET(new Request("https://app.example/api/study-setting", { headers: { cookie: cookie() } }));
    expect(await res.json()).toEqual({ scope: "ccar-f" });
  });

  it("PUT は 3 値以外・未知キー・不正 JSON を 400 にする", async () => {
    expect((await put(JSON.stringify({ scope: "ccar-x" }))).status).toBe(400);
    expect((await put(JSON.stringify({ scope: "both", extra: 1 }))).status).toBe(400);
    expect((await put("{")).status).toBe(400);
    expect(setStudyScope).not.toHaveBeenCalled();
  });

  it("PUT は検証済みスコープで repo を呼び、結果を返す", async () => {
    setStudyScope.mockResolvedValue({ ok: true, scope: "both" });
    const res = await put(JSON.stringify({ scope: "both" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ scope: "both" });
    expect(setStudyScope).toHaveBeenCalledWith({ tag: "fake-db" }, "both", expect.any(Date));
  });

  it("試験日未設定の exam を含むスコープは 409(fail closed)", async () => {
    setStudyScope.mockResolvedValue({ ok: false, error: "exam_date_unset", exams: ["ccar-p"] });
    const res = await put(JSON.stringify({ scope: "ccar-p" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "exam_date_unset", exams: ["ccar-p"] });
  });
});

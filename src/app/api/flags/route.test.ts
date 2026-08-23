import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

// D1-6: フラグ API のハンドラ内再検証と入力検証(specs/06 §認証、03 §question_flag)。
// DB には触れず repo を mock する(正常系では repo が検証済み payload で呼ばれることを見る)。

const upsertOpenFlag = vi.fn();
const findOpenFlag = vi.fn();
vi.mock("@/lib/flags/repo", () => ({
  upsertOpenFlag: (...args: unknown[]) => upsertOpenFlag(...args),
  findOpenFlag: (...args: unknown[]) => findOpenFlag(...args),
}));
vi.mock("@/db/client", () => ({ getDb: () => ({ tag: "fake-db" }) }));

const { GET, POST } = await import("./route");

const SECRET = "test-session-secret-0123456789abcdef";
const cookie = () => `${SESSION_COOKIE}=${createSessionToken(SECRET)}`;

const post = (body: string, withCookie = true) =>
  POST(
    new Request("https://app.example/api/flags", {
      method: "POST",
      headers: { "content-type": "application/json", ...(withCookie ? { cookie: cookie() } : {}) },
      body,
    }),
  );

const valid = { question_id: "f-d2-q014", question_rev: 2, reason: "ambiguous", memo: "曖昧" };

describe("POST /api/flags", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    upsertOpenFlag.mockReset();
    findOpenFlag.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("Cookie なしは 401(Proxy に頼らずハンドラ内で再検証)", async () => {
    const res = await post(JSON.stringify(valid), false);
    expect(res.status).toBe(401);
    expect(upsertOpenFlag).not.toHaveBeenCalled();
  });

  it("改竄トークンは 401", async () => {
    const res = await POST(
      new Request("https://app.example/api/flags", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `${SESSION_COOKIE}=forged.token` },
        body: JSON.stringify(valid),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("壊れた JSON は 400 で DB に到達しない", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_json" });
    expect(upsertOpenFlag).not.toHaveBeenCalled();
  });

  it("schema 不正(reason 外の値)は 400 で DB に到達しない", async () => {
    const res = await post(JSON.stringify({ ...valid, reason: "typo" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_request");
    expect(upsertOpenFlag).not.toHaveBeenCalled();
  });

  it("正常入力は検証済み payload で upsert され 200 で行を返す", async () => {
    const row = { id: "00000000-0000-4000-8000-000000000001", questionId: "f-d2-q014", questionRev: 2, reason: "ambiguous", memo: "曖昧", resolvedAt: null };
    upsertOpenFlag.mockResolvedValue(row);
    const res = await post(JSON.stringify(valid));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ flag: row });
    expect(upsertOpenFlag).toHaveBeenCalledTimes(1);
    expect(upsertOpenFlag.mock.calls[0][0]).toEqual({ tag: "fake-db" });
    expect(upsertOpenFlag.mock.calls[0][1]).toEqual(valid);
  });

  it("DB 例外は 500", async () => {
    upsertOpenFlag.mockRejectedValue(new Error("neon down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post(JSON.stringify(valid));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/flags", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    findOpenFlag.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  const get = (qs: string, withCookie = true) =>
    GET(new Request(`https://app.example/api/flags?${qs}`, { headers: withCookie ? { cookie: cookie() } : {} }));

  it("Cookie なしは 401", async () => {
    expect((await get("question_id=f-d2-q014&question_rev=2", false)).status).toBe(401);
  });

  it("不正なクエリは 400", async () => {
    expect((await get("question_id=bad&question_rev=2")).status).toBe(400);
    expect((await get("question_id=f-d2-q014&question_rev=0")).status).toBe(400);
    expect(findOpenFlag).not.toHaveBeenCalled();
  });

  it("特定 rev の open フラグを返す(無ければ null)", async () => {
    findOpenFlag.mockResolvedValue(null);
    const res = await get("question_id=f-d2-q014&question_rev=2");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ flag: null });
    expect(findOpenFlag).toHaveBeenCalledWith({ tag: "fake-db" }, "f-d2-q014", 2);
  });
});

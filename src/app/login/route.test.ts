import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { GET, POST } from "./route";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const SECRET = "test-session-secret-0123456789abcdef";
const PASSCODE = "correct-passcode";

const postForm = (passcode: string, accept?: string) =>
  POST(
    new Request("https://app.example/login", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...(accept ? { accept } : {}),
      },
      body: new URLSearchParams({ passcode }),
    }),
  );

describe("POST /login(specs/06 §認証)", () => {
  beforeEach(() => {
    vi.stubEnv("APP_PASSCODE", PASSCODE);
    vi.stubEnv("SESSION_SECRET", SECRET);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("正パスコードで署名トークンの Set-Cookie が発行される", async () => {
    const res = await postForm(PASSCODE);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    const token = setCookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))![1];
    // Cookie に入るのは署名トークンのみ(パスコード自体は入らない)
    expect(token).not.toContain(PASSCODE);
    expect(verifySessionToken(token, SECRET)).toBe(true);
  });

  it("フォーム送信(Accept: text/html)は Cookie 付きで Home へ 303", async () => {
    const res = await postForm(PASSCODE, "text/html,application/xhtml+xml");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");
    expect(res.headers.get("set-cookie")).toContain(SESSION_COOKIE);
  });

  it("誤パスコード・欠落は 401 で Cookie を発行しない", async () => {
    for (const res of [await postForm("wrong-passcode"), await postForm("")]) {
      expect(res.status).toBe(401);
      expect(res.headers.get("set-cookie")).toBeNull();
    }
  });

  it("JSON ボディでもログインできる", async () => {
    const res = await POST(
      new Request("https://app.example/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode: PASSCODE }),
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain(SESSION_COOKIE);
  });

  it("APP_PASSCODE / SESSION_SECRET 未設定は 500(fail closed)", async () => {
    vi.stubEnv("APP_PASSCODE", "");
    const res = await postForm(PASSCODE);
    expect(res.status).toBe(500);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("GET /login はログインフォームを返す", async () => {
    const res = await GET();
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain(`action="/login"`);
  });
});

describe("specs/06 §リクエスト前段の規約", () => {
  it("middleware.ts は存在せず、proxy.ts(src/)を使う", () => {
    expect(existsSync("middleware.ts")).toBe(false);
    expect(existsSync("src/middleware.ts")).toBe(false);
    expect(existsSync("src/proxy.ts")).toBe(true);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SESSION_COOKIE,
  buildSessionCookie,
  createSessionToken,
  hasValidSession,
  parseCookies,
  passcodeMatches,
  requireSession,
  verifySessionToken,
} from "./session";
import { decideProxy } from "./proxy-decision";

const SECRET = "test-session-secret-0123456789abcdef";

describe("セッショントークン(HMAC 署名)", () => {
  it("発行したトークンは検証を通る", () => {
    const token = createSessionToken(SECRET);
    expect(verifySessionToken(token, SECRET)).toBe(true);
  });

  it("payload の改竄・署名の改竄・別 secret は拒否する", () => {
    const token = createSessionToken(SECRET);
    const [v, payload, sig] = token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ iat: 0 })).toString("base64url");
    expect(verifySessionToken(`${v}.${tamperedPayload}.${sig}`, SECRET)).toBe(false);
    expect(verifySessionToken(`${v}.${payload}.${sig.slice(0, -2)}xx`, SECRET)).toBe(false);
    expect(verifySessionToken(token, "another-secret")).toBe(false);
  });

  it("形式不正(欠落・空・バージョン違い)は拒否する", () => {
    expect(verifySessionToken(null, SECRET)).toBe(false);
    expect(verifySessionToken("", SECRET)).toBe(false);
    expect(verifySessionToken("v1.onlytwo", SECRET)).toBe(false);
    const token = createSessionToken(SECRET);
    expect(verifySessionToken(token.replace(/^v1\./, "v9."), SECRET)).toBe(false);
  });

  it("Cookie 属性は HttpOnly; Secure; SameSite=Lax の長期 Cookie(specs/06)", () => {
    const cookie = buildSessionCookie("token-value");
    expect(cookie).toContain(`${SESSION_COOKIE}=token-value`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toMatch(/Max-Age=\d{7,}/);
  });
});

describe("passcodeMatches", () => {
  it("一致のみ true(長さ違いでも例外にならない)", () => {
    expect(passcodeMatches("correct horse", "correct horse")).toBe(true);
    expect(passcodeMatches("wrong", "correct horse")).toBe(false);
    expect(passcodeMatches("", "correct horse")).toBe(false);
  });
});

describe("parseCookies", () => {
  it("複数 Cookie から値を取り出す", () => {
    expect(parseCookies("a=1; ccar_session=tok; b=2")).toEqual({ a: "1", ccar_session: "tok", b: "2" });
    expect(parseCookies(null)).toEqual({});
  });
});

describe("requireSession(ハンドラ内再検証)", () => {
  beforeEach(() => vi.stubEnv("SESSION_SECRET", SECRET));
  afterEach(() => vi.unstubAllEnvs());

  const requestWith = (cookie?: string) =>
    new Request("https://app.example/api/answer", {
      method: "POST",
      headers: cookie ? { cookie } : {},
    });

  it("未ログイン(Cookie なし)は 401", async () => {
    const res = requireSession(requestWith());
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
    await expect(res!.json()).resolves.toEqual({ error: "unauthorized" });
  });

  it("有効なトークンなら通す(null)", () => {
    const token = createSessionToken(SECRET);
    expect(requireSession(requestWith(`${SESSION_COOKIE}=${token}`))).toBeNull();
  });

  it("改竄 Cookie は 401", () => {
    const token = createSessionToken(SECRET);
    const tampered = token.slice(0, -3) + "abc";
    const res = requireSession(requestWith(`${SESSION_COOKIE}=${tampered}`));
    expect(res!.status).toBe(401);
  });

  it("SESSION_SECRET 未設定なら常に 401(fail closed)", () => {
    vi.stubEnv("SESSION_SECRET", "");
    const token = createSessionToken(SECRET);
    expect(hasValidSession(requestWith(`${SESSION_COOKIE}=${token}`))).toBe(false);
  });
});

describe("decideProxy(optimistic check)", () => {
  const token = createSessionToken(SECRET);
  const cookie = `${SESSION_COOKIE}=${token}`;

  it("公開パス(/login, /_next/*, favicon)は未認証でも通す", () => {
    expect(decideProxy("/login", null, SECRET)).toEqual({ kind: "next" });
    expect(decideProxy("/_next/static/x.js", null, SECRET)).toEqual({ kind: "next" });
    expect(decideProxy("/favicon.ico", null, SECRET)).toEqual({ kind: "next" });
  });

  it("有効な Cookie は通す", () => {
    expect(decideProxy("/", cookie, SECRET)).toEqual({ kind: "next" });
    expect(decideProxy("/api/queue", cookie, SECRET)).toEqual({ kind: "next" });
  });

  it("未認証の API は 401、ページは /login へリダイレクト", () => {
    expect(decideProxy("/api/queue", null, SECRET)).toEqual({ kind: "unauthorized" });
    expect(decideProxy("/", null, SECRET)).toEqual({ kind: "redirect", to: "/login" });
  });

  it("改竄 Cookie・secret 未設定は未認証扱い", () => {
    const tampered = `${SESSION_COOKIE}=${token.slice(0, -3)}abc`;
    expect(decideProxy("/api/queue", tampered, SECRET)).toEqual({ kind: "unauthorized" });
    expect(decideProxy("/", cookie, undefined)).toEqual({ kind: "redirect", to: "/login" });
  });
});

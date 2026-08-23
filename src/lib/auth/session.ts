import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * 認証(specs/06 §認証・固定仕様)。
 * - POST /login で APP_PASSCODE 照合 → SESSION_SECRET 署名(HMAC)トークンを
 *   HttpOnly; Secure; SameSite=Lax 長期 Cookie に発行する
 * - パスコード自体・無署名フラグは Cookie に保存しない(保存するのは署名トークンのみ)
 */

export const SESSION_COOKIE = "ccar_session";

/** 長期 Cookie(400 日 = ブラウザの Max-Age 上限目安) */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 400;

const TOKEN_VERSION = "v1";

const hmac = (payload: string, secret: string): string =>
  createHmac("sha256", secret).update(`${TOKEN_VERSION}.${payload}`).digest("base64url");

/** 署名付きセッショントークンを発行する(payload は発行時刻のみ) */
export function createSessionToken(secret: string, now: Date = new Date()): string {
  const payload = Buffer.from(
    JSON.stringify({ iat: Math.floor(now.getTime() / 1000) }),
  ).toString("base64url");
  return `${TOKEN_VERSION}.${payload}.${hmac(payload, secret)}`;
}

/** トークンの HMAC 署名を検証する(timing-safe)。形式不正・改竄は false */
export function verifySessionToken(token: string | undefined | null, secret: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return false;
  const actual = Buffer.from(parts[2]);
  const expected = Buffer.from(hmac(parts[1], secret));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** パスコード照合(sha256 に落としてから timing-safe 比較) */
export function passcodeMatches(input: string, expected: string): boolean {
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(input), digest(expected));
}

export function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    cookies[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return cookies;
}

/** Set-Cookie 値(specs/06: HttpOnly; Secure; SameSite=Lax 長期 Cookie) */
export function buildSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}; HttpOnly; Secure; SameSite=Lax`;
}

/** リクエストの Cookie に有効なセッショントークンがあるか(DB 非依存) */
export function hasValidSession(request: Request): boolean {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const token = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
  return verifySessionToken(token, secret);
}

/**
 * write 系 API / export のハンドラ内再検証(specs/06: Proxy は optimistic check のみで
 * 完全な認可境界としない)。未認証なら 401 レスポンスを返し、認証済みなら null。
 */
export function requireSession(request: Request): Response | null {
  if (hasValidSession(request)) return null;
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

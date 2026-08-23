import { SESSION_COOKIE, parseCookies, verifySessionToken } from "./session";

/**
 * proxy.ts の optimistic check の判定本体(specs/06 §リクエスト前段)。
 * Cookie 署名の検証だけを行い DB には触れない。純関数にして Vitest で検証する。
 */

export type ProxyDecision =
  | { kind: "next" }
  | { kind: "unauthorized" }
  | { kind: "redirect"; to: string };

/** 未認証でも通すパス(matcher でも除外するが多層防御として判定にも持つ) */
const isPublicPath = (pathname: string): boolean =>
  pathname === "/login" ||
  pathname === "/favicon.ico" ||
  pathname.startsWith("/_next/");

export function decideProxy(
  pathname: string,
  cookieHeader: string | null,
  secret: string | undefined,
): ProxyDecision {
  if (isPublicPath(pathname)) return { kind: "next" };
  const token = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (secret && verifySessionToken(token, secret)) return { kind: "next" };
  if (pathname.startsWith("/api/")) return { kind: "unauthorized" };
  return { kind: "redirect", to: "/login" };
}

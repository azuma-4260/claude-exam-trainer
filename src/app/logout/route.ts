import { SESSION_COOKIE } from "@/lib/auth/session";

/** S-9 ログアウト。セッション Cookie を同一属性で即時失効させる。 */
export async function POST(request: Request) {
  const headers = new Headers({
    location: new URL("/login", request.url).toString(),
    "set-cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  });
  return new Response(null, { status: 303, headers });
}

import { NextResponse, type NextRequest } from "next/server";
import { decideProxy } from "./lib/auth/proxy-decision";

/**
 * 認証の optimistic check(specs/06 §リクエスト前段)。
 * Next.js 16 の proxy.ts(Node.js runtime)。middleware.ts は使用しない。
 * ここは署名 Cookie の検証のみで、write 系 API / export は各ハンドラ内でも
 * requireSession で再検証する(Proxy を完全な認可境界としない)。
 */
export function proxy(request: NextRequest) {
  const decision = decideProxy(
    request.nextUrl.pathname,
    request.headers.get("cookie"),
    process.env.SESSION_SECRET,
  );
  switch (decision.kind) {
    case "next":
      return NextResponse.next();
    case "unauthorized":
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    case "redirect":
      return NextResponse.redirect(new URL(decision.to, request.nextUrl));
  }
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon\\.ico).*)"],
};

import {
  buildSessionCookie,
  createSessionToken,
  passcodeMatches,
} from "@/lib/auth/session";

/**
 * POST /login(specs/06 §認証)。
 * APP_PASSCODE 照合 → SESSION_SECRET 署名トークンを HttpOnly; Secure; SameSite=Lax
 * 長期 Cookie に発行する。GET は最小のログインフォームを返す(専用画面は specs/05 に
 * 未定義のため、route handler 内の静的 HTML で完結させる)。
 */

const LOGIN_HTML = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ログイン — CCAR-F Trainer</title>
  <style>
    body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100dvh; margin: 0; background: #0a0a0a; color: #ededed; }
    form { display: grid; gap: 12px; width: min(320px, 90vw); }
    h1 { font-size: 1.1rem; text-align: center; }
    input, button { font-size: 1rem; padding: 10px 12px; border-radius: 8px; border: 1px solid #333; }
    input { background: #171717; color: inherit; }
    button { background: #ededed; color: #0a0a0a; cursor: pointer; }
  </style>
</head>
<body>
  <form method="post" action="/login">
    <h1>CCAR-F Trainer</h1>
    <input type="password" name="passcode" placeholder="パスコード" autocomplete="current-password" autofocus required />
    <button type="submit">ログイン</button>
  </form>
</body>
</html>
`;

export async function GET() {
  return new Response(LOGIN_HTML, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function readPasscode(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body: unknown = await request.json();
      const passcode =
        typeof body === "object" && body !== null && "passcode" in body
          ? (body as { passcode: unknown }).passcode
          : null;
      return typeof passcode === "string" ? passcode : null;
    }
    const form = await request.formData();
    const passcode = form.get("passcode");
    return typeof passcode === "string" ? passcode : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const appPasscode = process.env.APP_PASSCODE;
  const secret = process.env.SESSION_SECRET;
  if (!appPasscode || !secret) {
    return Response.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const passcode = await readPasscode(request);
  if (!passcode || !passcodeMatches(passcode, appPasscode)) {
    return Response.json({ error: "invalid_passcode" }, { status: 401 });
  }

  const headers = new Headers({
    "set-cookie": buildSessionCookie(createSessionToken(secret)),
  });
  // フォーム送信(ブラウザ)は Home へ、fetch(JSON)は 200 を返す
  if ((request.headers.get("accept") ?? "").includes("text/html")) {
    headers.set("location", "/");
    return new Response(null, { status: 303, headers });
  }
  return Response.json({ ok: true }, { headers });
}

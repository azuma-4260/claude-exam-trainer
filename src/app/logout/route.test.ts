import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { SESSION_COOKIE } from "@/lib/auth/session";

describe("POST /logout(specs/05 S-9)", () => {
  it("セッション Cookie を失効させてログインへ戻す", async () => {
    const res = await POST(new Request("https://app.example/logout", { method: "POST" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://app.example/login");
    expect(res.headers.get("set-cookie")).toContain(`${SESSION_COOKIE}=;`);
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
  });
});

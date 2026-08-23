import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

// D1-3: 回答 API のハンドラ内再検証・入力検証・processAnswer 結果のマッピング(DB とバンクは mock)

const processAnswer = vi.fn();
vi.mock("@/lib/answer/process", () => ({ processAnswer: (...a: unknown[]) => processAnswer(...a) }));
vi.mock("@/lib/answer/store", () => ({ createAnswerStore: () => ({ tag: "store" }), loadPoolContext: async () => ({ forms: [], sessions: [], flags: [] }) }));
vi.mock("@/db/client", () => ({ getDb: () => ({ tag: "db" }) }));
vi.mock("@/lib/bank/load", () => ({ loadBank: () => ({ questions: [], forms: [], byId: new Map() }) }));

const { POST } = await import("./route");
const SECRET = "test-session-secret-0123456789abcdef";
const post = (body: string, auth = true) =>
  POST(new Request("https://app.example/api/answers", { method: "POST", headers: { "content-type": "application/json", ...(auth ? { cookie: `${SESSION_COOKIE}=${createSessionToken(SECRET)}` } : {}) }, body }));
const valid = { kind: "mcq", attempt_id: "11111111-1111-4111-8111-111111111111", question_id: "f-d2-q001", question_rev: 1, mode: "drill", chosen: ["B"] };

describe("POST /api/answers", () => {
  beforeEach(() => { vi.stubEnv("SESSION_SECRET", SECRET); processAnswer.mockReset(); });
  afterEach(() => vi.unstubAllEnvs());

  it("未認証は 401(ハンドラ内再検証)", async () => {
    expect((await post(JSON.stringify(valid), false)).status).toBe(401);
    expect(processAnswer).not.toHaveBeenCalled();
  });
  it("壊れた JSON / schema 不正は 400", async () => {
    expect((await post("{")).status).toBe(400);
    expect((await post(JSON.stringify({ ...valid, mode: "mock" }))).status).toBe(400);
    expect(processAnswer).not.toHaveBeenCalled();
  });
  it("200: replayed / attempt / srs を返す", async () => {
    processAnswer.mockResolvedValue({ status: 200, replayed: false, attempt: { attemptId: valid.attempt_id }, srs: null });
    const res = await post(JSON.stringify(valid));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ replayed: false, attempt: { attemptId: valid.attempt_id }, srs: null });
    expect(processAnswer.mock.calls[0][0]).toEqual(valid);
  });
  it("409 / 404 は error と reason をそのまま返す", async () => {
    processAnswer.mockResolvedValue({ status: 409, error: "not_eligible", reason: "holdout" });
    const res = await post(JSON.stringify(valid));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "not_eligible", reason: "holdout" });
    processAnswer.mockResolvedValue({ status: 404, error: "unknown_question" });
    expect((await post(JSON.stringify(valid))).status).toBe(404);
  });
  it("例外は 500", async () => {
    processAnswer.mockRejectedValue(new Error("neon down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post(JSON.stringify(valid))).status).toBe(500);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const loadExportData = vi.fn();
const fakeBank = { questions: [], forms: [], byId: new Map() };
vi.mock("@/lib/export/load", () => ({ loadExportData: (...args: unknown[]) => loadExportData(...args) }));
vi.mock("@/db/client", () => ({ getDb: () => ({ tag: "fake-db" }) }));
vi.mock("@/lib/bank/load", () => ({ loadBank: () => fakeBank }));

const { GET } = await import("./route");
const SECRET = "test-session-secret-0123456789abcdef";
const cookie = () => `${SESSION_COOKIE}=${createSessionToken(SECRET)}`;

const tables = {
  srs_state: [{ questionId: "f-d1-q001" }],
  attempt: [],
  exam_session: [],
  exam_session_answer: [],
  question_flag: [{ questionId: "f-d1-q001", questionRev: 1 }],
};

describe("GET /api/export(specs/03 §3)", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    loadExportData.mockReset();
    loadExportData.mockResolvedValue(tables);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("Cookie なしは 401(Proxy に頼らずハンドラ内で再検証)", async () => {
    const res = await GET(new Request("https://app.example/api/export"));
    expect(res.status).toBe(401);
    expect(loadExportData).not.toHaveBeenCalled();
  });

  it("認証済みは 5 テーブルを JSON ダウンロードで返す", async () => {
    const res = await GET(new Request("https://app.example/api/export", { headers: { cookie: cookie() } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    const body = await res.json();
    expect(Object.keys(body)).toEqual([
      "srs_state",
      "attempt",
      "exam_session",
      "exam_session_answer",
      "question_flag",
    ]);
    expect(body).toEqual(tables);
    expect(loadExportData).toHaveBeenCalledWith({ tag: "fake-db" }, fakeBank);
  });

  it("DB 例外は 500", async () => {
    loadExportData.mockRejectedValue(new Error("neon down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(new Request("https://app.example/api/export", { headers: { cookie: cookie() } }));
    expect(res.status).toBe(500);
  });
});

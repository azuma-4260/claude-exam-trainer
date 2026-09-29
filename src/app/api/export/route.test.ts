import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const loadExportData = vi.fn();
const fakeBank = { questions: [], forms: [], byId: new Map() };
vi.mock("@/lib/export/load", () => ({ loadExportData: (...args: unknown[]) => loadExportData(...args) }));
vi.mock("@/db/client", () => ({ getDb: () => ({ tag: "fake-db" }) }));
vi.mock("@/lib/bank/runtime", () => ({ loadMultiBank: () => ({ all: fakeBank }) }));

const { GET } = await import("./route");
const SECRET = "test-session-secret-0123456789abcdef";
const cookie = () => `${SESSION_COOKIE}=${createSessionToken(SECRET)}`;

const tables = {
  srs_state: [{ questionId: "f-d1-q001", exam: "ccar-f" }],
  attempt: [],
  exam_session: [],
  exam_session_answer: [],
  question_flag: [{ questionId: "f-d1-q001", questionRev: 1 }],
  study_setting: [{ id: 1, scope: "both" }],
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

  it("認証済みは 5 テーブル + study_setting(全 exam)を JSON ダウンロードで返す", async () => {
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
      "study_setting",
    ]);
    expect(body).toEqual(tables);
    expect(loadExportData).toHaveBeenCalledWith({ tag: "fake-db" }, fakeBank);
  });

  it("?exam=ccar-p はその exam の行だけを返し、study_setting を含めない(specs/03 §3 v1.3)", async () => {
    const res = await GET(new Request("https://app.example/api/export?exam=ccar-p", { headers: { cookie: cookie() } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("export-ccar-p-");
    const body = await res.json();
    expect(body).toEqual({ srs_state: [], attempt: [], exam_session: [], exam_session_answer: [], question_flag: [] });
  });

  it("?exam=ccar-f は F の行を返す", async () => {
    const res = await GET(new Request("https://app.example/api/export?exam=ccar-f", { headers: { cookie: cookie() } }));
    const body = await res.json();
    expect(body.srs_state).toEqual(tables.srs_state);
    expect(body.question_flag).toEqual(tables.question_flag);
    expect(body).not.toHaveProperty("study_setting");
  });

  it("不正な exam は 400(DB を読まない)", async () => {
    const res = await GET(new Request("https://app.example/api/export?exam=ccar-x", { headers: { cookie: cookie() } }));
    expect(res.status).toBe(400);
    expect(loadExportData).not.toHaveBeenCalled();
  });

  it("DB 例外は 500", async () => {
    loadExportData.mockRejectedValue(new Error("neon down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(new Request("https://app.example/api/export", { headers: { cookie: cookie() } }));
    expect(res.status).toBe(500);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import type { ExamSessionRow } from "@/db/schema";
import { mcq } from "@/lib/queue/test-fixtures";

// D3-1: 復元 API(05 S-5)。期限超過は timed_out、正解・解説は返さない

const restoreCurrent = vi.fn();
vi.mock("@/lib/mock/lifecycle", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mock/lifecycle")>()),
  restoreCurrent: (...a: unknown[]) => restoreCurrent(...a),
}));

const Q1 = mcq("f-d1-q001", { scenario_id: "sc-a", eligible_modes: ["mock"], srs_eligible: false });
vi.mock("@/lib/mock/server", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/mock/server")>();
  return {
    ...orig,
    mockServerContext: () => ({
      deps: { findQuestion: (id: string) => (id === Q1.id ? Q1 : null), store: {}, now: new Date(), newSessionId: () => "x" },
      forms: [],
      scenarios: null, // scenarios.yaml 未整備でも見出し無しで動く
    }),
  };
});

const { GET } = await import("./route");
const SECRET = "test-session-secret-0123456789abcdef";
const get = (auth = true) =>
  GET(
    new Request("https://app.example/api/mock/sessions/current", {
      headers: auth ? { cookie: `${SESSION_COOKIE}=${createSessionToken(SECRET)}` } : {},
    }),
  );

const NOW = new Date("2026-08-27T10:00:00+09:00");
const session: ExamSessionRow = {
  id: "11111111-1111-4111-8111-111111111111",
  exam: "ccar-f",
  kind: "full",
  formId: "form-a",
  domainId: null,
  questionIds: [Q1.id],
  status: "in_progress",
  submissionReason: null,
  startedAt: NOW,
  deadlineAt: new Date(NOW.getTime() + 120 * 60_000),
  currentIndex: 0,
  finishedAt: null,
  scoreRaw: null,
};

describe("GET /api/mock/sessions/current", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    restoreCurrent.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("未認証は 401", async () => {
    expect((await get(false)).status).toBe(401);
  });
  it("進行中なしは 204", async () => {
    restoreCurrent.mockResolvedValue({ status: 204 });
    expect((await get()).status).toBe(204);
  });
  it("in_progress: 回答状態つきで返す(scenarios 未整備なら title/context は null)", async () => {
    restoreCurrent.mockResolvedValue({
      status: 200,
      kind: "in_progress",
      session,
      answers: [{ sessionId: session.id, questionId: Q1.id, questionRev: 1, chosen: ["B"], flagged: true, answerUpdatedAt: NOW, updatedAt: NOW }],
    });
    const res = await get();
    expect(res.status).toBe(200);
    const text = await res.text();
    const body = JSON.parse(text);
    expect(body.kind).toBe("in_progress");
    expect(body.answers).toEqual([{ question_id: Q1.id, chosen: ["B"], flagged: true }]);
    expect(body.scenarios).toEqual([{ id: "sc-a", title_en: null, context_en: null }]);
    expect(text).not.toContain('"answer"');
    expect(text).not.toContain("explanation");
  });
  it("期限超過は timeout 提出済みセッションを timed_out で返す", async () => {
    const submitted = { ...session, status: "submitted", submissionReason: "timeout", finishedAt: NOW, scoreRaw: 0 };
    restoreCurrent.mockResolvedValue({ status: 200, kind: "timed_out", session: submitted });
    const body = await (await get()).json();
    expect(body).toMatchObject({ kind: "timed_out", session: { status: "submitted", submission_reason: "timeout" } });
  });
});

import { describe, expect, it } from "vitest";
import type { AttemptRow, ExamSessionRow, SrsStateRow } from "@/db/schema";
import { flash, syllabus } from "@/lib/queue/test-fixtures";
import { buildStatsView } from "./derive";

const attempt = (overrides: Partial<AttemptRow> = {}): AttemptRow => ({
  attemptId: crypto.randomUUID(),
  questionId: "f-d1-q001",
  questionRev: 1,
  exam: "ccar-f",
  mode: "drill",
  sessionId: null,
  appliedRating: 3,
  isCorrect: true,
  chosen: null,
  elapsedMs: 10_000,
  answeredAt: new Date("2026-08-28T15:30:00.000Z"), // 8/29 00:30 JST
  ...overrides,
});

const fullSession = (id: string, finishedAt: string, scoreRaw: number): ExamSessionRow => ({
  id,
  exam: "ccar-f",
  kind: "full",
  formId: "form-a",
  domainId: null,
  questionIds: Array.from({ length: 60 }, (_, i) => `f-d1-q${String(i + 1).padStart(3, "0")}`),
  status: "submitted",
  submissionReason: "manual",
  startedAt: new Date(new Date(finishedAt).getTime() - 7_200_000),
  deadlineAt: new Date(finishedAt),
  currentIndex: 59,
  finishedAt: new Date(finishedAt),
  scoreRaw,
});

describe("buildStatsView(specs/05 S-8)", () => {
  it("日別回答数は 00:00 JST で区切り、日付昇順に集計する", () => {
    const view = buildStatsView({
      questions: [flash("f-d1-q001")],
      syllabus,
      srsRows: [],
      attempts: [
        attempt(),
        attempt({ answeredAt: new Date("2026-08-29T14:59:59.000Z") }), // 8/29 23:59 JST
        attempt({ answeredAt: new Date("2026-08-29T15:00:00.000Z") }), // 8/30 00:00 JST
      ],
      sessions: [],
      now: new Date("2026-08-30T03:00:00.000Z"),
    });
    expect(view.dailyAnswers).toEqual([
      { date: "2026-08-29", count: 2 },
      { date: "2026-08-30", count: 1 },
    ]);
  });

  it("模試の未回答 attempt は日別回答数に含めない", () => {
    const view = buildStatsView({
      questions: [flash("f-d1-q001")],
      syllabus,
      srsRows: [],
      attempts: [
        attempt({ mode: "mock", chosen: null, isCorrect: false }),
        attempt({ mode: "mock", chosen: ["A"], isCorrect: false }),
        attempt({ mode: "drill", chosen: null }), // flash は chosen=null でも回答済み
      ],
      sessions: [],
      now: new Date("2026-08-29T00:00:00.000Z"),
    });
    expect(view.dailyAnswers).toEqual([{ date: "2026-08-29", count: 2 }]);
  });

  it("既存の習熟度式を使い、ドメインごとの百分率を返す", () => {
    const view = buildStatsView({
      questions: [flash("f-d1-q001")],
      syllabus,
      srsRows: [] as SrsStateRow[],
      attempts: [],
      sessions: [],
      now: new Date("2026-08-29T00:00:00.000Z"),
    });
    expect(view.domains.map((d) => d.domainId)).toEqual(["f-d1", "f-d2"]);
    expect(view.domains[0].proficiency).toBeCloseTo(0.21, 10);
  });

  it("フル模試を initial / rehearsal に分け、各受験にレポート ID を残す", () => {
    const initial = fullSession("00000000-0000-4000-8000-000000000001", "2026-08-20T03:00:00.000Z", 48);
    const rehearsal = fullSession("00000000-0000-4000-8000-000000000002", "2026-08-25T03:00:00.000Z", 54);
    const view = buildStatsView({
      questions: [flash("f-d1-q001")],
      syllabus,
      srsRows: [],
      attempts: [],
      sessions: [rehearsal, initial],
      now: new Date("2026-08-29T00:00:00.000Z"),
    });
    expect(view.mockTrends.initial).toEqual([
      expect.objectContaining({ sessionId: initial.id, scoreRaw: 48, total: 60, percent: 80 }),
    ]);
    expect(view.mockTrends.rehearsal).toEqual([
      expect.objectContaining({ sessionId: rehearsal.id, scoreRaw: 54, total: 60, percent: 90 }),
    ]);
  });

  it("ドメイン比重を各正答率に掛けた重み付き正答率を返す", () => {
    const q1 = flash("f-d1-q001");
    const q2 = flash("f-d2-q001");
    const session = {
      ...fullSession("00000000-0000-4000-8000-000000000001", "2026-08-20T03:00:00.000Z", 1),
      questionIds: [q1.id, q2.id],
    };
    const view = buildStatsView({
      questions: [q1, q2],
      syllabus,
      srsRows: [],
      attempts: [
        attempt({ questionId: q1.id, mode: "mock", sessionId: session.id, chosen: ["B"], isCorrect: true }),
        attempt({ questionId: q2.id, mode: "mock", sessionId: session.id, chosen: ["A"], isCorrect: false }),
      ],
      sessions: [session],
      now: new Date("2026-08-29T00:00:00.000Z"),
    });
    expect(view.mockTrends.initial[0]).toMatchObject({ percent: 50, weightedPercent: 60 });
  });

  it("abandoned / in_progress / domain_mini は full 模試推移に含めない", () => {
    const session = fullSession("00000000-0000-4000-8000-000000000001", "2026-08-20T03:00:00.000Z", 48);
    const view = buildStatsView({
      questions: [flash("f-d1-q001")],
      syllabus,
      srsRows: [],
      attempts: [],
      sessions: [
        { ...session, status: "abandoned" },
        { ...session, id: "00000000-0000-4000-8000-000000000002", status: "in_progress" },
        { ...session, id: "00000000-0000-4000-8000-000000000003", kind: "domain_mini" },
      ],
      now: new Date("2026-08-29T00:00:00.000Z"),
    });
    expect(view.mockTrends).toEqual({ initial: [], rehearsal: [] });
  });
});

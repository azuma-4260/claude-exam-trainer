import { describe, expect, it } from "vitest";
import type { Bank } from "@/lib/bank/load";
import type { Question } from "@/lib/bank/schema";
import { assembleQueueView, planSession, SESSION_MAX, SESSION_MIN, type DrillItem } from "./serve";
import { emptyCtx, flash, mcq, NOW, srsRow, syllabus } from "./test-fixtures";

// D1-5: キュー合成(セッション分割 / practice 分離 / D-1 ガード / 空バンク / 予算差引)

const bankOf = (questions: Question[]): Bank => ({
  questions,
  forms: [],
  byId: new Map(questions.map((q) => [q.id, q])),
});

const id3 = (n: number) => `f-d1-q${String(n).padStart(3, "0")}`;

const view = (questions: Question[], over: Partial<Parameters<typeof assembleQueueView>[0]> = {}) =>
  assembleQueueView({
    now: NOW,
    bank: bankOf(questions),
    syllabus,
    poolCtx: emptyCtx(),
    srsRows: [],
    correctQuestionIds: new Set(),
    consumption: { spentTodaySec: 0, introducedTodayCount: 0 },
    startedToday: false,
    ...over,
  });

const item = (n: number): DrillItem => ({
  questionId: id3(n),
  rev: 1,
  type: "flash",
  stemEn: "stem",
  choices: null,
  answer: null,
  answerEn: "answer",
  explanationJa: "解説",
  refs: ["https://docs.claude.com/en/docs/mcp"],
  source: "due",
  estSec: 20,
});

describe("planSession(FR-3: 1 セッション 5〜20 問・残骸なし分割)", () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => item(i + 1));

  it("0 件 → none", () => {
    expect(planSession([], false)).toEqual({ kind: "none" });
  });

  it("未開始で 1〜4 件 → below_session_min(持ち越し)", () => {
    expect(planSession(items(4), false)).toEqual({ kind: "below_session_min", count: 4 });
  });

  it("開始済み(startedToday)なら 5 問未満でも同一セッションの継続として提供する", () => {
    const plan = planSession(items(4), true);
    expect(plan.kind).toBe("ok");
    if (plan.kind === "ok") {
      expect(plan.items).toHaveLength(4);
      expect(plan.remainingAfterSession).toBe(0);
    }
  });

  it("5 件 → 全件(下限ちょうど)", () => {
    const plan = planSession(items(SESSION_MIN), false);
    if (plan.kind !== "ok") throw new Error(plan.kind);
    expect(plan.items).toHaveLength(5);
  });

  it("20 件 → 全件(上限ちょうど)", () => {
    const plan = planSession(items(SESSION_MAX), false);
    if (plan.kind !== "ok") throw new Error(plan.kind);
    expect(plan.items).toHaveLength(20);
    expect(plan.remainingAfterSession).toBe(0);
  });

  it("21〜24 件 → total-5 に縮めて残 5 を保証(次セッション導線が壊れない)", () => {
    for (const total of [21, 22, 23, 24]) {
      const plan = planSession(items(total), false);
      if (plan.kind !== "ok") throw new Error(plan.kind);
      expect(plan.items).toHaveLength(total - 5);
      expect(plan.remainingAfterSession).toBe(5);
    }
  });

  it("25 件以上 → 20 件(残りは必ず 5 以上)", () => {
    const plan = planSession(items(25), false);
    if (plan.kind !== "ok") throw new Error(plan.kind);
    expect(plan.items).toHaveLength(20);
    expect(plan.remainingAfterSession).toBe(5);
    const plan40 = planSession(items(40), false);
    if (plan40.kind !== "ok") throw new Error(plan40.kind);
    expect(plan40.items).toHaveLength(20);
    expect(plan40.remainingAfterSession).toBe(20);
  });

  it("どの総数でも 1〜4 件の残骸を作らない(全網羅)", () => {
    for (let total = SESSION_MIN; total <= 60; total++) {
      const plan = planSession(items(total), false);
      if (plan.kind !== "ok") throw new Error(plan.kind);
      expect(plan.items.length).toBeGreaterThanOrEqual(SESSION_MIN);
      expect(plan.items.length).toBeLessThanOrEqual(SESSION_MAX);
      const rest = plan.remainingAfterSession;
      expect(rest === 0 || rest >= SESSION_MIN).toBe(true);
    }
  });
});

describe("assembleQueueView", () => {
  it("空バンク → bankEmpty、session none、pace 0", () => {
    const v = view([]);
    expect(v.kind).toBe("ok");
    expect(v.bankEmpty).toBe(true);
    expect(v.drillTotal).toBe(0);
    expect(v.session).toEqual({ kind: "none" });
    expect(v.pace?.newPerDay).toBe(0);
  });

  it("due の flash が DrillItem に射影される(answer / 解説込み)", () => {
    const qs = Array.from({ length: 6 }, (_, i) => flash(id3(i + 1)));
    const v = view(qs, { srsRows: qs.map((q) => srsRow(q.id)) });
    expect(v.drillTotal).toBe(6);
    if (v.session.kind !== "ok") throw new Error(v.session.kind);
    expect(v.session.items[0]).toMatchObject({
      questionId: id3(1),
      type: "flash",
      answerEn: "Streamable HTTP",
      explanationJa: expect.any(String),
      source: "due",
      estSec: 20,
    });
  });

  it("practice-mode item(シナリオ MCQ)は S-3 に出さず件数のみ分離する", () => {
    // scenario_id 付き MCQ は drill の eligible_modes に無ければ practice 判定になる
    const scenarioMcq = mcq("f-d1-q010", {
      scenario_id: "sc-1",
      eligible_modes: ["practice"],
    });
    const flashes = Array.from({ length: 5 }, (_, i) => flash(id3(i + 1)));
    const qs = [...flashes, scenarioMcq];
    const v = view(qs, { srsRows: qs.map((q) => srsRow(q.id)) });
    expect(v.deferredPracticeCount).toBe(1);
    expect(v.drillTotal).toBe(5);
    if (v.session.kind !== "ok") throw new Error(v.session.kind);
    expect(v.session.items.every((i) => i.questionId !== "f-d1-q010")).toBe(true);
    // D2-1: practice 分の実体(キュー順)と当日キュー全 id を Practice 画面向けに公開する
    expect(v.practiceItems).toEqual([{ questionId: "f-d1-q010", source: "due", estSec: 120, mode: "practice" }]);
    expect(v.queueQuestionIds).toHaveLength(6);
    expect(v.queueQuestionIds).toContain("f-d1-q010");
  });

  it("spentTodaySec が予算から差し引かれ、キューが縮む", () => {
    const qs = Array.from({ length: 30 }, (_, i) => flash(id3(i + 1)));
    const full = view(qs, { srsRows: qs.map((q) => srsRow(q.id)) });
    const spent = view(qs, {
      srsRows: qs.map((q) => srsRow(q.id)),
      consumption: { spentTodaySec: 2700 - 40, introducedTodayCount: 0 }, // 残 40 秒 = flash 2 問
    });
    expect(full.drillTotal).toBe(30);
    expect(spent.drillTotal).toBe(2);
    expect(spent.dueBacklogCount).toBe(28);
    expect(spent.session).toEqual({ kind: "below_session_min", count: 2 });
  });

  it("startedToday なら予算消化後の残 1〜4 問も継続セッションとして提供する", () => {
    const qs = Array.from({ length: 30 }, (_, i) => flash(id3(i + 1)));
    const v = view(qs, {
      srsRows: qs.map((q) => srsRow(q.id)),
      consumption: { spentTodaySec: 2700 - 40, introducedTodayCount: 0 },
      startedToday: true,
    });
    expect(v.session.kind).toBe("ok");
  });

  it("D-1(試験前日)はセレクタ未実装のため d_minus_1_unavailable(throw しない)", () => {
    const qs = [flash("f-d1-q001")];
    const v = view(qs, { now: new Date("2026-09-26T12:00:00+09:00"), srsRows: [srsRow("f-d1-q001")] });
    expect(v.kind).toBe("d_minus_1_unavailable");
    expect(v.session).toEqual({ kind: "none" });
    expect(v.pace).toBeNull();
  });

  it("daysLeft と budgetSec を Home 表示用に返す", () => {
    const v = view([]);
    expect(v.daysLeft).toBe(34); // NOW = 8/24, 試験 9/27
    expect(v.budgetSec).toBe(2700);
  });
});

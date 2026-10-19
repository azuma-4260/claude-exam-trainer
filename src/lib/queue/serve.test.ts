import { describe, expect, it } from "vitest";
import type { Bank } from "@/lib/bank/load";
import type { Question } from "@/lib/bank/schema";
import { assembleQueueView, planSession, SESSION_MAX, SESSION_MIN, type DrillItem } from "./serve";
import { emptyCtx, flash, mcq, NOW, pmcq, pSyllabus, srsRow, syllabus } from "./test-fixtures";

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
    scope: "ccar-f",
    bank: bankOf(questions),
    syllabi: [syllabus],
    poolCtx: emptyCtx(),
    srsRows: [],
    correctQuestionIds: new Set(),
    consumption: { spentTodaySec: 0, introducedTodayCount: 0, introducedTodayByExam: {} },
    ...over,
  });

const item = (n: number): DrillItem => ({
  questionId: id3(n),
  rev: 1,
  type: "flash",
  stemEn: "stem",
  choices: null,
  bindingConstraintJa: null,
  lifecyclePhase: null,
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
    expect(planSession([])).toEqual({ kind: "none" });
  });

  it("1〜4 件 → 供給不足時の例外(FR-3、D6-7)で全件を 1 セッションにする(持ち越さない)", () => {
    for (const total of [1, 2, 3, 4]) {
      const plan = planSession(items(total));
      if (plan.kind !== "ok") throw new Error(plan.kind);
      expect(plan.items).toHaveLength(total);
      expect(plan.remainingAfterSession).toBe(0);
    }
  });

  it("5 件 → 全件(下限ちょうど)", () => {
    const plan = planSession(items(SESSION_MIN));
    if (plan.kind !== "ok") throw new Error(plan.kind);
    expect(plan.items).toHaveLength(5);
  });

  it("20 件 → 全件(上限ちょうど)", () => {
    const plan = planSession(items(SESSION_MAX));
    if (plan.kind !== "ok") throw new Error(plan.kind);
    expect(plan.items).toHaveLength(20);
    expect(plan.remainingAfterSession).toBe(0);
  });

  it("21〜24 件 → total-5 に縮めて残 5 を保証(次セッション導線が壊れない)", () => {
    for (const total of [21, 22, 23, 24]) {
      const plan = planSession(items(total));
      if (plan.kind !== "ok") throw new Error(plan.kind);
      expect(plan.items).toHaveLength(total - 5);
      expect(plan.remainingAfterSession).toBe(5);
    }
  });

  it("25 件以上 → 20 件(残りは必ず 5 以上)", () => {
    const plan = planSession(items(25));
    if (plan.kind !== "ok") throw new Error(plan.kind);
    expect(plan.items).toHaveLength(20);
    expect(plan.remainingAfterSession).toBe(5);
    const plan40 = planSession(items(40));
    if (plan40.kind !== "ok") throw new Error(plan40.kind);
    expect(plan40.items).toHaveLength(20);
    expect(plan40.remainingAfterSession).toBe(20);
  });

  it("どの総数でも 1〜4 件の残骸を作らない(全網羅)", () => {
    for (let total = SESSION_MIN; total <= 60; total++) {
      const plan = planSession(items(total));
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

  it("D6-9: 構造化解説フィールドを DrillItem に明示的に射影し、無い問題は null にする", () => {
    const withFields = mcq(id3(1), {
      eligible_modes: ["drill"],
      binding_constraint_ja: "リモートから接続する",
      lifecycle_phase: "design",
      choices: [
        { label: "A", text_en: "stdio", plausible_ja: "ローカル連携なら妥当", not_best_ja: "リモート不可" },
        { label: "B", text_en: "Streamable HTTP" },
      ],
    });
    const plain = Array.from({ length: 5 }, (_, i) => mcq(id3(i + 2), { eligible_modes: ["drill"] }));
    const qs = [withFields, ...plain];
    const v = view(qs, { srsRows: qs.map((q) => srsRow(q.id)) });
    if (v.session.kind !== "ok") throw new Error(v.session.kind);
    const byId = new Map(v.session.items.map((x) => [x.questionId, x]));
    expect(byId.get(id3(1))).toMatchObject({
      bindingConstraintJa: "リモートから接続する",
      lifecyclePhase: "design",
      choices: [
        { label: "A", textEn: "stdio", plausibleJa: "ローカル連携なら妥当", notBestJa: "リモート不可" },
        { label: "B", textEn: "Streamable HTTP", plausibleJa: null, notBestJa: null },
      ],
    });
    expect(byId.get(id3(2))).toMatchObject({ bindingConstraintJa: null, lifecyclePhase: null });
    expect(byId.get(id3(2))?.choices?.every((c) => c.plausibleJa === null && c.notBestJa === null)).toBe(true);
  });

  it("D6-9: flash の DrillItem は構造化解説フィールドが null", () => {
    const qs = Array.from({ length: 5 }, (_, i) => flash(id3(i + 1)));
    const v = view(qs, { srsRows: qs.map((q) => srsRow(q.id)) });
    if (v.session.kind !== "ok") throw new Error(v.session.kind);
    expect(v.session.items[0]).toMatchObject({ bindingConstraintJa: null, lifecyclePhase: null, choices: null });
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
      consumption: { spentTodaySec: 2700 - 40, introducedTodayCount: 0, introducedTodayByExam: {} }, // 残 40 秒 = flash 2 問
    });
    expect(full.drillTotal).toBe(30);
    expect(spent.drillTotal).toBe(2);
    expect(spent.dueBacklogCount).toBe(28);
    // 予算消化後の残 2 問も持ち越さずに提供する(FR-3 供給不足時の例外、D6-7)
    if (spent.session.kind !== "ok") throw new Error(spent.session.kind);
    expect(spent.session.items).toHaveLength(2);
    expect(spent.session.remainingAfterSession).toBe(0);
  });

  it("キュー全体が 4 問しか無い日(P 導入直後の新規枠 4 枚など)でも Drill セッションを開始できる", () => {
    // キュー全体が 4 問 = 下限 5 未満。以前は持ち越しで開始不可だった(B-D1-5-3)
    const qs = Array.from({ length: 4 }, (_, i) => flash(id3(i + 1)));
    const v = view(qs, { srsRows: qs.map((q) => srsRow(q.id)) });
    expect(v.drillTotal).toBe(4);
    if (v.session.kind !== "ok") throw new Error(v.session.kind);
    expect(v.session.items.map((i) => i.questionId)).toEqual(qs.map((q) => q.id));
  });

  it("D-1 入力なしで D-1 日に組み立てると fail closed(通常キューに fallback しない)", () => {
    const qs = [flash("f-d1-q001")];
    expect(() => view(qs, { now: new Date("2026-09-26T12:00:00+09:00"), srsRows: [srsRow("f-d1-q001")] })).toThrow(/D-1/);
  });

  it("スコープ内 exam のカウントダウンと budgetSec を Home 表示用に返す", () => {
    const v = view([]);
    expect(v.countdowns).toEqual([{ exam: "ccar-f", examDateJst: "2026-09-27", daysLeft: 34 }]); // NOW = 8/24, 試験 9/27
    expect(v.budgetSec).toBe(2700);
  });
});

// ---- D5-1: D-1(P 試験前日 2026-12-11)の画面向けキュー ----
describe("assembleQueueView: D-1(D5-1)", () => {
  const D1_NOW = new Date("2026-12-11T12:00:00+09:00");
  const wrong = (questionId: string) => ({
    attemptId: `${questionId}-w`,
    questionId,
    mode: "practice",
    isCorrect: false,
    answeredAt: new Date("2026-12-01T09:00:00+09:00"),
  });
  const pRow = (id: string, stability: number) => srsRow(id, { exam: "ccar-p", stability });
  const pview = (questions: Question[], over: Partial<Parameters<typeof assembleQueueView>[0]> = {}) =>
    assembleQueueView({
      now: D1_NOW,
      scope: "ccar-p",
      bank: bankOf(questions),
      syllabi: [pSyllabus],
      poolCtx: emptyCtx(),
      srsRows: [],
      correctQuestionIds: new Set(),
      consumption: { spentTodaySec: 0, introducedTodayCount: 0, introducedTodayByExam: {} },
      dMinus1Signals: { mistakeAttempts: [], answeredTodayIds: new Set() },
      ...over,
    });

  // Practice 専用の間違いノート問題(q001)が先、Drill 対象の低 stability カード(q002, q003)が後
  const qs = [
    pmcq("p-d1-q001", { eligible_modes: ["practice"], scenario_id: "sc-1" }),
    pmcq("p-d1-q002"),
    pmcq("p-d1-q003"),
  ];
  const rows = [pRow("p-d1-q003", 9), pRow("p-d1-q002", 2)];
  const mistakes = [wrong("p-d1-q001")];

  it("Practice 専用の間違いノートが先頭なら、Drill セッションは空で nextMode=practice(順序を保つ)", () => {
    const v = pview(qs, { srsRows: rows, dMinus1Signals: { mistakeAttempts: mistakes, answeredTodayIds: new Set() } });
    expect(v.kind).toBe("ok");
    expect(v.dMinus1).toEqual({ nextMode: "practice", queued: 3 });
    expect(v.session).toEqual({ kind: "none" });
    expect(v.practiceItems.map((i) => i.questionId)).toEqual(["p-d1-q001"]);
    // 後続の drill 項目も Practice 第 2 層に二重提供しないよう、キュー全体の id は公開する
    expect(v.queueQuestionIds).toEqual(["p-d1-q001", "p-d1-q002", "p-d1-q003"]);
    expect(v.pace).not.toBeNull();
  });

  it("practice run を回答済みにして再構築すると nextMode=drill、低 stability 順の drill run が出る", () => {
    const v = pview(qs, {
      srsRows: rows,
      dMinus1Signals: { mistakeAttempts: mistakes, answeredTodayIds: new Set(["p-d1-q001"]) },
    });
    expect(v.dMinus1?.nextMode).toBe("drill");
    expect(v.practiceItems).toEqual([]);
    if (v.session.kind !== "ok") throw new Error(v.session.kind);
    expect(v.session.items.map((i) => i.questionId)).toEqual(["p-d1-q002", "p-d1-q003"]);
  });

  it("前々日(12-10)は通常順(dMinus1 なし・due ベース)。スコープ both では P 前日でも通常順", () => {
    const common = { srsRows: rows, dMinus1Signals: undefined };
    const dayBefore2 = pview(qs, { ...common, now: new Date("2026-12-10T12:00:00+09:00") });
    expect(dayBefore2.dMinus1).toBeNull();
    expect(dayBefore2.preExam?.phase).toBe("freeze");
    const both = pview(qs, { ...common, scope: "both", syllabi: [syllabus, pSyllabus] });
    expect(both.dMinus1).toBeNull();
    expect(both.preExam).toBeNull();
  });

  it("F の前日(9/26)に P スコープは反応せず、F スコープなら D-1", () => {
    const f926 = new Date("2026-09-26T12:00:00+09:00");
    expect(pview(qs, { now: f926, dMinus1Signals: undefined }).dMinus1).toBeNull();
    const fq = [mcq("f-d1-q001")];
    const fv = view(fq, {
      now: f926,
      srsRows: [srsRow("f-d1-q001")],
      dMinus1Signals: { mistakeAttempts: [], answeredTodayIds: new Set() },
    });
    expect(fv.dMinus1?.nextMode).toBe("drill");
  });
});

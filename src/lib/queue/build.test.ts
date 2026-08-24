import { describe, expect, it, vi } from "vitest";
import type { OpenFlag } from "@/lib/bank/pool";
import { NOW, emptyCtx, flash, holdoutForm, mcq, srsRow, syllabus } from "./test-fixtures";
import { DAILY_QUEUE_BUDGET_SEC, EST_SEC_FLASH, EST_SEC_SCENARIO_MCQ, EST_SEC_SHORT_MCQ, NEW_RESERVED_SEC, estSec } from "./estimate";
import { buildDailyQueue, queueModeFor, type QueueInputs } from "./build";

// T-queue: 日次キュー生成(specs/04 §日次キュー(45 分時間予算方式)、§直前期と D-1)

const inputs = (over: Partial<QueueInputs>): QueueInputs => ({
  now: NOW,
  questions: [],
  syllabus,
  poolCtx: emptyCtx(),
  srsRows: [],
  correctQuestionIds: new Set(),
  ...over,
});

const pad = (n: number): string => String(n).padStart(3, "0");

describe("EST_SEC(問題種別の固定コスト)", () => {
  it("flash=20 / 短問 MCQ=60 / シナリオ MCQ=120、予算 2700 / 新規予約 600", () => {
    expect(estSec(flash("f-d1-q001"))).toBe(EST_SEC_FLASH);
    expect(estSec(mcq("f-d1-q002"))).toBe(EST_SEC_SHORT_MCQ);
    expect(estSec(mcq("f-d1-q003", { scenario_id: "sc-1" }))).toBe(EST_SEC_SCENARIO_MCQ);
    expect(EST_SEC_FLASH).toBe(20);
    expect(EST_SEC_SHORT_MCQ).toBe(60);
    expect(EST_SEC_SCENARIO_MCQ).toBe(120);
    expect(DAILY_QUEUE_BUDGET_SEC).toBe(2700);
    expect(NEW_RESERVED_SEC).toBe(600);
  });
});

describe("buildDailyQueue: 通常日", () => {
  it("due は古い順、new は priority 降順で new_per_day 件以内", () => {
    const questions = [
      flash("f-d1-q201"),
      flash("f-d1-q202"),
      flash("f-d1-q203"),
      flash("f-d1-q001"), // 新規候補(d1 は due カード 3 枚で retention が上がり priority が下がる)
      mcq("f-d2-q001"), // 新規候補(d2 は未学習 0.21 → priority 40×0.79 = 31.6 で d1 より高い)
    ];
    const srsRows = [
      srsRow("f-d1-q201", { dueAt: new Date("2026-08-22T09:00:00+09:00") }),
      srsRow("f-d1-q202", { dueAt: new Date("2026-08-21T09:00:00+09:00") }),
      srsRow("f-d1-q203", { dueAt: new Date("2026-08-23T09:00:00+09:00") }),
    ];
    const q = buildDailyQueue(inputs({ questions, srsRows }));
    expect(q.mode).toBe("normal");
    // remaining_new = 2 → required = ceil(2/27) = 1 → new_per_day = 1(priority が高い d2 側だけ)
    expect(q.pace).toEqual({ remainingNew: 2, requiredNew: 1, newPerDay: 1, paceWarning: false });
    expect(q.items.map((i) => [i.questionId, i.source])).toEqual([
      ["f-d1-q202", "due"],
      ["f-d1-q201", "due"],
      ["f-d1-q203", "due"],
      ["f-d2-q001", "new"],
    ]);
    expect(q.totalEstSec).toBe(3 * EST_SEC_FLASH + EST_SEC_SHORT_MCQ);
    expect(q.items.every((i) => i.mode === "drill")).toBe(true); // flash と drill 対応 MCQ は drill で回答
    expect(q.dueBacklogCount).toBe(0);
  });

  it("due は 予算 - reserved まで、超過分は件数のみバックログ", () => {
    // due 140 枚(2800s > 2700)、新規候補 40 枚 → new_per_day = ceil(40/27) = 2、reserved = 40s
    const dueQs = Array.from({ length: 140 }, (_, i) => flash(`f-d1-q${pad(200 + i)}`));
    const newQs = Array.from({ length: 40 }, (_, i) => flash(`f-d1-q${pad(1 + i)}`));
    const srsRows = dueQs.map((q, i) =>
      srsRow(q.id, { dueAt: new Date(Date.parse("2026-08-01T09:00:00+09:00") + i * 60_000) }),
    );
    const q = buildDailyQueue(inputs({ questions: [...dueQs, ...newQs], srsRows }));
    expect(q.pace).toEqual({ remainingNew: 40, requiredNew: 2, newPerDay: 2, paceWarning: false });
    const due = q.items.filter((i) => i.source === "due");
    const news = q.items.filter((i) => i.source === "new");
    // reserved = min(600, 20+20) = 40 → due は (2700-40)/20 = 133 枚
    expect(due).toHaveLength(133);
    expect(news.map((i) => i.questionId)).toEqual(["f-d1-q001", "f-d1-q002"]);
    expect(q.totalEstSec).toBe(DAILY_QUEUE_BUDGET_SEC);
    expect(q.dueBacklogCount).toBe(7);
  });

  it("新規が予約枠を使い切らなければ、余り予算に due バックログを追加する(手順 3)", () => {
    // due 110 枚 flash。新規候補 26 枚(25 flash + シナリオ MCQ 1)= 620s → reserved = 600
    // 手順 1: due 105 枚(2100s)/ 手順 2: flash 25 枚(500s)→ シナリオ MCQ は予算超過で停止
    // 手順 3: 余り 100s に due 5 枚を追加 → 合計 2700s、バックログ 0
    const dueQs = Array.from({ length: 110 }, (_, i) => flash(`f-d1-q${pad(200 + i)}`));
    const newFlash = Array.from({ length: 25 }, (_, i) => flash(`f-d1-q${pad(1 + i)}`));
    const newScenario = mcq("f-d1-q026", { scenario_id: "sc-1" });
    // remaining_new を 702 にして new_per_day = ceil(702/27) = 26 を確保する(候補は id 昇順で先頭 26 件)
    const filler = Array.from({ length: 676 }, (_, i) => flash(`f-d1-q${1000 + i}`)); // due(q2xx)と重複しない番台
    const srsRows = dueQs.map((q, i) =>
      srsRow(q.id, { dueAt: new Date(Date.parse("2026-08-01T09:00:00+09:00") + i * 60_000) }),
    );
    const q = buildDailyQueue(inputs({ questions: [...dueQs, ...newFlash, newScenario, ...filler], srsRows }));
    expect(q.pace).toEqual({ remainingNew: 702, requiredNew: 26, newPerDay: 26, paceWarning: false });
    const due = q.items.filter((i) => i.source === "due");
    const news = q.items.filter((i) => i.source === "new");
    expect(due).toHaveLength(110);
    expect(news).toHaveLength(25);
    expect(news.every((i) => i.estSec === EST_SEC_FLASH)).toBe(true);
    expect(q.items.some((i) => i.questionId === "f-d1-q026")).toBe(false);
    expect(q.totalEstSec).toBe(DAILY_QUEUE_BUDGET_SEC);
    expect(q.dueBacklogCount).toBe(0);
    // 並び: due 105 → new 25 → due 5(古い順は維持)
    expect(q.items.slice(0, 105).every((i) => i.source === "due")).toBe(true);
    expect(q.items.slice(105, 130).every((i) => i.source === "new")).toBe(true);
    expect(q.items.slice(130).every((i) => i.source === "due")).toBe(true);
  });

  it("holdout: 未提出フォーム収載問題は due / new / remaining_new すべてから除外(holdout ゲート)", () => {
    const formQs = Array.from({ length: 60 }, (_, i) => mcq(`f-d1-q${pad(100 + i)}`, { scenario_id: "sc-1" }));
    const form = holdoutForm("form-a", formQs.map((q) => q.id));
    const questions = [...formQs, flash("f-d1-q001"), flash("f-d1-q002")];
    const srsRows = [srsRow("f-d1-q100"), srsRow("f-d1-q001")];
    const q = buildDailyQueue(inputs({ questions, srsRows, poolCtx: emptyCtx([form]) }));
    expect(q.pace.remainingNew).toBe(1); // q002 のみ(フォーム 60 問は holdout 該当)
    expect(q.items.map((i) => [i.questionId, i.source])).toEqual([
      ["f-d1-q001", "due"],
      ["f-d1-q002", "new"],
    ]);
  });

  it("現行 rev の open flag は due からも new 候補からも消える(D1-6 連携)", () => {
    const flagged: OpenFlag = { questionId: "f-d1-q001", questionRev: 1, resolvedAt: null };
    const resolved: OpenFlag = { questionId: "f-d1-q002", questionRev: 1, resolvedAt: new Date("2026-08-23T00:00:00+09:00") };
    const questions = [flash("f-d1-q001"), flash("f-d1-q002"), flash("f-d1-q003")];
    const srsRows = [srsRow("f-d1-q001"), srsRow("f-d1-q002")];
    const q = buildDailyQueue(
      inputs({ questions, srsRows, poolCtx: { forms: [], sessions: [], flags: [flagged, resolved] } }),
    );
    // q001 は open flag で除外(バックログにも数えない)、q002 は resolved 済みなので出る
    expect(q.items.map((i) => [i.questionId, i.source])).toEqual([
      ["f-d1-q002", "due"],
      ["f-d1-q003", "new"],
    ]);
    expect(q.dueBacklogCount).toBe(0);
    // remaining_new = 行なしの q003 のみ(q001/q002 は srs_state 行ありなので対象外)
    expect(q.pace.remainingNew).toBe(1);
  });

  it("practice 専用の SRS 対象問題(07 Step 3a のシナリオ MCQ)もキューに入り、mode=practice で回答する", () => {
    // due: practice 専用シナリオ MCQ(FSRS は practice 回答で更新されるので due がキューに出る)
    const duePractice = mcq("f-d1-q001", { eligible_modes: ["practice"], scenario_id: "sc-1" });
    // new 候補: practice 専用短問 MCQ と flash(同一 topic → 同 priority → id 昇順)
    const newPractice = mcq("f-d1-q002", { eligible_modes: ["practice"] });
    const newFlash = flash("f-d1-q003");
    const q = buildDailyQueue(
      inputs({ questions: [duePractice, newPractice, newFlash], srsRows: [srsRow("f-d1-q001")] }),
    );
    expect(q.pace).toEqual({ remainingNew: 2, requiredNew: 1, newPerDay: 1, paceWarning: false });
    expect(q.items.map((i) => [i.questionId, i.source, i.mode, i.estSec])).toEqual([
      ["f-d1-q001", "due", "practice", EST_SEC_SCENARIO_MCQ],
      ["f-d1-q002", "new", "practice", EST_SEC_SHORT_MCQ],
    ]);
  });

  it("srs_eligible=false(解放済みフォーム問題を含む)はキューに入らない", () => {
    const notSrs = mcq("f-d1-q002", { srs_eligible: false });
    const ok = flash("f-d1-q003");
    // 提出済みフォームの収載問題(標準値: eligible_modes=[mock, practice] / srs_eligible=false)は
    // Practice に解放されても SRS キュー対象にならない(specs/03)
    const formQs = Array.from({ length: 60 }, (_, i) =>
      mcq(`f-d1-q${pad(100 + i)}`, { eligible_modes: ["mock", "practice"], srs_eligible: false, scenario_id: "sc-1" }),
    );
    const form = holdoutForm("form-a", formQs.map((q) => q.id));
    const q = buildDailyQueue(
      inputs({
        questions: [notSrs, ok, ...formQs],
        poolCtx: {
          forms: [form],
          sessions: [{ exam: "ccar-f", formId: "form-a", kind: "full", status: "submitted" }],
          flags: [],
        },
      }),
    );
    expect(q.pace.remainingNew).toBe(1); // srs_eligible=false は remaining_new の式からも外れる
    expect(q.items.map((i) => [i.questionId, i.source, i.mode])).toEqual([["f-d1-q003", "new", "drill"]]);
  });
});

describe("buildDailyQueue: 同日内の再構築(予算・導入目標は 1 日の量)", () => {
  it("spentTodaySec を差し引いた残予算でキューを組む", () => {
    const dueQs = Array.from({ length: 20 }, (_, i) => flash(`f-d1-q${pad(200 + i)}`));
    const newQ = flash("f-d1-q001");
    const srsRows = dueQs.map((q, i) =>
      srsRow(q.id, { dueAt: new Date(Date.parse("2026-08-01T09:00:00+09:00") + i * 60_000) }),
    );
    const q = buildDailyQueue(inputs({ questions: [...dueQs, newQ], srsRows, spentTodaySec: 2400 }));
    // 残予算 300s、reserved 20s → due 14 枚(280s)+ new 1 枚 = 300s
    expect(q.items.filter((i) => i.source === "due")).toHaveLength(14);
    expect(q.items.filter((i) => i.source === "new")).toHaveLength(1);
    expect(q.totalEstSec).toBe(300);
    expect(q.dueBacklogCount).toBe(6);
  });

  it("introducedTodayCount 分は新規導入しない(new_per_day は 1 日の導入目標)", () => {
    const newQs = Array.from({ length: 40 }, (_, i) => flash(`f-d1-q${pad(1 + i)}`));
    const q = buildDailyQueue(inputs({ questions: newQs, introducedTodayCount: 2 }));
    // 日次目標は当日開始時点の remaining(40 + 2 = 42)から: ceil(42/27) = 2。今日すでに 2 枚導入済みなら追加しない
    expect(q.pace).toEqual({ remainingNew: 42, requiredNew: 2, newPerDay: 2, paceWarning: false });
    expect(q.items).toEqual([]);
  });

  it("日次目標は当日開始時点の remaining から算出する(再構築で二重減算しない)", () => {
    // 当日開始時 remaining 5・days_left 8 → 目標 5。2 枚導入後に再構築しても残り 3 枚全部が候補に出る
    const now = new Date("2026-09-19T12:00:00+09:00"); // days_left = 8
    const qs = Array.from({ length: 5 }, (_, i) => flash(`f-d1-q${pad(1 + i)}`));
    const introduced = [
      srsRow("f-d1-q001", { dueAt: new Date("2026-09-20T12:00:00+09:00") }), // 今日導入 → due は未来
      srsRow("f-d1-q002", { dueAt: new Date("2026-09-20T12:00:00+09:00") }),
    ];
    const q = buildDailyQueue(inputs({ now, questions: qs, srsRows: introduced, introducedTodayCount: 2 }));
    expect(q.pace).toEqual({ remainingNew: 5, requiredNew: 5, newPerDay: 5, paceWarning: false });
    expect(q.items.map((i) => [i.questionId, i.source])).toEqual([
      ["f-d1-q003", "new"],
      ["f-d1-q004", "new"],
      ["f-d1-q005", "new"],
    ]);
  });

  it("D-1 でも残予算がセレクタに渡り、提示もその範囲に切り詰める", () => {
    const now = new Date("2026-09-26T08:00:00+09:00");
    const selector = vi.fn(() =>
      Array.from({ length: 30 }, (_, i) => ({ questionId: `f-d1-q${pad(i + 1)}`, estSec: 120, mode: "practice" as const })),
    );
    const q = buildDailyQueue(inputs({ now, spentTodaySec: 600, selectDMinus1: selector }));
    expect(selector).toHaveBeenCalledExactlyOnceWith({ budgetSec: 2100, now });
    // 120s × 30 → 残予算 2100s では 17 件(2040s)
    expect(q.items).toHaveLength(17);
    expect(q.totalEstSec).toBe(2040);
  });
});

describe("buildDailyQueue: 直前期と D-1(specs/04)", () => {
  it("9/20(days_left=7)以降は新規導入が逆算式により自動 0", () => {
    const now = new Date("2026-09-20T08:00:00+09:00");
    const questions = [flash("f-d1-q001"), flash("f-d1-q002")];
    const srsRows = [srsRow("f-d1-q001")];
    const q = buildDailyQueue(inputs({ now, questions, srsRows }));
    expect(q.mode).toBe("normal");
    expect(q.pace.newPerDay).toBe(0);
    expect(q.items.map((i) => [i.questionId, i.source])).toEqual([["f-d1-q001", "due"]]);
  });

  it("queueModeFor: 9/26(JST)だけ d_minus_1", () => {
    expect(queueModeFor(new Date("2026-09-25T23:59:59+09:00"))).toBe("normal");
    expect(queueModeFor(new Date("2026-09-26T00:00:00+09:00"))).toBe("d_minus_1");
    expect(queueModeFor(new Date("2026-09-26T23:59:59+09:00"))).toBe("d_minus_1");
    expect(queueModeFor(new Date("2026-09-27T00:00:00+09:00"))).toBe("normal");
  });

  it("D-1 は due ベース選定を停止し、セレクタの結果を時間予算内だけ提示する", () => {
    const now = new Date("2026-09-26T08:00:00+09:00");
    const selector = vi.fn(() =>
      Array.from({ length: 30 }, (_, i) => ({ questionId: `f-d1-q${pad(i + 1)}`, estSec: 120, mode: "practice" as const })),
    );
    const questions = [flash("f-d1-q900")];
    const srsRows = [srsRow("f-d1-q900")]; // due だが D-1 では使わない
    const q = buildDailyQueue(inputs({ now, questions, srsRows, selectDMinus1: selector }));
    expect(selector).toHaveBeenCalledExactlyOnceWith({ budgetSec: DAILY_QUEUE_BUDGET_SEC, now });
    expect(q.mode).toBe("d_minus_1");
    // 120s × 30 = 3600s → 22 件(2640s)で予算停止
    expect(q.items).toHaveLength(22);
    expect(q.items.every((i) => i.source === "d1" && i.mode === "practice")).toBe(true);
    expect(q.totalEstSec).toBe(2640);
    expect(q.items.some((i) => i.questionId === "f-d1-q900")).toBe(false);
    expect(q.pace.newPerDay).toBe(0);
  });

  it("9/25 は通常キュー(セレクタは呼ばれない)", () => {
    const now = new Date("2026-09-25T08:00:00+09:00");
    const selector = vi.fn(() => []);
    const q = buildDailyQueue(inputs({ now, questions: [flash("f-d1-q001")], srsRows: [srsRow("f-d1-q001")], selectDMinus1: selector }));
    expect(selector).not.toHaveBeenCalled();
    expect(q.mode).toBe("normal");
    expect(q.items.map((i) => i.source)).toEqual(["due"]);
  });

  it("D-1 でセレクタ未提供なら fail closed(通常キューに fallback しない)", () => {
    const now = new Date("2026-09-26T08:00:00+09:00");
    expect(() => buildDailyQueue(inputs({ now }))).toThrow(/D-1/);
  });
});

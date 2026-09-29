import { describe, expect, it } from "vitest";
import type { Bank } from "@/lib/bank/load";
import type { Question } from "@/lib/bank/schema";
import { buildDailyQueue, queueModeFor, type QueueInputs } from "./build";
import { deriveConsumption } from "./consumption";
import { EST_SEC_FLASH } from "./estimate";
import { assembleQueueView } from "./serve";
import {
  NOW_P,
  emptyCtx,
  flash,
  holdoutForm,
  pHoldoutForm,
  pSyllabus,
  pflash,
  srsRow,
  syllabus,
} from "./test-fixtures";

// T-exam: 学習スコープのキュー合成(specs/04 §新規カード導入ペース・§日次キュー・§直前期と D-1 v1.3、
// 03 §出題プールの判定順序 0 / 1)

const pad = (n: number): string => String(n).padStart(3, "0");
const fIds = (from: number, n: number, d = 1) => Array.from({ length: n }, (_, i) => `f-d${d}-q${pad(from + i)}`);
const pIds = (from: number, n: number, d = 1) => Array.from({ length: n }, (_, i) => `p-d${d}-q${pad(from + i)}`);

const inputs = (over: Partial<QueueInputs>): QueueInputs => ({
  now: NOW_P,
  scope: "both",
  questions: [],
  syllabi: [syllabus, pSyllabus],
  poolCtx: emptyCtx(),
  srsRows: [],
  correctQuestionIds: new Set(),
  ...over,
});

const at = (iso: string) => new Date(`${iso}+09:00`);

describe("段 0: スコープ内 exam の問題だけがキュー候補になる", () => {
  const fDue = flash("f-d1-q001");
  const pDue = pflash("p-d1-q001");
  const srsRows = [srsRow(fDue.id), srsRow(pDue.id, { exam: "ccar-p" })];

  it("ccar-f では P の due も新規も出ない / ccar-p では F の due が出ない", () => {
    const pNew = pflash("p-d1-q002");
    const f = buildDailyQueue(inputs({ scope: "ccar-f", questions: [fDue, pDue, pNew], srsRows }));
    expect(f.items.map((i) => i.questionId)).toEqual(["f-d1-q001"]);
    expect(f.paceByExam.map((p) => p.exam)).toEqual(["ccar-f"]);

    const p = buildDailyQueue(inputs({ scope: "ccar-p", questions: [fDue, pDue, pNew], srsRows }));
    expect(p.items.map((i) => i.questionId).sort()).toEqual(["p-d1-q001", "p-d1-q002"]);
    expect(p.paceByExam.map((x) => x.exam)).toEqual(["ccar-p"]);
  });

  it("both では両方の due が出る", () => {
    const q = buildDailyQueue(inputs({ questions: [fDue, pDue], srsRows }));
    expect(q.items.map((i) => i.questionId).sort()).toEqual(["f-d1-q001", "p-d1-q001"]);
  });
});

describe("スコープ both の合成", () => {
  it("due は exam を区別せず due_at の古い順、予算 2700 秒を 1 つ共有する", () => {
    // F 80 枚 / P 80 枚の due を交互の時刻で作る(flash 20 秒 × 160 = 3200 秒 > 2700)
    const fQs = fIds(100, 80).map((id) => flash(id));
    const pQs = pIds(100, 80).map((id) => pflash(id));
    const base = Date.parse("2026-09-01T09:00:00+09:00");
    const srsRows = [
      ...fQs.map((q, i) => srsRow(q.id, { dueAt: new Date(base + (2 * i) * 60_000) })),
      ...pQs.map((q, i) => srsRow(q.id, { exam: "ccar-p", dueAt: new Date(base + (2 * i + 1) * 60_000) })),
    ];
    const q = buildDailyQueue(inputs({ questions: [...fQs, ...pQs], srsRows }));
    expect(q.totalEstSec).toBe(2700);
    expect(q.items).toHaveLength(2700 / EST_SEC_FLASH);
    expect(q.dueBacklogCount).toBe(160 - 135);
    // 交互(F, P, F, P, …)= due_at 順
    expect(q.items.slice(0, 4).map((i) => i.questionId)).toEqual(["f-d1-q100", "p-d1-q100", "f-d1-q101", "p-d1-q101"]);
  });

  it("new は exam 別ペースの合計。試験日を過ぎた F は new_per_day = 0 で、F の未導入カードは入らない", () => {
    const fNew = fIds(100, 50, 1).map((id) => flash(id)); // F の未導入 50 枚(F は 9/27 通過済み)
    const pNew = pIds(100, 130, 2).map((id) => pflash(id)); // P: remaining 130 / (72 - 7) = 2/日
    const q = buildDailyQueue(inputs({ questions: [...fNew, ...pNew] }));
    const byExam = Object.fromEntries(q.paceByExam.map((p) => [p.exam, p.pace]));
    expect(byExam["ccar-f"]).toEqual({ remainingNew: 50, requiredNew: 0, newPerDay: 0, paceWarning: false });
    expect(byExam["ccar-p"]).toEqual({ remainingNew: 130, requiredNew: 2, newPerDay: 2, paceWarning: false });
    expect(q.pace).toEqual({ remainingNew: 180, requiredNew: 2, newPerDay: 2, paceWarning: false });
    expect(q.items.map((i) => [i.questionId.slice(0, 1), i.source])).toEqual([
      ["p", "new"],
      ["p", "new"],
    ]);
  });

  it("新規枠は exam ごとに独立: F の未導入カード(priority が高くても)が P の新規枠を消費しない", () => {
    // 仮の試験日: F 11/15(残 45 日 → 38 日で割る)、P 12/12(残 72 日 → 65 日で割る)
    const examDates = { "ccar-f": "2026-11-15", "ccar-p": "2026-12-12" } as const;
    const fNew = fIds(100, 76, 1).map((id) => flash(id)); // F: ceil(76 / 38) = 2/日(F d1 weight 60 → priority 高)
    const pNew = pIds(100, 65, 2).map((id) => pflash(id)); // P: ceil(65 / 65) = 1/日(P d2 weight 30 → priority 低)
    const q = buildDailyQueue(inputs({ questions: [...fNew, ...pNew], examDates }));
    const news = q.items.filter((i) => i.source === "new").map((i) => i.questionId);
    expect(news.filter((id) => id.startsWith("f-"))).toHaveLength(2);
    expect(news.filter((id) => id.startsWith("p-"))).toHaveLength(1);
    // マージ後は priority 順(F d1: 60 × 0.79 > P d2: 30 × 0.79)
    expect(news.map((id) => id.slice(0, 1))).toEqual(["f", "f", "p"]);

    // 当日導入済みは exam ごとに差し引く: F を 2 件導入済みでも P の 1 件は残る
    // (当日導入した 2 枚は srs_state 行を持ち、due は将来)
    const introducedRows = news
      .filter((id) => id.startsWith("f-"))
      .map((id) => srsRow(id, { dueAt: at("2026-10-02T09:00:00"), state: 1 }));
    const after = buildDailyQueue(
      inputs({ questions: [...fNew, ...pNew], examDates, srsRows: introducedRows, introducedToday: { "ccar-f": 2 } }),
    );
    expect(after.items.filter((i) => i.source === "new").map((i) => i.questionId.slice(0, 1))).toEqual(["p"]);
  });

  it("spentTodaySec は全 exam で数える: F の当日 drill 消費が P スコープの残予算を減らす", () => {
    const consumption = deriveConsumption({
      todayRows: [
        { questionId: "f-d1-q001", appliedRating: 3 },
        { questionId: "f-d1-q002", appliedRating: 3 },
        { questionId: "p-d1-q001", appliedRating: 3 },
      ],
      introducedBefore: new Set(["f-d1-q002"]),
      estOf: () => EST_SEC_FLASH,
    });
    expect(consumption.spentTodaySec).toBe(3 * EST_SEC_FLASH);
    expect(consumption.introducedTodayCount).toBe(2);
    expect(consumption.introducedTodayByExam).toEqual({ "ccar-f": 1, "ccar-p": 1 });

    const pDue = pIds(100, 200).map((id) => pflash(id));
    const srsRows = pDue.map((q) => srsRow(q.id, { exam: "ccar-p" }));
    const q = buildDailyQueue(
      inputs({ scope: "ccar-p", questions: pDue, srsRows, spentTodaySec: consumption.spentTodaySec }),
    );
    expect(q.totalEstSec).toBe(2700 - 3 * EST_SEC_FLASH);
  });
});

describe("D-1 は単独スコープのときだけ、その exam の試験日前日に発動する", () => {
  it("P 前日(12/11): ccar-p は d_minus_1、both は normal", () => {
    const d1 = at("2026-12-11T09:00:00");
    expect(queueModeFor(d1, "ccar-p")).toBe("d_minus_1");
    expect(queueModeFor(d1, "both")).toBe("normal");
    expect(queueModeFor(d1, "ccar-f")).toBe("normal");
    expect(queueModeFor(at("2026-12-10T09:00:00"), "ccar-p")).toBe("normal");
  });

  it("F 前日(9/26): ccar-f は d_minus_1、ccar-p と both は反応しない", () => {
    const d1 = at("2026-09-26T09:00:00");
    expect(queueModeFor(d1, "ccar-f")).toBe("d_minus_1");
    expect(queueModeFor(d1, "ccar-p")).toBe("normal");
    expect(queueModeFor(d1, "both")).toBe("normal");
  });

  it("both では P 前日でもセレクタ無しで通常キューを組む(fail closed の throw に到達しない)", () => {
    const d1 = at("2026-12-11T09:00:00");
    const q = buildDailyQueue(inputs({ now: d1, questions: [pflash("p-d1-q001")], srsRows: [srsRow("p-d1-q001", { exam: "ccar-p" })] }));
    expect(q.mode).toBe("normal");
    expect(q.items.map((i) => i.questionId)).toEqual(["p-d1-q001"]);
  });

  it("assembleQueueView: both の P 前日は ok、ccar-p の P 前日は d_minus_1_unavailable", () => {
    const d1 = at("2026-12-11T09:00:00");
    const qs: Question[] = [pflash("p-d1-q001")];
    const bank: Bank = { questions: qs, forms: [], byId: new Map(qs.map((q) => [q.id, q])) };
    const base = {
      now: d1,
      bank,
      syllabi: [syllabus, pSyllabus],
      poolCtx: emptyCtx(),
      srsRows: [],
      correctQuestionIds: new Set<string>(),
      consumption: { spentTodaySec: 0, introducedTodayCount: 0, introducedTodayByExam: {} },
      startedToday: false,
    };
    expect(assembleQueueView({ ...base, scope: "both" }).kind).toBe("ok");
    expect(assembleQueueView({ ...base, scope: "ccar-p" }).kind).toBe("d_minus_1_unavailable");
  });
});

describe("カウントダウンはスコープ内の exam ごと(試験日通過後は負の残日数)", () => {
  it("both: F は -4(受験済み)、P は 72", () => {
    const qs: Question[] = [];
    const v = assembleQueueView({
      now: NOW_P,
      scope: "both",
      bank: { questions: qs, forms: [], byId: new Map() },
      syllabi: [syllabus, pSyllabus],
      poolCtx: emptyCtx(),
      srsRows: [],
      correctQuestionIds: new Set(),
      consumption: { spentTodaySec: 0, introducedTodayCount: 0, introducedTodayByExam: {} },
      startedToday: false,
    });
    expect(v.countdowns).toEqual([
      { exam: "ccar-f", examDateJst: "2026-09-27", daysLeft: -4 },
      { exam: "ccar-p", examDateJst: "2026-12-12", daysLeft: 72 },
    ]);
  });
});

describe("holdout と remaining_new は (exam, form_id) で判定する(B-S-3-1)", () => {
  it("F の form-a だけ提出済み: F form-a 収載は解放、P form-a 収載は holdout で remaining_new にも入らない", () => {
    // 検証用に srs_eligible=true の収載問題を置く(同名 form の取り違えがあれば remaining_new が変わる)
    const fForm = fIds(100, 60, 3).map((id) => flash(id));
    const pForm = pIds(100, 60, 3).map((id) => pflash(id));
    const poolCtx = {
      forms: [holdoutForm("form-a", fForm.map((q) => q.id)), pHoldoutForm("form-a", pForm.map((q) => q.id))],
      sessions: [{ exam: "ccar-f", formId: "form-a", kind: "full", status: "submitted" }] as const,
      flags: [],
    };
    const examDates = { "ccar-f": "2026-12-12", "ccar-p": "2026-12-12" } as const; // 両 exam とも新規が出る日付
    const q = buildDailyQueue(inputs({ questions: [...fForm, ...pForm], poolCtx, examDates }));
    const byExam = Object.fromEntries(q.paceByExam.map((p) => [p.exam, p.pace.remainingNew]));
    expect(byExam).toEqual({ "ccar-f": 60, "ccar-p": 0 });
    expect(q.items.every((i) => i.questionId.startsWith("f-"))).toBe(true);
    expect(q.items.length).toBeGreaterThan(0);

    // 逆(P だけ提出済み)
    const reversed = buildDailyQueue(
      inputs({
        questions: [...fForm, ...pForm],
        poolCtx: { ...poolCtx, sessions: [{ exam: "ccar-p", formId: "form-a", kind: "full", status: "submitted" }] },
        examDates,
      }),
    );
    expect(Object.fromEntries(reversed.paceByExam.map((p) => [p.exam, p.pace.remainingNew]))).toEqual({
      "ccar-f": 0,
      "ccar-p": 60,
    });
  });
});

describe("習熟度はスコープ内 exam の topic だけ(exam をまたいで平均しない)", () => {
  it("scope ccar-p の新規 priority は P の domain_weight で決まる(F の syllabus を参照しない)", () => {
    // P d1(weight 70)と P d2(weight 30)の新規候補。P: remaining 130 → 2/日
    const pNew = [...pIds(100, 65, 1), ...pIds(200, 65, 2)].map((id) => pflash(id));
    const q = buildDailyQueue(inputs({ scope: "ccar-p", questions: pNew }));
    expect(q.items.filter((i) => i.source === "new").map((i) => i.questionId.slice(0, 4))).toEqual(["p-d1", "p-d1"]);
  });
});

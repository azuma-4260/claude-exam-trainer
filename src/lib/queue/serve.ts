import type { Db } from "@/db/client";
import { loadPoolContext } from "@/lib/answer/store";
import { bankDir, loadBank, type Bank } from "@/lib/bank/load";
import type { PoolContext } from "@/lib/bank/pool";
import type { Question, Syllabus } from "@/lib/bank/schema";
import { loadSyllabus } from "@/lib/bank/syllabus";
import { jstStartOfDay } from "@/lib/srs/jst";
import type { SrsStateUpsert } from "@/lib/srs/card-row";
import { CCAR_F_EXAM_DATE_JST, daysUntilExam } from "@/lib/srs/scheduler";
import { buildDailyQueue, queueModeFor, type QueueItem, type QueueSource } from "./build";
import { deriveConsumption, type Consumption } from "./consumption";
import { DAILY_QUEUE_BUDGET_SEC, estSec } from "./estimate";
import { loadConsumptionRows, loadQueueSignals } from "./load";
import type { NewPace } from "./pace";

/**
 * S-1 Home / S-3 Quick Drill 向けのキュー組み立て(D1-5)。
 * - buildDailyQueue(D1-4)の出力を画面が必要とする形(セッション分割・practice 分離)へ射影する
 * - 復元はサーバー再構築で実現: 保存済み attempt が srs_state / 消費シグナル経由で反映されるので、
 *   クライアントに「どこまでやったか」を持たない(specs/03 の厳密 ACK と同じ思想)
 * - D-1(9/26)はセレクタ(D5-1)未実装の間 fail closed の typed 値を返す(通常キューへ fallback しない)
 */

/** FR-3: 1 セッション 5〜20 問 */
export const SESSION_MIN = 5;
export const SESSION_MAX = 20;

/** S-3 がクライアントへ渡す 1 問分。採点即時表示のため answer / 解説を含む(個人用アプリ) */
export type DrillItem = {
  questionId: string;
  rev: number;
  type: Question["type"];
  stemEn: string;
  choices: { label: string; textEn: string }[] | null;
  answer: string[] | null;
  answerEn: string | null;
  explanationJa: string;
  refs: string[];
  source: QueueSource;
  estSec: number;
};

export type SessionPlan =
  /** 今日の drill は完了(または供給なし) */
  | { kind: "none" }
  /** 未開始でキュー残が 1〜4 問 → FR-3 の下限により持ち越し(B-D1-5-3) */
  | { kind: "below_session_min"; count: number }
  | { kind: "ok"; items: DrillItem[]; remainingAfterSession: number };

export type QueueView = {
  kind: "ok" | "d_minus_1_unavailable";
  daysLeft: number;
  budgetSec: number;
  spentTodaySec: number;
  /** d_minus_1_unavailable では buildDailyQueue を通らないため null */
  pace: NewPace | null;
  totalEstSec: number;
  dueBacklogCount: number;
  /** キュー内の practice-mode item(シナリオ MCQ 等)。S-3 では出さず Practice 画面(S-4)で消化する */
  deferredPracticeCount: number;
  /** deferredPracticeCount の実体(キュー順)。Practice 画面が最優先で提示する(D2-1) */
  practiceItems: QueueItem[];
  /** 当日キューの全 question id(drill / practice 両 mode)。Practice の追補プールから除外するために公開する */
  queueQuestionIds: string[];
  /** 残 drill 件数(セッション分割前) */
  drillTotal: number;
  session: SessionPlan;
  bankEmpty: boolean;
};

export type AssembleInputs = {
  now: Date;
  bank: Bank;
  syllabus: Syllabus;
  poolCtx: PoolContext;
  srsRows: readonly SrsStateUpsert[];
  correctQuestionIds: ReadonlySet<string>;
  consumption: Consumption;
  /** 当日(00:00 JST 以降)に drill attempt が存在するか(開始済みセッションの継続シグナル) */
  startedToday: boolean;
  examDateJst?: string;
};

/**
 * FR-3(5〜20 問)を守るセッションサイズ。1〜4 問の残骸を作らない分割:
 *   total <= 20 → 全件 / 21〜24 → total - 5(残 5)/ 25 以上 → 20
 * 未開始で total が 1〜4 のときだけ開始不可(持ち越し)。開始済み(startedToday)の残りは
 * 同一セッションの継続として 5 問未満でも提供する(DoD「保存→再読込で復元」との両立)。
 */
export function planSession(items: readonly DrillItem[], startedToday: boolean): SessionPlan {
  const total = items.length;
  if (total === 0) return { kind: "none" };
  if (total < SESSION_MIN && !startedToday) return { kind: "below_session_min", count: total };
  const size = total <= SESSION_MAX ? total : total - SESSION_MIN <= SESSION_MAX ? total - SESSION_MIN : SESSION_MAX;
  return { kind: "ok", items: items.slice(0, size), remainingAfterSession: total - size };
}

export function assembleQueueView(inputs: AssembleInputs): QueueView {
  const examDateJst = inputs.examDateJst ?? CCAR_F_EXAM_DATE_JST;
  const daysLeft = daysUntilExam(inputs.now, examDateJst);
  const base = {
    daysLeft,
    budgetSec: DAILY_QUEUE_BUDGET_SEC,
    spentTodaySec: inputs.consumption.spentTodaySec,
    bankEmpty: inputs.bank.questions.length === 0,
  };

  // D-1: セレクタ(D5-1)未実装の間は fail closed(buildDailyQueue の throw に到達させない)
  if (queueModeFor(inputs.now, examDateJst) === "d_minus_1") {
    return {
      ...base,
      kind: "d_minus_1_unavailable",
      pace: null,
      totalEstSec: 0,
      dueBacklogCount: 0,
      deferredPracticeCount: 0,
      practiceItems: [],
      queueQuestionIds: [],
      drillTotal: 0,
      session: { kind: "none" },
    };
  }

  const queue = buildDailyQueue({
    now: inputs.now,
    questions: inputs.bank.questions,
    syllabus: inputs.syllabus,
    poolCtx: inputs.poolCtx,
    srsRows: inputs.srsRows,
    correctQuestionIds: inputs.correctQuestionIds,
    spentTodaySec: inputs.consumption.spentTodaySec,
    introducedTodayCount: inputs.consumption.introducedTodayCount,
    examDateJst,
  });

  const drillItems: DrillItem[] = [];
  const practiceItems: QueueItem[] = [];
  for (const item of queue.items) {
    if (item.mode !== "drill") {
      practiceItems.push(item);
      continue;
    }
    const q = inputs.bank.byId.get(item.questionId);
    if (!q) continue; // キューはバンク由来なので通常起きない(fail safe)
    drillItems.push({
      questionId: q.id,
      rev: q.rev,
      type: q.type,
      stemEn: q.stem_en,
      choices: q.choices?.map((c) => ({ label: c.label, textEn: c.text_en })) ?? null,
      answer: q.answer,
      answerEn: q.answer_en,
      explanationJa: q.explanation_ja,
      refs: [...q.refs],
      source: item.source,
      estSec: item.estSec,
    });
  }

  return {
    ...base,
    kind: "ok",
    pace: queue.pace,
    totalEstSec: queue.totalEstSec,
    dueBacklogCount: queue.dueBacklogCount,
    deferredPracticeCount: practiceItems.length,
    practiceItems,
    queueQuestionIds: queue.items.map((i) => i.questionId),
    drillTotal: drillItems.length,
    session: planSession(drillItems, inputs.startedToday),
  };
}

/** RSC から呼ぶ I/O 合成(Home / Drill ページ共用)。specs/05: Study 進入時のキュー取得が Neon warm-up */
export async function loadQueueView(db: Db, now: Date): Promise<QueueView> {
  const bank = loadBank();
  const syllabus = loadSyllabus(bankDir());
  const todayStart = jstStartOfDay(now);
  const [poolCtx, signals, consumptionRows] = await Promise.all([
    loadPoolContext(db, bank.forms),
    loadQueueSignals(db),
    loadConsumptionRows(db, todayStart),
  ]);
  const consumption = deriveConsumption({
    todayRows: consumptionRows.todayRows,
    introducedBefore: consumptionRows.introducedBefore,
    estOf: (id) => {
      const q = bank.byId.get(id);
      return q ? estSec(q) : null;
    },
  });
  return assembleQueueView({
    now,
    bank,
    syllabus,
    poolCtx,
    srsRows: signals.srsRows,
    correctQuestionIds: signals.correctQuestionIds,
    consumption,
    startedToday: consumptionRows.todayRows.some((r) => r.mode === "drill"),
  });
}

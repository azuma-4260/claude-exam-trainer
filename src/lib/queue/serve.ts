import type { Db } from "@/db/client";
import { loadPoolContext } from "@/lib/answer/store";
import type { Bank } from "@/lib/bank/load";
import type { PoolContext } from "@/lib/bank/pool";
import { loadMultiBank, scopeBank } from "@/lib/bank/runtime";
import type { Exam, Question, Syllabus } from "@/lib/bank/schema";
import { EXAM_DATE_JST, examDateOf, type ExamDates } from "@/lib/exam/dates";
import { getStudyScope } from "@/lib/scope/repo";
import { scopeExams, type StudyScope } from "@/lib/scope/scope";
import { jstStartOfDay } from "@/lib/srs/jst";
import type { SrsStateUpsert } from "@/lib/srs/card-row";
import { daysUntilExam } from "@/lib/srs/scheduler";
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
 * - D-1(単独スコープの試験日前日)はセレクタ(D5-1)未実装の間 fail closed の typed 値を返す(通常キューへ fallback しない)
 * - 学習スコープ(v1.3): キュー・カウントダウンはスコープ内の exam。消費予算(spent)は全 exam で数える
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
  source: QueueSource | "mistake";
  estSec: number;
  /** Practice シナリオ問題を Quick Drill 形式で周回するときの本文参照。通常 Drill では null。 */
  scenarioId?: string | null;
};

export type SessionPlan =
  /** 今日の drill は完了(または供給なし) */
  | { kind: "none" }
  | { kind: "ok"; items: DrillItem[]; remainingAfterSession: number };

/** スコープ内 exam の試験日カウントダウン(daysLeft < 0 は受験済み。01 FR-6) */
export type ExamCountdown = { exam: Exam; examDateJst: string; daysLeft: number };

export type QueueView = {
  kind: "ok" | "d_minus_1_unavailable";
  scope: StudyScope;
  countdowns: ExamCountdown[];
  budgetSec: number;
  spentTodaySec: number;
  /** d_minus_1_unavailable では buildDailyQueue を通らないため null。スコープ全体の合計(specs/04) */
  pace: NewPace | null;
  /** exam ごとのペース(警告をどの exam のものか表示するため)。d_minus_1_unavailable では空 */
  paceByExam: { exam: Exam; pace: NewPace }[];
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
  scope: StudyScope;
  /** スコープで絞った bank(scopeBank の bank)。bankEmpty の判定と drill DTO の解決に使う */
  bank: Bank;
  syllabi: readonly Syllabus[];
  poolCtx: PoolContext;
  srsRows: readonly SrsStateUpsert[];
  correctQuestionIds: ReadonlySet<string>;
  consumption: Consumption;
  examDates?: ExamDates;
};

/**
 * FR-3(5〜20 問)を守るセッションサイズ。1〜4 問の残骸を作らない分割:
 *   total <= 20 → 全件 / 21〜24 → total - 5(残 5)/ 25 以上 → 20
 * total が 1〜4 のときは FR-3 の供給不足時の例外(D6-7)により、その全件で 1 セッションにする。
 * 分割は残りを 0 か 5 以上にするので、1〜4 問になるのはキュー全体が細いとき(新規枠 < 5 の exam・直前期)
 * か、予算消化・回答済みで当日の残りが減ったときに限られる。どちらも持ち越さずに提供する。
 */
export function planSession(items: readonly DrillItem[]): SessionPlan {
  const total = items.length;
  if (total === 0) return { kind: "none" };
  const size = total <= SESSION_MAX ? total : total - SESSION_MIN <= SESSION_MAX ? total - SESSION_MIN : SESSION_MAX;
  return { kind: "ok", items: items.slice(0, size), remainingAfterSession: total - size };
}

export function assembleQueueView(inputs: AssembleInputs): QueueView {
  const examDates = inputs.examDates ?? EXAM_DATE_JST;
  const countdowns = scopeExams(inputs.scope).map((exam) => {
    const examDateJst = examDateOf(exam, examDates);
    return { exam, examDateJst, daysLeft: daysUntilExam(inputs.now, examDateJst) };
  });
  const base = {
    scope: inputs.scope,
    countdowns,
    budgetSec: DAILY_QUEUE_BUDGET_SEC,
    spentTodaySec: inputs.consumption.spentTodaySec,
    bankEmpty: inputs.bank.questions.length === 0,
  };

  // D-1: セレクタ(D5-1)未実装の間は fail closed(buildDailyQueue の throw に到達させない)
  if (queueModeFor(inputs.now, inputs.scope, examDates) === "d_minus_1") {
    return {
      ...base,
      kind: "d_minus_1_unavailable",
      pace: null,
      paceByExam: [],
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
    scope: inputs.scope,
    questions: inputs.bank.questions,
    syllabi: inputs.syllabi,
    poolCtx: inputs.poolCtx,
    srsRows: inputs.srsRows,
    correctQuestionIds: inputs.correctQuestionIds,
    spentTodaySec: inputs.consumption.spentTodaySec,
    introducedToday: inputs.consumption.introducedTodayByExam,
    examDates,
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
      scenarioId: q.scenario_id,
    });
  }

  return {
    ...base,
    kind: "ok",
    pace: queue.pace,
    paceByExam: queue.paceByExam,
    totalEstSec: queue.totalEstSec,
    dueBacklogCount: queue.dueBacklogCount,
    deferredPracticeCount: practiceItems.length,
    practiceItems,
    queueQuestionIds: queue.items.map((i) => i.questionId),
    drillTotal: drillItems.length,
    session: planSession(drillItems),
  };
}

/**
 * キュー / Practice 共通のシグナル読込。スコープで絞った bank と、全 exam の消費(spent)を返す。
 * holdout 判定の forms・消費見積りは全 exam(bank.forms / multi.all)で行う。
 */
export async function loadQueueInputs(db: Db, now: Date) {
  const multi = loadMultiBank();
  const scope = await getStudyScope(db);
  const scoped = scopeBank(multi, scope);
  const todayStart = jstStartOfDay(now);
  const [poolCtx, signals, consumptionRows] = await Promise.all([
    loadPoolContext(db, multi.all.forms),
    loadQueueSignals(db),
    loadConsumptionRows(db, todayStart),
  ]);
  const consumption = deriveConsumption({
    todayRows: consumptionRows.todayRows,
    introducedBefore: consumptionRows.introducedBefore,
    estOf: (id) => {
      const q = multi.all.byId.get(id);
      return q ? estSec(q) : null;
    },
  });
  return { scope, scoped, poolCtx, signals, consumption, consumptionRows };
}

/** RSC から呼ぶ I/O 合成(Home / Drill ページ共用)。specs/05: Study 進入時のキュー取得が Neon warm-up */
export async function loadQueueView(db: Db, now: Date): Promise<QueueView> {
  const { scope, scoped, poolCtx, signals, consumption } = await loadQueueInputs(db, now);
  return assembleQueueView({
    now,
    scope,
    bank: scoped.bank,
    syllabi: scoped.syllabi,
    poolCtx,
    srsRows: signals.srsRows,
    correctQuestionIds: signals.correctQuestionIds,
    consumption,
  });
}

import type { Db } from "@/db/client";
import { loadPoolContext } from "@/lib/answer/store";
import type { Bank } from "@/lib/bank/load";
import type { PoolContext } from "@/lib/bank/pool";
import { loadMultiBank, scopeBank } from "@/lib/bank/runtime";
import type { Exam, Question, Syllabus } from "@/lib/bank/schema";
import { EXAM_DATE_JST, examDateOf, type ExamDates } from "@/lib/exam/dates";
import { structuredOf, toChoiceView, type ChoiceView, type StructuredFields } from "@/lib/explanation/structured";
import { getStudyScope } from "@/lib/scope/repo";
import { scopeExams, type StudyScope } from "@/lib/scope/scope";
import { jstStartOfDay } from "@/lib/srs/jst";
import type { SrsStateUpsert } from "@/lib/srs/card-row";
import { daysUntilExam } from "@/lib/srs/scheduler";
import { buildMistakeAttemptsSelect } from "@/lib/mistakes/load";
import type { MistakeAttempt } from "@/lib/mistakes/derive";
import { buildDailyQueue, queueModeFor, type QueueItem, type QueueSource } from "./build";
import { leadingRun, selectDMinus1Items } from "./d-minus-1";
import { preExamPhase, type PreExamPhase } from "./pre-exam";
import { deriveConsumption, type Consumption } from "./consumption";
import { DAILY_QUEUE_BUDGET_SEC, estSec } from "./estimate";
import { SESSION_MAX, SESSION_MIN } from "./session-size";
import { loadConsumptionRows, loadQueueSignals } from "./load";
import type { NewPace } from "./pace";

/**
 * S-1 Home / S-3 Quick Drill 向けのキュー組み立て(D1-5)。
 * - buildDailyQueue(D1-4)の出力を画面が必要とする形(セッション分割・practice 分離)へ射影する
 * - 復元はサーバー再構築で実現: 保存済み attempt が srs_state / 消費シグナル経由で反映されるので、
 *   クライアントに「どこまでやったか」を持たない(specs/03 の厳密 ACK と同じ思想)
 * - D-1(単独スコープの試験日前日)は「間違いノート → low-stability 順」のセレクタ(d-minus-1.ts)を注入する。
   Drill / Practice に分離される画面で順序を保つため、先頭 item の mode(nextMode)の連続区間だけを提示する
 * - 学習スコープ(v1.3): キュー・カウントダウンはスコープ内の exam。消費予算(spent)は全 exam で数える
 */

export { SESSION_MAX, SESSION_MIN };

/**
 * S-3 がクライアントへ渡す 1 問分。採点即時表示のため answer / 解説を含む(個人用アプリ)。
 * 構造化解説フィールド(StructuredFields / ChoiceView。specs/03 §1)も同じ扱いで、画面は回答後だけ表示する
 */
export type DrillItem = StructuredFields & {
  questionId: string;
  rev: number;
  type: Question["type"];
  stemEn: string;
  choices: ChoiceView[] | null;
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

/** D-1 の画面誘導。先頭 item の mode が次の回答先(順序保証)。queued は未回答の D-1 item 総数 */
export type DMinus1View = { nextMode: "drill" | "practice" | null; queued: number };

export type QueueView = {
  kind: "ok";
  scope: StudyScope;
  countdowns: ExamCountdown[];
  budgetSec: number;
  spentTodaySec: number;
  /** スコープ全体の合計(specs/04) */
  pace: NewPace;
  /** exam ごとのペース(警告をどの exam のものか表示するため) */
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
  /** 直前期(単独スコープで試験日 −7 日〜前日)の局面。推奨行動カード用。それ以外は null */
  preExam: PreExamPhase | null;
  /** D-1 のときだけ非 null */
  dMinus1: DMinus1View | null;
};

/** D-1 のセレクタ入力(D-1 のときだけロードする) */
export type DMinus1Signals = {
  mistakeAttempts: readonly MistakeAttempt[];
  answeredTodayIds: ReadonlySet<string>;
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
  /** D-1 のとき必須(欠落は fail closed で throw)。Home / Drill / Practice の全経路で同じ値を渡す */
  dMinus1Signals?: DMinus1Signals;
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

  const isDMinus1 = queueModeFor(inputs.now, inputs.scope, examDates) === "d_minus_1";
  if (isDMinus1 && !inputs.dMinus1Signals) {
    throw new Error("D-1 の入力(mistakeAttempts / answeredTodayIds)が未提供。通常キューへは fallback しない");
  }
  const signals = inputs.dMinus1Signals;

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
    selectDMinus1: signals
      ? () =>
          selectDMinus1Items({
            bank: inputs.bank,
            poolCtx: inputs.poolCtx,
            srsRows: inputs.srsRows,
            mistakeAttempts: signals.mistakeAttempts,
            answeredTodayIds: signals.answeredTodayIds,
          })
      : undefined,
  });

  // D-1 は Drill / Practice に分離される画面でも「間違いノート → low-stability」の順序を保つため、
  // 先頭 item の mode の連続区間だけを提示する。run を消化すると当日回答済みになり、リビルドで次の run が先頭になる
  const shown = isDMinus1 ? leadingRun(queue.items) : queue.items;
  const nextMode = shown[0]?.mode ?? null;

  const drillItems: DrillItem[] = [];
  const practiceItems: QueueItem[] = [];
  for (const item of shown) {
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
      choices: q.choices?.map(toChoiceView) ?? null,
      ...structuredOf(q),
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
    preExam: preExamPhase(inputs.now, inputs.scope, examDates),
    dMinus1: isDMinus1 ? { nextMode, queued: queue.items.length } : null,
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
  const examDates = EXAM_DATE_JST;
  const isDMinus1 = queueModeFor(now, scope, examDates) === "d_minus_1";
  const [poolCtx, signals, consumptionRows, mistakeAttempts] = await Promise.all([
    loadPoolContext(db, multi.all.forms),
    loadQueueSignals(db),
    loadConsumptionRows(db, todayStart),
    isDMinus1 ? buildMistakeAttemptsSelect(db) : Promise.resolve(null),
  ]);
  const consumption = deriveConsumption({
    todayRows: consumptionRows.todayRows,
    introducedBefore: consumptionRows.introducedBefore,
    estOf: (id) => {
      const q = multi.all.byId.get(id);
      return q ? estSec(q) : null;
    },
  });
  // D-1 のセレクタ入力。Home / Drill / Practice の全経路が同じ値を assembleQueueView に渡す
  const dMinus1Signals: DMinus1Signals | undefined = mistakeAttempts
    ? { mistakeAttempts, answeredTodayIds: new Set(consumptionRows.todayRows.map((r) => r.questionId)) }
    : undefined;
  return { scope, scoped, poolCtx, signals, consumption, consumptionRows, dMinus1Signals };
}

/** RSC から呼ぶ I/O 合成(Home / Drill ページ共用)。specs/05: Study 進入時のキュー取得が Neon warm-up */
export async function loadQueueView(db: Db, now: Date): Promise<QueueView> {
  const { scope, scoped, poolCtx, signals, consumption, dMinus1Signals } = await loadQueueInputs(db, now);
  return assembleQueueView({
    now,
    scope,
    bank: scoped.bank,
    syllabi: scoped.syllabi,
    poolCtx,
    srsRows: signals.srsRows,
    correctQuestionIds: signals.correctQuestionIds,
    consumption,
    dMinus1Signals,
  });
}

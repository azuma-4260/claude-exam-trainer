import { evaluatePool, unsubmittedFormIds, type PoolContext } from "@/lib/bank/pool";
import type { Question, Syllabus } from "@/lib/bank/schema";
import type { SrsStateUpsert } from "@/lib/srs/card-row";
import { CCAR_F_EXAM_DATE_JST, daysUntilExam } from "@/lib/srs/scheduler";
import { DAILY_QUEUE_BUDGET_SEC, NEW_RESERVED_SEC, estSec } from "./estimate";
import { computeNewPace, type NewPace } from "./pace";
import { topicPriorities, topicProficiencies } from "./proficiency";

/**
 * 日次キュー生成(specs/04 §日次キュー(45 分時間予算方式)、§直前期と D-1)。
 *
 *   1. due(due_at <= now)を古い順に、予算 - reserved_new_sec まで積む
 *   2. 新規候補を priority 順に、new_per_day 件以内かつ残予算内で積む
 *   3. 予算が余れば due バックログを追加
 *   4. 予算超過分は翌日へ(バックログとして件数のみ分離表示)
 *
 * 積み方は「順序どおりに、次の 1 件が収まらなくなったら停止」(古い順 / priority 順の並びを
 * 崩してまで小さい問題を先に詰める skip はしない)。出題可否は D1-2 の evaluatePool に委譲するので、
 * 未提出フォーム収載問題(holdout)・現行 rev の open flag・retired 等は due / 新規の双方から消える。
 *
 * キュー対象は SRS が回る全問題: drill として出題可能(flash / 短問 MCQ)か、
 * practice の SRS 対象として出題可能(specs/07 Step 3a の Practice 専用シナリオ MCQ 等)のどちらか。
 * 各 item は回答すべき mode を持つ(drill 優先。解放済みフォーム問題は srs_eligible=false のため
 * practice+srs 判定で除外され、キューに入らない)。
 */

export type QueueMode = "normal" | "d_minus_1";
export type QueueSource = "due" | "new" | "d1";

/** mode: この item を回答すべきモード(FSRS が更新される出題経路) */
export type QueueItem = { questionId: string; source: QueueSource; estSec: number; mode: "drill" | "practice" };

export type DMinus1Item = { questionId: string; estSec: number; mode: "drill" | "practice" };

/**
 * D-1(9/26)の「間違いノート → low-stability 順」セレクタの I/F。実装は D5-1。
 * 返した列は buildDailyQueue 側で時間予算内に切り詰められる。
 */
export type DMinus1Selector = (input: { budgetSec: number; now: Date }) => DMinus1Item[];

export type DailyQueue = {
  mode: QueueMode;
  items: QueueItem[];
  totalEstSec: number;
  /** 予算に入らなかった due の件数(分離表示用)。D-1 では due 選定自体を停止するので 0 */
  dueBacklogCount: number;
  pace: NewPace;
};

export type QueueInputs = {
  now: Date;
  questions: readonly Question[];
  syllabus: Syllabus;
  poolCtx: PoolContext;
  srsRows: readonly SrsStateUpsert[];
  correctQuestionIds: ReadonlySet<string>;
  /** 今日(JST)すでに消化した見積り秒数。予算 2700 秒は 1 日の量なので、同日内の再構築時に差し引く */
  spentTodaySec?: number;
  /** 今日(JST)すでに導入した新規カード数。new_per_day は 1 日の導入目標なので同日内の再構築時に差し引く */
  introducedTodayCount?: number;
  examDateJst?: string;
  selectDMinus1?: DMinus1Selector;
};

/** D-1(試験前日)だけ d_minus_1。それ以外(試験当日・通過後を含む)は normal */
export function queueModeFor(now: Date, examDateJst: string = CCAR_F_EXAM_DATE_JST): QueueMode {
  return daysUntilExam(now, examDateJst) === 1 ? "d_minus_1" : "normal";
}

export function buildDailyQueue(inputs: QueueInputs): DailyQueue {
  const { now, questions, syllabus, poolCtx, srsRows, correctQuestionIds, selectDMinus1 } = inputs;
  const examDateJst = inputs.examDateJst ?? CCAR_F_EXAM_DATE_JST;
  const mode = queueModeFor(now, examDateJst);
  // 予算・新規導入数は 1 日(00:00 JST リセット)の量。消費シグナルの導出は呼び出し側(D1-5)の責務
  const budgetSec = Math.max(0, DAILY_QUEUE_BUDGET_SEC - (inputs.spentTodaySec ?? 0));
  const introducedToday = inputs.introducedTodayCount ?? 0;

  // 新規ペース(specs/04 の式)。remaining_new は「status=active AND srs_eligible=true AND
  // holdout 非該当」で srs_state 行なしの問題数 — eligible_modes や open flag は式に含めない
  // (practice 経由でも FSRS 導入され得るため。flag は解消されれば再び候補に戻る)
  const srsById = new Map(srsRows.map((r) => [r.questionId, r]));
  const unsubmitted = unsubmittedFormIds(poolCtx);
  const holdoutIds = new Set(
    poolCtx.forms.filter((f) => unsubmitted.has(f.id)).flatMap((f) => f.question_ids),
  );
  const remainingNew = questions.filter(
    (q) => q.status === "active" && q.srs_eligible && !holdoutIds.has(q.id) && !srsById.has(q.id),
  ).length;
  // 日次目標は当日開始時点の remaining から算出する(導入済みカードは remainingNew から
  // すでに消えているので、introducedTodayCount を戻してから式に入れる。こうしないと
  // 再構築のたびに目標が二重に減り、リロード頻度でその日の導入件数が変わってしまう)
  const pace = computeNewPace(remainingNew + introducedToday, daysUntilExam(now, examDateJst));

  if (mode === "d_minus_1") {
    // 通常の due ベースのキュー選定を停止し、「間違いノート → low-stability 順」を時間予算内だけ提示する。
    // セレクタ(D5-1)が無ければ fail closed(通常キューに fallback しない)
    if (!selectDMinus1) {
      throw new Error("D-1 モードのセレクタが未提供(D5-1 で実装)。通常キューへは fallback しない");
    }
    const items: QueueItem[] = [];
    let total = 0;
    for (const it of selectDMinus1({ budgetSec, now })) {
      if (total + it.estSec > budgetSec) break;
      items.push({ questionId: it.questionId, source: "d1", estSec: it.estSec, mode: it.mode });
      total += it.estSec;
    }
    return { mode, items, totalEstSec: total, dueBacklogCount: 0, pace };
  }

  // 出題可否は D1-2 の pool 判定に委譲。SRS キューなので drill、だめなら practice(SRS 対象)を試す
  const queueModeOf = (q: Question): "drill" | "practice" | null => {
    if (evaluatePool(q, { mode: "drill" }, poolCtx).allowed) return "drill";
    if (evaluatePool(q, { mode: "practice", srs: true }, poolCtx).allowed) return "practice";
    return null;
  };
  const pool = new Map<string, { q: Question; mode: "drill" | "practice" }>();
  for (const q of questions) {
    const m = queueModeOf(q);
    if (m !== null) pool.set(q.id, { q, mode: m });
  }

  // due: due_at <= now を古い順(同時刻は id 昇順で安定化)
  const dueList = srsRows
    .filter((r) => r.dueAt.getTime() <= now.getTime() && pool.has(r.questionId))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime() || a.questionId.localeCompare(b.questionId))
    .map((r) => {
      const { q, mode: m } = pool.get(r.questionId)!;
      return { questionId: q.id, estSec: estSec(q), mode: m };
    });

  // 新規候補: pool 内で srs_state 行なし、priority 降順(同値は id 昇順)、最大 new_per_day 件
  const priorities = topicPriorities(
    syllabus,
    topicProficiencies({ questions, syllabus, srsRows, correctQuestionIds, now, examDateJst }),
  );
  const newCandidates = [...pool.values()]
    .filter(({ q }) => !srsById.has(q.id))
    .sort(
      (a, b) =>
        (priorities.get(b.q.primary_topic_id) ?? 0) - (priorities.get(a.q.primary_topic_id) ?? 0) ||
        a.q.id.localeCompare(b.q.id),
    )
    .slice(0, Math.max(0, pace.newPerDay - introducedToday));

  const reservedNewSec = Math.min(
    NEW_RESERVED_SEC,
    newCandidates.reduce((a, { q }) => a + estSec(q), 0),
  );

  const items: QueueItem[] = [];
  let total = 0;

  // 1. due を 予算 - reserved まで
  let dueIndex = 0;
  const dueLimit = budgetSec - reservedNewSec;
  while (dueIndex < dueList.length && total + dueList[dueIndex].estSec <= dueLimit) {
    items.push({ ...dueList[dueIndex], source: "due" });
    total += dueList[dueIndex].estSec;
    dueIndex += 1;
  }

  // 2. 新規を残予算内で
  for (const { q, mode: m } of newCandidates) {
    const est = estSec(q);
    if (total + est > budgetSec) break;
    items.push({ questionId: q.id, source: "new", estSec: est, mode: m });
    total += est;
  }

  // 3. 予算が余れば due バックログを追加
  while (dueIndex < dueList.length && total + dueList[dueIndex].estSec <= budgetSec) {
    items.push({ ...dueList[dueIndex], source: "due" });
    total += dueList[dueIndex].estSec;
    dueIndex += 1;
  }

  // 4. 予算超過分は翌日へ(件数のみ)
  return { mode, items, totalEstSec: total, dueBacklogCount: dueList.length - dueIndex, pace };
}

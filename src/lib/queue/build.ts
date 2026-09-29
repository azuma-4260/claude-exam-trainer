import { evaluatePool, holdoutQuestionIds, type PoolContext } from "@/lib/bank/pool";
import type { Exam, Question, Syllabus } from "@/lib/bank/schema";
import { EXAM_DATE_JST, examDateOf, type ExamDates } from "@/lib/exam/dates";
import { scopeExams, type StudyScope } from "@/lib/scope/scope";
import type { SrsStateUpsert } from "@/lib/srs/card-row";
import { daysUntilExam } from "@/lib/srs/scheduler";
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
 * 学習スコープ(v1.3、specs/04 §日次キュー / §新規カード導入ペース):
 * - 候補はスコープ内 exam の問題のみ(出題プール判定 段 0)。both でも予算 2700 秒は 1 つを共有する
 * - due は exam を区別せず due_at の古い順
 * - 新規ペースは exam ごと(remaining_new・days_left とも exam の値)。新規枠も exam ごとに独立で、
 *   exam ごとに priority 降順で new_per_day(exam) − 当日導入済み(exam) 件を取り、priority 順にマージする
 * - D-1 は単独スコープのとき、その exam の試験日前日だけ(both では発動しない)
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
 * D-1(単独スコープの試験日前日)の「間違いノート → low-stability 順」セレクタの I/F。実装は D5-1。
 * 返した列は buildDailyQueue 側で時間予算内に切り詰められる。
 */
export type DMinus1Selector = (input: { budgetSec: number; now: Date }) => DMinus1Item[];

export type DailyQueue = {
  mode: QueueMode;
  items: QueueItem[];
  totalEstSec: number;
  /** 予算に入らなかった due の件数(分離表示用)。D-1 では due 選定自体を停止するので 0 */
  dueBacklogCount: number;
  /**
   * スコープ全体の新規ペース: new_per_day / remaining_new / required_new は exam ごとの合計、
   * pace_warning はいずれかの exam が該当(specs/04)
   */
  pace: NewPace;
  /** exam ごとの新規ペース(スコープ内 exam、EXAMS 順)。警告・required_new を exam 別に表示するため保持 */
  paceByExam: { exam: Exam; pace: NewPace }[];
};

export type QueueInputs = {
  now: Date;
  scope: StudyScope;
  /** バンクの問題(スコープ外 exam を含んでよい。段 0 で落とす) */
  questions: readonly Question[];
  /** 各 exam の syllabus(domain_weight はその topic の exam の公式重み)。未整備の exam は含まなくてよい */
  syllabi: readonly Syllabus[];
  poolCtx: PoolContext;
  srsRows: readonly SrsStateUpsert[];
  correctQuestionIds: ReadonlySet<string>;
  /**
   * 今日(JST)すでに消化した見積り秒数(全 exam。スコープを切り替えても予算は戻らない)。
   * 予算 2700 秒は 1 日の量なので、同日内の再構築時に差し引く
   */
  spentTodaySec?: number;
  /** 今日(JST)すでに導入した新規カード数(exam ごと)。new_per_day は 1 日の導入目標なので同日内の再構築時に差し引く */
  introducedToday?: Partial<Record<Exam, number>>;
  /** exam ごとの試験日(テスト用の差し替え口。既定はコード定数) */
  examDates?: ExamDates;
  selectDMinus1?: DMinus1Selector;
};

/**
 * 単独スコープで、その exam の試験日前日だけ d_minus_1。それ以外(試験当日・通過後・スコープ both)は normal
 * (specs/04 §直前期と D-1 v1.3)
 */
export function queueModeFor(now: Date, scope: StudyScope, examDates: ExamDates = EXAM_DATE_JST): QueueMode {
  if (scope === "both") return "normal";
  return daysUntilExam(now, examDateOf(scope, examDates)) === 1 ? "d_minus_1" : "normal";
}

/** exam ごとのペースを合算する(new_per_day は合計、pace_warning はいずれか) */
function sumPace(list: readonly NewPace[]): NewPace {
  return {
    remainingNew: list.reduce((a, p) => a + p.remainingNew, 0),
    requiredNew: list.reduce((a, p) => a + p.requiredNew, 0),
    newPerDay: list.reduce((a, p) => a + p.newPerDay, 0),
    paceWarning: list.some((p) => p.paceWarning),
  };
}

export function buildDailyQueue(inputs: QueueInputs): DailyQueue {
  const { now, scope, poolCtx, srsRows, correctQuestionIds, selectDMinus1 } = inputs;
  const examDates = inputs.examDates ?? EXAM_DATE_JST;
  const exams = scopeExams(scope);
  // 段 0: 学習スコープ内 exam の問題だけを新規の出題選定の候補にする
  const questions = inputs.questions.filter((q) => exams.includes(q.exam));
  const mode = queueModeFor(now, scope, examDates);
  // 予算・新規導入数は 1 日(00:00 JST リセット)の量。消費シグナルの導出は呼び出し側(D1-5)の責務
  const budgetSec = Math.max(0, DAILY_QUEUE_BUDGET_SEC - (inputs.spentTodaySec ?? 0));
  const introducedOf = (exam: Exam) => inputs.introducedToday?.[exam] ?? 0;

  // 新規ペース(specs/04 の式)を exam ごとに。remaining_new は「status=active AND srs_eligible=true AND
  // holdout 非該当」で srs_state 行なしの問題数 — eligible_modes や open flag は式に含めない
  // (practice 経由でも FSRS 導入され得るため。flag は解消されれば再び候補に戻る)。
  // holdout は (exam, form_id) で判定する(別試験の同名 form の提出状態を取り違えない)
  const srsById = new Map(srsRows.map((r) => [r.questionId, r]));
  const holdoutIds = holdoutQuestionIds(poolCtx);
  const paceByExam = exams.map((exam) => {
    const remainingNew = questions.filter(
      (q) => q.exam === exam && q.status === "active" && q.srs_eligible && !holdoutIds.has(q.id) && !srsById.has(q.id),
    ).length;
    // 日次目標は当日開始時点の remaining から算出する(導入済みカードは remainingNew から
    // すでに消えているので、当日導入数を戻してから式に入れる。こうしないと
    // 再構築のたびに目標が二重に減り、リロード頻度でその日の導入件数が変わってしまう)
    const pace = computeNewPace(remainingNew + introducedOf(exam), daysUntilExam(now, examDateOf(exam, examDates)));
    return { exam, pace };
  });
  const pace = sumPace(paceByExam.map((p) => p.pace));

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
    return { mode, items, totalEstSec: total, dueBacklogCount: 0, pace, paceByExam };
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

  // due: due_at <= now を古い順(スコープ both でも exam を区別しない。同時刻は id 昇順で安定化)
  const dueList = srsRows
    .filter((r) => r.dueAt.getTime() <= now.getTime() && pool.has(r.questionId))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime() || a.questionId.localeCompare(b.questionId))
    .map((r) => {
      const { q, mode: m } = pool.get(r.questionId)!;
      return { questionId: q.id, estSec: estSec(q), mode: m };
    });

  // 新規候補: pool 内で srs_state 行なし。priority(topic) = その exam の domain_weight × (1 - proficiency)。
  // exam ごとに priority 降順(同値は id 昇順)で new_per_day(exam) − 当日導入済み(exam) 件を切り出し、
  // それを priority 順にマージする(ある exam の未導入カードが他の exam の新規枠を消費しない)
  const priorities = new Map<string, number>();
  for (const syllabus of inputs.syllabi) {
    if (!exams.includes(syllabus.exam)) continue; // 習熟度はスコープ内 exam の topic だけ
    const topicProfs = topicProficiencies({ questions, syllabus, srsRows, correctQuestionIds, now, examDates });
    for (const [topicId, p] of topicPriorities(syllabus, topicProfs)) priorities.set(topicId, p);
  }
  const byPriority = (a: { q: Question }, b: { q: Question }) =>
    (priorities.get(b.q.primary_topic_id) ?? 0) - (priorities.get(a.q.primary_topic_id) ?? 0) ||
    a.q.id.localeCompare(b.q.id);
  const newCandidates = paceByExam
    .flatMap(({ exam, pace: p }) =>
      [...pool.values()]
        .filter(({ q }) => q.exam === exam && !srsById.has(q.id))
        .sort(byPriority)
        .slice(0, Math.max(0, p.newPerDay - introducedOf(exam))),
    )
    .sort(byPriority);

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
  return { mode, items, totalEstSec: total, dueBacklogCount: dueList.length - dueIndex, pace, paceByExam };
}

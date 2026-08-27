import type { Db } from "@/db/client";
import { loadPoolContext } from "@/lib/answer/store";
import { bankDir, loadBank, type Bank } from "@/lib/bank/load";
import { filterPool, holdoutFormOf, type PoolContext } from "@/lib/bank/pool";
import type { Question, Scenario } from "@/lib/bank/schema";
import { loadScenarios, loadSyllabus } from "@/lib/bank/syllabus";
import { toScenarioDtos, type MockScenarioDto } from "@/lib/mock/dto";
import type { QueueItem } from "@/lib/queue/build";
import { deriveConsumption } from "@/lib/queue/consumption";
import { estSec } from "@/lib/queue/estimate";
import { loadConsumptionRows, loadQueueSignals } from "@/lib/queue/load";
import { assembleQueueView } from "@/lib/queue/serve";
import { jstStartOfDay } from "@/lib/srs/jst";

/**
 * S-4 Practice 向けの出題組み立て(D2-1。specs/01 FR-4、04 §モード行列、05 S-4)。
 *
 * 2 層構成:
 * - 第 1 層(最優先): 日次キューの practice-mode 項目(buildDailyQueue の予算・due・priority を共有。
 *   Home の「シナリオ n 問」と同一の集合をキュー順で提示する)。回答すると srs_state / 消費シグナル
 *   経由で次回リビルドから自然に消える
 * - 第 2 層(追補): FR-4 プール全体(Practice 専用シナリオ MCQ・独立 MCQ・解放済みフォーム問題。
 *   holdout は evaluatePool が最優先で弾く)。当日キュー全項目と当日回答済みを除外することで、
 *   予定済み drill 項目の二重提供を防ぎ、回答 → 再フェッチでバッチが先へ進む(先頭固定化しない)
 *
 * キュー外(第 2 層)の回答も spent_today_sec に計上されて当日残の予定量が縮むのは
 * specs/04 §同日内リビルドの確定仕様(時間予算 = 実際に使った学習時間)。
 */

/** 1 バッチの上限(RSC ペイロード上限のための制約。FR-3 の 5〜20 レンジは Drill 専用で Practice には適用しない) */
export const PRACTICE_BATCH_MAX = 20;

/** S-4 がクライアントへ渡す 1 問分。採点即時表示のため answer / 解説を含む(個人用アプリ) */
export type PracticeItem = {
  questionId: string;
  rev: number;
  type: "mcq_single" | "mcq_multi";
  scenarioId: string | null;
  stemEn: string;
  choices: { label: string; textEn: string }[];
  answer: string[];
  explanationJa: string;
  refs: string[];
  /** 解放済みフォーム問題(「模試出題済み」バッジ、05 S-4)。プール通過済み + フォーム収載 = 提出済みの含意 */
  released: boolean;
  /** queue = 日次キュー由来(第 1 層)/ pool = 追補(第 2 層) */
  source: "queue" | "pool";
};

export type PracticeView =
  | { kind: "bank_empty" }
  | { kind: "empty" }
  | { kind: "ok"; items: PracticeItem[]; scenarios: MockScenarioDto[]; remainingAfterBatch: number };

export type PracticeAssembleInputs = {
  bank: Bank;
  poolCtx: PoolContext;
  scenarios: readonly Scenario[] | null;
  /** 日次キューの practice-mode 項目(QueueView.practiceItems、キュー順) */
  practiceQueue: readonly QueueItem[];
  /** 第 2 層から除外する question id(当日キュー全項目 + 当日回答済み) */
  excludeIds: ReadonlySet<string>;
};

export function assemblePracticeView(inputs: PracticeAssembleInputs): PracticeView {
  const { bank, poolCtx, scenarios, practiceQueue, excludeIds } = inputs;
  if (bank.questions.length === 0) return { kind: "bank_empty" };

  const toItem = (q: Question, source: "queue" | "pool"): PracticeItem | null => {
    // flash は Practice に出ない(schema が drill 専用を強制)。混入は fail safe で落とす
    if (q.type === "flash") return null;
    return {
      questionId: q.id,
      rev: q.rev,
      type: q.type,
      scenarioId: q.scenario_id,
      stemEn: q.stem_en,
      choices: q.choices.map((c) => ({ label: c.label, textEn: c.text_en })),
      answer: [...q.answer],
      explanationJa: q.explanation_ja,
      refs: [...q.refs],
      released: holdoutFormOf(q.id, bank.forms) !== null,
      source,
    };
  };

  // 第 1 層: キュー順のまま DTO 化(キューはバンク由来なので byId 欠落は通常起きない — fail safe)
  const layer1: PracticeItem[] = [];
  for (const it of practiceQueue) {
    const q = bank.byId.get(it.questionId);
    const item = q ? toItem(q, "queue") : null;
    if (item) layer1.push(item);
  }
  const layer1Ids = new Set(layer1.map((i) => i.questionId));

  // 第 2 層: FR-4 プール(holdout / status / open_flag / eligible_modes は evaluatePool に委譲)から
  // キュー項目・当日回答済みを除外し、id 昇順 → 同一 scenario_id を初出順で隣接(折りたたみ UI が連続する)
  const pool = filterPool(bank.questions, { mode: "practice" }, poolCtx)
    .filter((q) => !excludeIds.has(q.id) && !layer1Ids.has(q.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const groups = new Map<string, Question[]>();
  for (const q of pool) {
    const key = q.scenario_id ?? `solo:${q.id}`;
    const group = groups.get(key);
    if (group) group.push(q);
    else groups.set(key, [q]);
  }
  const layer2 = [...groups.values()].flat().flatMap((q) => toItem(q, "pool") ?? []);

  const all = [...layer1, ...layer2];
  if (all.length === 0) return { kind: "empty" };
  const items = all.slice(0, PRACTICE_BATCH_MAX);

  // バッチ内シナリオ id を初出順で DTO 化(scenarios.yaml 不在は title/context null で表示のみ縮退)
  const seen = new Set<string>();
  const scenarioIds: string[] = [];
  for (const i of items) {
    if (i.scenarioId && !seen.has(i.scenarioId)) {
      seen.add(i.scenarioId);
      scenarioIds.push(i.scenarioId);
    }
  }
  return {
    kind: "ok",
    items,
    scenarios: toScenarioDtos(scenarioIds, scenarios),
    remainingAfterBatch: all.length - items.length,
  };
}

/**
 * RSC から呼ぶ I/O 合成(loadQueueView と同じシグナル一式)。日次キューを同一入力で組み立ててから
 * Practice ビューへ射影するので、Home の deferredPracticeCount と提示内容が一致する。
 */
export async function loadPracticeView(db: Db, now: Date): Promise<PracticeView> {
  const bank = loadBank();
  const syllabus = loadSyllabus(bankDir());
  const scenarios = loadScenarios(bankDir());
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
  const queueView = assembleQueueView({
    now,
    bank,
    syllabus,
    poolCtx,
    srsRows: signals.srsRows,
    correctQuestionIds: signals.correctQuestionIds,
    consumption,
    startedToday: consumptionRows.todayRows.some((r) => r.mode === "drill"),
  });
  // D-1(d_minus_1_unavailable)は practiceItems / queueQuestionIds が空 = 第 2 層のみで通常どおり動く
  // (04 §D-1 が止めるのは日次キューの選定であって Practice 画面ではない)
  const answeredToday = consumptionRows.todayRows.map((r) => r.questionId);
  return assemblePracticeView({
    bank,
    poolCtx,
    scenarios,
    practiceQueue: queueView.practiceItems,
    excludeIds: new Set([...queueView.queueQuestionIds, ...answeredToday]),
  });
}

import type { ExamSessionRow, QuestionFlagRow } from "@/db/schema";
import type { MockForm, Question } from "./schema";

/**
 * 出題プールの判定(specs/03 §出題プールの判定順序、全モード共通)。
 *
 * DB に触らない純関数。呼び出し側(D1-3 回答 API / D1-4 キュー / D3-x Mock / D4-1 mini)が
 * 必要な行だけを PoolContext に詰めて渡す。判定順は仕様を 1:1 で写し、落ちた段を reason で返す。
 *
 * 1. holdout ゲート(最優先): 未提出 full form の収載問題は、その正確な form の full 実施以外では出さない
 * 2. status = active
 * 3. 現行 rev の未解決フラグが無い(旧 rev のフラグは superseded)
 * 4. eligible_modes に当該 mode を含む
 * 5. SRS 文脈(drill は常に / practice は srs:true のとき)では srs_eligible
 * + domain mini: full form 収載問題は提出済みでも常に除外、独立問題(scenario_id=null)のみ、domain_id 一致
 */

export type PoolSession = Pick<ExamSessionRow, "exam" | "formId" | "kind" | "status">;
export type OpenFlag = Pick<QuestionFlagRow, "questionId" | "questionRev" | "resolvedAt">;

export type PoolContext = {
  forms: readonly MockForm[];
  sessions: readonly PoolSession[];
  flags: readonly OpenFlag[];
};

export type PoolQuery =
  /** Drill は常に FSRS 更新対象(04 §モード行列)なので srs_eligible を関数内で必ず要求する */
  | { mode: "drill" }
  /** Practice は解放済みフォーム問題(srs_eligible=false)も出す。srs:true は D1-4 の remaining_new 等 SRS 文脈用 */
  | { mode: "practice"; srs?: boolean }
  /** その正確な full form の実施(初回・rehearsal とも) */
  | { mode: "mock"; kind: "full"; formId: string }
  /** ドメイン別ミニ模試: 独立 MCQ プールのみ */
  | { mode: "mock"; kind: "domain_mini"; domainId: string };

export type PoolReason =
  | "holdout"
  | "status"
  | "open_flag"
  | "mode"
  | "srs"
  | "mini_form_excluded"
  | "domain"
  | "scenario"
  | "not_in_form";

export type PoolVerdict = { allowed: true; reason?: undefined } | { allowed: false; reason: PoolReason };

/** submitted な full session が 1 件も無い form の id 集合。提出は (exam, formId) で照合する(F/P で同名 form が並存しうる) */
export function unsubmittedFormIds(ctx: Pick<PoolContext, "forms" | "sessions">): Set<string> {
  const result = new Set<string>();
  for (const f of ctx.forms) if (!isSubmitted(f, ctx.sessions)) result.add(f.id);
  return result;
}

function containingForm(questionId: string, forms: readonly MockForm[]): MockForm | null {
  for (const f of forms) if (f.question_ids.includes(questionId)) return f;
  return null;
}

/** 問題を収載している form の id。非収載なら null(validator が form 間重複を禁止するので高々 1 件) */
export function holdoutFormOf(questionId: string, forms: readonly MockForm[]): string | null {
  return containingForm(questionId, forms)?.id ?? null;
}

function isSubmitted(form: MockForm, sessions: readonly PoolSession[]): boolean {
  return sessions.some(
    (s) => s.kind === "full" && s.status === "submitted" && s.exam === form.exam && s.formId === form.id,
  );
}

function hasOpenFlagForCurrentRev(q: Question, flags: readonly OpenFlag[]): boolean {
  return flags.some((f) => f.questionId === q.id && f.questionRev === q.rev && f.resolvedAt === null);
}

export interface FormAvailability {
  available: boolean;
  /** 現行 rev の未解決フラグを持つ問題数 */
  openFlagCount: number;
  /** status≠active の問題数 */
  inactiveCount: number;
  /** バンクに存在しない収載問題数(availability 理由とは独立のバンク不整合) */
  missingCount: number;
}

/**
 * フォーム開始時の availability 検証(01 FR-5、05 S-5)。
 * 1 問でも status≠active または現行 rev の未解決フラグがあればそのフォームは開始不可
 * (実行時の代替差し込み禁止)。同一問題が status NG かつフラグ有りの場合は inactive として数える。
 * バンク不整合(null)は missingCount に独立集計し、開始 API では 404(unknown_question)側で扱う。
 */
export function formAvailability(
  questions: readonly (Question | null)[],
  flags: readonly OpenFlag[],
): FormAvailability {
  let openFlagCount = 0;
  let inactiveCount = 0;
  let missingCount = 0;
  for (const q of questions) {
    if (!q) missingCount += 1;
    else if (q.status !== "active") inactiveCount += 1;
    else if (hasOpenFlagForCurrentRev(q, flags)) openFlagCount += 1;
  }
  return {
    available: openFlagCount === 0 && inactiveCount === 0 && missingCount === 0,
    openFlagCount,
    inactiveCount,
    missingCount,
  };
}

function requiresSrs(query: PoolQuery): boolean {
  return query.mode === "drill" || (query.mode === "practice" && query.srs === true);
}

export function evaluatePool(q: Question, query: PoolQuery, ctx: PoolContext): PoolVerdict {
  const form = containingForm(q.id, ctx.forms);
  const formId = form?.id ?? null;

  // 1. holdout ゲート(収載 form 自体の提出状態を (exam, formId) で見る。別試験の同名 form に影響されない)
  if (form !== null && !isSubmitted(form, ctx.sessions)) {
    const isExactForm = query.mode === "mock" && query.kind === "full" && query.formId === formId;
    if (!isExactForm) return { allowed: false, reason: "holdout" };
  }
  // domain mini は独立 MCQ プールのみ(01 FR-5): full form 収載問題は提出済みでも常に除外、シナリオ問題も除外
  if (query.mode === "mock" && query.kind === "domain_mini") {
    if (formId !== null) return { allowed: false, reason: "mini_form_excluded" };
    if (q.scenario_id !== null) return { allowed: false, reason: "scenario" };
    if (q.domain_id !== query.domainId) return { allowed: false, reason: "domain" };
  }
  // full form 実施では収載問題だけを対象にする
  if (query.mode === "mock" && query.kind === "full" && formId !== query.formId) {
    return { allowed: false, reason: "not_in_form" };
  }
  // 2. status
  if (q.status !== "active") return { allowed: false, reason: "status" };
  // 3. 現行 rev の未解決フラグ
  if (hasOpenFlagForCurrentRev(q, ctx.flags)) return { allowed: false, reason: "open_flag" };
  // 4. eligible_modes
  if (!q.eligible_modes.includes(query.mode)) return { allowed: false, reason: "mode" };
  // 5. SRS 文脈
  if (requiresSrs(query) && !q.srs_eligible) return { allowed: false, reason: "srs" };
  return { allowed: true };
}

/** 入力順を保ったまま通過した問題だけを返す */
export function filterPool(questions: readonly Question[], query: PoolQuery, ctx: PoolContext): Question[] {
  return questions.filter((q) => evaluatePool(q, query, ctx).allowed);
}

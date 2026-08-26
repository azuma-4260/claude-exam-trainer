"use client";

import { useEffect, useReducer, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CircleCheck, CircleX, LoaderCircle, RotateCcw, X } from "lucide-react";
import { QuestionMenu } from "@/components/question-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import type { AnswerRequest } from "@/lib/answer/schema";
import type { DrillItem } from "@/lib/queue/serve";
import {
  canNext,
  classifyAnswerResponse,
  drillReducer,
  initialDrillState,
  summarize,
  type DrillResult,
  type FlashRating,
  type ItemStep,
  type RejectReason,
} from "@/lib/drill/machine";
import { cn } from "@/lib/utils";

/**
 * S-3 Quick Drill(specs/05)。状態はすべて純関数 reducer(src/lib/drill/machine.ts)が持ち、
 * このコンポーネントは描画と I/O(POST /api/answers、attemptId 生成、経過時間計測)だけを担う。
 * 厳密 ACK: 保存 ACK まで Next は disabled。失敗時は同一 attempt_id で Retry(冪等キー)。
 */

const RATING_BUTTONS: { rating: FlashRating; label: string; className: string }[] = [
  { rating: 1, label: "Again", className: "bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400" },
  { rating: 2, label: "Hard", className: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400" },
  { rating: 3, label: "Good", className: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400" },
  { rating: 4, label: "Easy", className: "bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 dark:text-sky-400" },
];

const REJECT_MESSAGES: Record<RejectReason, string> = {
  bad_request: "この回答は受け付けられませんでした。ページを再読込してください。",
  unauthorized: "セッションの有効期限が切れました。ログインし直してください。",
  unknown_question: "問題が更新されました。ページを再読込してください。",
  stale_question_rev: "問題が更新されました。ページを再読込してください。",
  attempt_payload_mismatch: "この回答は受け付けられませんでした。ページを再読込してください。",
  not_eligible: "この問題は出題対象から外れました(フラグ済みなど)。スキップして次へ進めます。",
};

export function QuickDrill({
  items,
  remainingAfterSession,
}: {
  items: DrillItem[];
  remainingAfterSession: number;
}) {
  const [state, dispatch] = useReducer(drillReducer, items, initialDrillState);
  const startedAtRef = useRef(0);
  const lastRequestRef = useRef<AnswerRequest | null>(null);

  // 問題が切り替わったら経過時間の起点をリセット(初回マウント時も effect が起点を設定する)
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [state.index]);

  if (state.phase === "summary") {
    return <DrillSummaryView results={state.results} remainingAfterSession={remainingAfterSession} />;
  }

  const item = state.items[state.index];
  const cur = state.current;

  async function send(req: AnswerRequest) {
    lastRequestRef.current = req;
    try {
      const res = await fetch("/api/answers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      });
      const body: unknown = await res.json().catch(() => null);
      dispatch(classifyAnswerResponse(res.status, body));
    } catch {
      dispatch({ type: "SAVE_FAIL", message: "ネットワークに接続できません" });
    }
  }

  const baseRequest = () => {
    // 起点未設定(effect 前の操作)や int4 を超える値(タブ長期放置)は null にする。
    // 範囲外を送ると DB 制約で保存が恒久 500 になり Retry でも回復しないため(Codex P2 対応)
    const elapsed = startedAtRef.current > 0 ? Date.now() - startedAtRef.current : null;
    return {
      attempt_id: crypto.randomUUID(),
      question_id: item.questionId,
      question_rev: item.rev,
      mode: "drill" as const,
      elapsed_ms: elapsed !== null && elapsed <= 2_147_483_647 ? elapsed : null,
    };
  };

  function onRate(rating: FlashRating) {
    const common = baseRequest();
    dispatch({ type: "RATE", rating, attemptId: common.attempt_id, elapsedMs: common.elapsed_ms });
    void send({ ...common, kind: "flash", rating });
  }

  function onChoose(label: string) {
    const common = baseRequest();
    dispatch({ type: "CHOOSE", label, attemptId: common.attempt_id, elapsedMs: common.elapsed_ms });
    void send({ ...common, kind: "mcq", chosen: [label] });
  }

  function onSubmitMulti(chosen: string[]) {
    const common = baseRequest();
    dispatch({ type: "SUBMIT", attemptId: common.attempt_id, elapsedMs: common.elapsed_ms });
    void send({ ...common, kind: "mcq", chosen });
  }

  function onRetry() {
    const req = lastRequestRef.current;
    if (!req) return;
    dispatch({ type: "RETRY" });
    void send(req);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-8 pt-4">
      {/* 上部バー: 戻る / 進捗 n/N / 悪問フラグメニュー */}
      <header className="flex items-center justify-between gap-2">
        <Link href="/" aria-label="Home へ戻る" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft aria-hidden />
        </Link>
        <p className="font-mono text-sm tabular-nums text-muted-foreground">
          {Math.min(state.index + 1, state.items.length)} <span className="text-muted-foreground/60">/ {state.items.length}</span>
        </p>
        <QuestionMenu
          questionId={item.questionId}
          questionRev={item.rev}
          initiallyFlagged={false}
          onFlagged={() => dispatch({ type: "FLAGGED" })}
        />
      </header>

      <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${(state.index / state.items.length) * 100}%` }}
        />
      </div>

      {/* 問題カード */}
      <section className="mt-6 flex flex-1 flex-col gap-4">
        {item.type === "flash" ? (
          <FlashCard item={item} cur={cur} onFlip={() => dispatch({ type: "FLIP" })} onRate={onRate} />
        ) : (
          <McqCard
            item={item}
            cur={cur}
            onChoose={onChoose}
            onToggle={(label) => dispatch({ type: "TOGGLE", label })}
            onSubmit={onSubmitMulti}
          />
        )}

        {cur.step === "answered" ? <ExplanationBlock item={item} /> : null}
      </section>

      {/* 保存状態とナビゲーション(厳密 ACK) */}
      <footer className="sticky bottom-0 mt-6 flex flex-col gap-2 bg-background/95 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur">
        {cur.step === "answered" ? (
          <>
            {cur.save === "failed" ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
                <span className="text-red-600 dark:text-red-400">保存に失敗しました</span>
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RotateCcw data-icon="inline-start" aria-hidden />
                  Retry
                </Button>
              </div>
            ) : null}
            <Button
              size="lg"
              className="h-12 w-full text-base"
              disabled={!canNext(state)}
              onClick={() => dispatch({ type: "NEXT" })}
            >
              {cur.save === "saving" ? (
                <>
                  <LoaderCircle className="animate-spin motion-reduce:animate-none" data-icon="inline-start" aria-hidden />
                  保存中…
                </>
              ) : (
                "Next"
              )}
            </Button>
          </>
        ) : cur.step === "rejected" ? (
          <div className="flex flex-col gap-2">
            <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {REJECT_MESSAGES[cur.reason]}
            </p>
            {cur.reason === "not_eligible" ? (
              <Button size="lg" className="h-12 w-full text-base" onClick={() => dispatch({ type: "SKIP" })}>
                スキップして次へ
              </Button>
            ) : cur.reason === "unauthorized" ? (
              <a href="/login" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base")}>
                ログインへ
              </a>
            ) : (
              <Button size="lg" className="h-12 w-full text-base" onClick={() => window.location.reload()}>
                再読込する
              </Button>
            )}
          </div>
        ) : null}
      </footer>
    </main>
  );
}

/** flash: タップ裏返し → Again / Hard / Good / Easy(評価 = 送信) */
function FlashCard({
  item,
  cur,
  onFlip,
  onRate,
}: {
  item: DrillItem;
  cur: ItemStep;
  onFlip: () => void;
  onRate: (rating: FlashRating) => void;
}) {
  const showBack = cur.step !== "front";
  const rated = cur.step === "answered" && cur.local.kind === "flash" ? cur.local.rating : null;
  return (
    <>
      {cur.step === "front" ? (
        <button
          type="button"
          onClick={onFlip}
          className="flex min-h-56 flex-1 flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-card p-6 text-left transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
        >
          <p className="text-lg font-medium leading-relaxed">{item.stemEn}</p>
          <span className="self-center text-sm text-muted-foreground">タップして答えを表示</span>
        </button>
      ) : (
        <div className="flex min-h-56 flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          <p className="text-lg font-medium leading-relaxed">{item.stemEn}</p>
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="text-xs text-muted-foreground">Answer</p>
            <p className="mt-1 font-medium">{item.answerEn}</p>
          </div>
        </div>
      )}
      {showBack ? (
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="自己評価">
          {RATING_BUTTONS.map(({ rating, label, className }) => (
            <Button
              key={rating}
              variant="ghost"
              className={cn("h-12 text-sm font-semibold", className, rated === rating && "ring-2 ring-ring")}
              disabled={cur.step !== "back"}
              onClick={() => onRate(rating)}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** MCQ: 単一は選択 = 即採点 = 送信、複数(Select TWO 等)はトグル + Answer */
function McqCard({
  item,
  cur,
  onChoose,
  onToggle,
  onSubmit,
}: {
  item: DrillItem;
  cur: ItemStep;
  onChoose: (label: string) => void;
  onToggle: (label: string) => void;
  onSubmit: (chosen: string[]) => void;
}) {
  const isMulti = item.type === "mcq_multi";
  const chosen =
    cur.step === "choosing" ? cur.chosen : cur.step === "answered" && cur.local.kind === "mcq" ? cur.local.chosen : [];
  const answered = cur.step === "answered";
  const answerSet = new Set(item.answer ?? []);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-lg font-medium leading-relaxed">{item.stemEn}</p>
      </div>
      {answered && cur.local.kind === "mcq" ? (
        <p
          className={cn(
            "flex items-center gap-2 text-sm font-semibold",
            cur.local.isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
          )}
          role="status"
        >
          {cur.local.isCorrect ? <CircleCheck className="size-4" aria-hidden /> : <CircleX className="size-4" aria-hidden />}
          {cur.local.isCorrect ? "正解" : "不正解"}
        </p>
      ) : null}
      <div className="flex flex-col gap-2" role="group" aria-label="選択肢">
        {(item.choices ?? []).map(({ label, textEn }) => {
          const picked = chosen.includes(label);
          const correct = answerSet.has(label);
          return (
            <button
              key={label}
              type="button"
              disabled={cur.step !== "choosing"}
              aria-pressed={picked}
              onClick={() => (isMulti ? onToggle(label) : onChoose(label))}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                !answered && "border-border bg-card hover:bg-muted/60",
                !answered && picked && "border-primary bg-primary/5",
                answered && correct && "border-emerald-500/60 bg-emerald-500/10",
                answered && picked && !correct && "border-red-500/60 bg-red-500/10",
                answered && !picked && !correct && "border-border opacity-60",
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border font-mono text-xs font-semibold">
                {picked && isMulti && !answered ? <Check className="size-3.5" aria-hidden /> : label}
              </span>
              <span className="flex-1 leading-snug">{textEn}</span>
              {answered && correct ? <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden /> : null}
              {answered && picked && !correct ? <X className="size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      {isMulti && cur.step === "choosing" ? (
        <Button size="lg" className="h-12 w-full text-base" disabled={chosen.length === 0} onClick={() => onSubmit(chosen)}>
          Answer
        </Button>
      ) : null}
    </div>
  );
}

/** 解説(日本語)+ refs。回答直後に表示(保存 ACK は待たない) */
function ExplanationBlock({ item }: { item: DrillItem }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed">
      <p className="whitespace-pre-wrap">{item.explanationJa}</p>
      <ul className="mt-3 flex flex-col gap-1">
        {item.refs.map((url) => (
          <li key={url}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** サマリ(specs/05 S-3: flash は rating 分布、MCQ のみ正答率) */
function DrillSummaryView({
  results,
  remainingAfterSession,
}: {
  results: readonly DrillResult[];
  remainingAfterSession: number;
}) {
  const summary = summarize(results);
  const flashTotal = (Object.values(summary.flashRatings) as number[]).reduce((a, b) => a + b, 0);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-8 px-5 py-10">
      <header className="text-center">
        <h1 className="text-lg font-semibold">セッション完了</h1>
        <p className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">
          {results.length} 問{summary.skipped > 0 ? `(スキップ ${summary.skipped})` : ""}
        </p>
      </header>

      {flashTotal > 0 ? (
        <section aria-label="フラッシュの評価分布" className="flex flex-col gap-2">
          {RATING_BUTTONS.map(({ rating, label, className }) => {
            const count = summary.flashRatings[rating];
            return (
              <div key={rating} className="flex items-center gap-3 text-sm">
                <span className={cn("w-14 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold", className)}>{label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${flashTotal ? (count / flashTotal) * 100 : 0}%` }} />
                </div>
                <span className="w-6 text-right font-mono tabular-nums">{count}</span>
              </div>
            );
          })}
        </section>
      ) : null}

      {summary.mcqTotal > 0 ? (
        <section aria-label="MCQ の正答率" className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">MCQ 正答率</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
            {Math.round((summary.mcqCorrect / summary.mcqTotal) * 100)}
            <span className="text-base font-normal text-muted-foreground">%</span>
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
            {summary.mcqCorrect} / {summary.mcqTotal}
          </p>
        </section>
      ) : null}

      <footer className="flex flex-col gap-2">
        {remainingAfterSession > 0 ? (
          // 通常ナビだと RSC がキャッシュされ得るため、a 要素でサーバー再構築を強制する
          <a href="/drill" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base")}>
            残り {remainingAfterSession} 問 — 次のセッションを開始
          </a>
        ) : null}
        <Link
          href="/"
          className={cn(buttonVariants({ variant: remainingAfterSession > 0 ? "outline" : "default", size: "lg" }), "h-12 w-full text-base")}
        >
          Home へ戻る
        </Link>
      </footer>
    </main>
  );
}

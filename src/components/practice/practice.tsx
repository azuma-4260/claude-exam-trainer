"use client";

import { useEffect, useReducer, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CircleCheck, CircleX, LoaderCircle, RotateCcw, X } from "lucide-react";
import { QuestionMenu } from "@/components/question-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { classifyAnswerResponse, type RejectReason } from "@/lib/answer/ack";
import type { AnswerRequest } from "@/lib/answer/schema";
import type { MockScenarioDto } from "@/lib/mock/dto";
import {
  canNext,
  initialPracticeState,
  practiceReducer,
  type PracticeStep,
} from "@/lib/practice/machine";
import type { PracticeItem } from "@/lib/practice/serve";
import { cn } from "@/lib/utils";

/**
 * S-4 Practice(specs/05)。状態はすべて純関数 reducer(src/lib/practice/machine.ts)が持ち、
 * このコンポーネントは描画と I/O(POST /api/answers、attemptId 生成、経過時間計測)だけを担う。
 * S-3 との差分: 単一選択でも「選択 → Answer」で確定 / シナリオ本文の折りたたみ / 解放バッジ。
 * 厳密 ACK は S-3 と同一(保存 ACK まで Next disabled、失敗は同一 attempt_id で Retry)。
 */

const REJECT_MESSAGES: Record<RejectReason, string> = {
  bad_request: "この回答は受け付けられませんでした。ページを再読込してください。",
  unauthorized: "セッションの有効期限が切れました。ログインし直してください。",
  unknown_question: "問題が更新されました。ページを再読込してください。",
  stale_question_rev: "問題が更新されました。ページを再読込してください。",
  attempt_payload_mismatch: "この回答は受け付けられませんでした。ページを再読込してください。",
  not_eligible: "この問題は出題対象から外れました(フラグ済みなど)。スキップして次へ進めます。",
};

export function Practice({
  items,
  scenarios,
  remainingAfterBatch,
}: {
  items: PracticeItem[];
  scenarios: MockScenarioDto[];
  remainingAfterBatch: number;
}) {
  const [state, dispatch] = useReducer(practiceReducer, items, initialPracticeState);
  const startedAtRef = useRef(0);
  const lastRequestRef = useRef<AnswerRequest | null>(null);

  // 問題が切り替わったら経過時間の起点をリセット(初回マウント時も effect が起点を設定する)
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [state.index]);

  if (state.phase === "done") {
    const mcq = state.results.filter((r) => r.kind === "mcq");
    const correct = mcq.filter((r) => r.kind === "mcq" && r.isCorrect).length;
    const skipped = state.results.length - mcq.length;
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-8 px-5 py-10">
        <header className="text-center">
          <h1 className="text-lg font-semibold">バッチ完了</h1>
          <p className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">
            {state.results.length} 問{skipped > 0 ? `(スキップ ${skipped})` : ""}
          </p>
        </header>
        {mcq.length > 0 ? (
          <section aria-label="正答率" className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground">正答率</p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
              {Math.round((correct / mcq.length) * 100)}
              <span className="text-base font-normal text-muted-foreground">%</span>
            </p>
            <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
              {correct} / {mcq.length}
            </p>
          </section>
        ) : null}
        <footer className="flex flex-col gap-2">
          {remainingAfterBatch > 0 ? (
            // 通常ナビだと RSC がキャッシュされ得るため、a 要素でサーバー再構築を強制する
            <a href="/practice" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base")}>
              残り {remainingAfterBatch} 問 — 次のバッチを開始
            </a>
          ) : null}
          <Link
            href="/study"
            className={cn(
              buttonVariants({ variant: remainingAfterBatch > 0 ? "outline" : "default", size: "lg" }),
              "h-12 w-full text-base",
            )}
          >
            Study へ戻る
          </Link>
        </footer>
      </main>
    );
  }

  const item = state.items[state.index];
  const cur = state.current;
  const scenario = item.scenarioId ? (scenarios.find((s) => s.id === item.scenarioId) ?? null) : null;

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

  function onAnswer() {
    if (cur.step !== "choosing" || cur.chosen.length === 0) return;
    // 起点未設定(effect 前の操作)や int4 を超える値(タブ長期放置)は null にする(S-3 と同じ理由)
    const elapsed = startedAtRef.current > 0 ? Date.now() - startedAtRef.current : null;
    const req: AnswerRequest = {
      attempt_id: crypto.randomUUID(),
      question_id: item.questionId,
      question_rev: item.rev,
      mode: "practice",
      elapsed_ms: elapsed !== null && elapsed <= 2_147_483_647 ? elapsed : null,
      kind: "mcq",
      chosen: cur.chosen,
    };
    dispatch({ type: "ANSWER", attemptId: req.attempt_id, elapsedMs: req.elapsed_ms ?? null });
    void send(req);
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
        <Link href="/study" aria-label="Study へ戻る" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
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

      <section className="mt-6 flex flex-1 flex-col gap-4">
        {/* シナリオ本文の折りたたみ(05 S-4)。scenarios.yaml 未整備なら id 見出しのみに縮退 */}
        {scenario ? (
          <section className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{scenario.title_en ?? scenario.id}</p>
            {scenario.context_en && (
              <details className="mt-1">
                <summary className="cursor-pointer text-muted-foreground">シナリオ本文</summary>
                <p className="mt-2 whitespace-pre-line">{scenario.context_en}</p>
              </details>
            )}
          </section>
        ) : null}

        <PracticeMcqCard item={item} cur={cur} onToggle={(label) => dispatch({ type: "TOGGLE", label })} />

        {cur.step === "answered" ? (
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
        ) : null}
      </section>

      {/* 保存状態とナビゲーション(厳密 ACK、S-3 と同一) */}
      <footer className="sticky bottom-0 mt-6 flex flex-col gap-2 bg-background/95 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur">
        {cur.step === "choosing" ? (
          <Button size="lg" className="h-12 w-full text-base" disabled={cur.chosen.length === 0} onClick={onAnswer}>
            Answer
          </Button>
        ) : cur.step === "answered" ? (
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
        ) : (
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
        )}
      </footer>
    </main>
  );
}

/** MCQ カード(S-4): 単一・複数とも選択をトグルし、フッターの Answer で確定する */
function PracticeMcqCard({
  item,
  cur,
  onToggle,
}: {
  item: PracticeItem;
  cur: PracticeStep;
  onToggle: (label: string) => void;
}) {
  const chosen = cur.step === "choosing" ? cur.chosen : cur.step === "answered" ? cur.chosen : [];
  const answered = cur.step === "answered";
  const answerSet = new Set(item.answer);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        {item.released ? (
          <p className="mb-2">
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">模試出題済み</span>
          </p>
        ) : null}
        <p className="text-lg font-medium leading-relaxed">{item.stemEn}</p>
        {item.type === "mcq_multi" ? (
          <p className="mt-2 text-xs text-muted-foreground">Select {item.answer.length}.</p>
        ) : null}
      </div>
      {answered && cur.step === "answered" ? (
        <p
          className={cn(
            "flex items-center gap-2 text-sm font-semibold",
            cur.isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
          )}
          role="status"
        >
          {cur.isCorrect ? <CircleCheck className="size-4" aria-hidden /> : <CircleX className="size-4" aria-hidden />}
          {cur.isCorrect ? "正解" : "不正解"}
        </p>
      ) : null}
      <div className="flex flex-col gap-2" role="group" aria-label="選択肢">
        {item.choices.map(({ label, textEn }) => {
          const picked = chosen.includes(label);
          const correct = answerSet.has(label);
          return (
            <button
              key={label}
              type="button"
              disabled={cur.step !== "choosing"}
              aria-pressed={picked}
              onClick={() => onToggle(label)}
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
                {picked && !answered ? <Check className="size-3.5" aria-hidden /> : label}
              </span>
              <span className="flex-1 leading-snug">{textEn}</span>
              {answered && correct ? <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden /> : null}
              {answered && picked && !correct ? <X className="size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

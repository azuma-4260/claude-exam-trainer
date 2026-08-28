"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import type { MockAnswerDto, MockQuestionDto, MockScenarioDto, MockSessionDto } from "@/lib/mock/dto";

/**
 * S-5 試験中画面(specs/05、01 FR-5)。
 * - 残り時間は deadline_at - now の毎秒再計算のみ(サーバー確定の絶対時刻が正)
 * - 回答・見直しフラグ・現在位置は操作ごとに即時保存。保存はセッション単位の FIFO で直列化し、
 *   未完了・失敗中の保存がある間は提出できない(提出は全 ACK 後のみ)
 * - 期限超過をクライアントで検知したら submit を叩く(timeout 判定はサーバーが行う)
 * - 採点・解説は提出まで非表示(DTO に正解が含まれない)
 */

interface LoadedData {
  session: MockSessionDto;
  answers: MockAnswerDto[];
  questions: MockQuestionDto[];
  scenarios: MockScenarioDto[];
}

interface AnswerState {
  chosen: string[] | null;
  flagged: boolean;
}

type Phase =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "error"; message: string }
  | { kind: "exam" }
  | { kind: "submitted"; session: MockSessionDto };

const fmtRemaining = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export function MockExamScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [data, setData] = useState<LoadedData | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [index, setIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [pendingSaves, setPendingSaves] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);

  // --- 保存キュー(FIFO・直列)。失敗したら先頭タスクを残して停止し、retry で再開する ---
  const queue = useRef<{ tasks: (() => Promise<Response>)[]; running: boolean; failed: boolean }>({
    tasks: [],
    running: false,
    failed: false,
  });
  const submitRef = useRef<(auto: boolean) => Promise<void>>(async () => {});

  const pump = useCallback(async () => {
    const q = queue.current;
    if (q.running || q.failed) return;
    q.running = true;
    try {
      while (q.tasks.length > 0) {
        let res: Response;
        try {
          res = await q.tasks[0]();
        } catch {
          q.failed = true;
          setSaveFailed(true);
          return;
        }
        if (res.status === 409) {
          // 並行して terminal 化(期限超過の timeout 提出等)。残タスクは意味を失う
          q.tasks = [];
          setPendingSaves(0);
          await submitRef.current(true); // 提出済みなら replayed=true で結果が返る
          return;
        }
        if (!res.ok) {
          q.failed = true;
          setSaveFailed(true);
          return;
        }
        q.tasks.shift();
        setPendingSaves(q.tasks.length);
      }
    } finally {
      q.running = false;
    }
  }, []);

  const enqueue = useCallback(
    (task: () => Promise<Response>) => {
      queue.current.tasks.push(task);
      setPendingSaves(queue.current.tasks.length);
      void pump();
    },
    [pump],
  );

  const retrySaves = useCallback(() => {
    queue.current.failed = false;
    setSaveFailed(false);
    void pump();
  }, [pump]);

  // --- 復元 ---
  useEffect(() => {
    let alive = true;
    fetch("/api/mock/sessions/current")
      .then(async (res) => {
        if (!alive) return;
        if (res.status === 204) return setPhase({ kind: "none" });
        if (!res.ok) return setPhase({ kind: "error", message: `復元に失敗しました(${res.status})` });
        const body = await res.json();
        if (body.kind === "timed_out") return setPhase({ kind: "submitted", session: body.session });
        const loaded: LoadedData = body;
        setData(loaded);
        setAnswers(Object.fromEntries(loaded.answers.map((a) => [a.question_id, { chosen: a.chosen, flagged: a.flagged }])));
        setIndex(Math.min(loaded.session.current_index, loaded.questions.length - 1));
        setPhase({ kind: "exam" });
      })
      .catch(() => alive && setPhase({ kind: "error", message: "復元に失敗しました(通信エラー)" }));
    return () => {
      alive = false;
    };
  }, []);

  // --- 提出(manual / 期限検知)。timeout かどうかの確定はサーバー ---
  // 失敗しても phase は exam のまま残し、既知の session ID への冪等 submit を
  // 再試行できるバナーを出す(応答喪失時も再送で 200 replayed が返り結果に到達できる)
  const submit = useCallback(
    async (auto: boolean) => {
      if (!data) return;
      void auto;
      setSubmitting(true);
      try {
        const res = await fetch(`/api/mock/sessions/${data.session.id}/submit`, { method: "POST" });
        if (res.ok) {
          const body = await res.json();
          setSubmitFailed(false);
          setPhase({ kind: "submitted", session: body.session });
          return;
        }
        setSubmitFailed(true);
      } catch {
        setSubmitFailed(true);
      } finally {
        setSubmitting(false);
      }
    },
    [data],
  );
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  // --- 提出直後にレポートへ遷移(05 S-6)。timeout 提出の復元検知も同じ経路 ---
  useEffect(() => {
    if (phase.kind === "submitted") router.replace(`/mock/report/${phase.session.id}`);
  }, [phase, router]);

  // --- 残り時間(毎秒再計算)と期限超過検知 ---
  const timedOutFired = useRef(false);
  useEffect(() => {
    if (phase.kind !== "exam" || !data?.session.deadline_at) return;
    const deadline = new Date(data.session.deadline_at).getTime();
    const tick = () => {
      const rest = deadline - Date.now();
      setRemainingMs(rest);
      if (rest <= 0 && !timedOutFired.current) {
        timedOutFired.current = true;
        void submitRef.current(true);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [phase.kind, data]);

  // --- 操作(即時保存) ---
  const patchAnswer = useCallback(
    (questionId: string, patch: Partial<AnswerState>) => {
      if (!data) return;
      setAnswers((prev) => {
        const cur = prev[questionId] ?? { chosen: null, flagged: false };
        return { ...prev, [questionId]: { ...cur, ...patch } };
      });
      const body: Record<string, unknown> = {};
      if (patch.chosen !== undefined) body.chosen = patch.chosen;
      if (patch.flagged !== undefined) body.flagged = patch.flagged;
      enqueue(() =>
        fetch(`/api/mock/sessions/${data.session.id}/answers/${questionId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
    },
    [data, enqueue],
  );

  const choose = (q: MockQuestionDto, label: string) => {
    const current = answers[q.id]?.chosen ?? null;
    let next: string[] | null;
    if (q.type === "mcq_single") {
      next = current?.[0] === label ? null : [label];
    } else {
      const set = new Set(current ?? []);
      if (set.has(label)) set.delete(label);
      else set.add(label);
      next = set.size === 0 ? null : [...set].sort();
    }
    patchAnswer(q.id, { chosen: next });
  };

  const goTo = useCallback(
    (i: number) => {
      if (!data) return;
      setIndex(i);
      setConfirming(false);
      enqueue(() =>
        fetch(`/api/mock/sessions/${data.session.id}/position`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ current_index: i }),
        }),
      );
    },
    [data, enqueue],
  );

  // --- 表示 ---
  if (phase.kind === "loading") return <Centered>読み込み中…</Centered>;
  if (phase.kind === "none")
    return (
      <Centered>
        進行中の模試はありません。
        <Link href="/mock" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
          Mock 開始画面へ
        </Link>
      </Centered>
    );
  if (phase.kind === "error")
    return (
      <Centered>
        <p className="text-destructive">{phase.message}</p>
        <Button variant="outline" className="mt-4" onClick={() => location.reload()}>
          再読み込み
        </Button>
      </Centered>
    );
  if (phase.kind === "submitted") {
    // router.replace で S-6 レポートへ遷移中。遷移が失敗したときのためリンクも出す
    const s = phase.session;
    return (
      <Centered>
        <h1 className="text-xl font-semibold">提出しました</h1>
        {s.submission_reason === "timeout" && <p className="mt-1 text-sm text-muted-foreground">制限時間超過のため自動提出されました</p>}
        <p className="mt-2 text-sm text-muted-foreground">レポートへ移動しています…</p>
        <Link href={`/mock/report/${s.id}`} className={buttonVariants({ variant: "outline", className: "mt-6" })}>
          レポートを開く
        </Link>
      </Centered>
    );
  }

  if (!data) return null;
  const { session, questions, scenarios } = data;
  const q = questions[index];
  const state = answers[q.id] ?? { chosen: null, flagged: false };
  const scenario = q.scenario_id ? scenarios.find((s) => s.id === q.scenario_id) : undefined;
  const answeredCount = questions.filter((qq) => (answers[qq.id]?.chosen ?? null) !== null).length;
  const savesBlocked = pendingSaves > 0 || saveFailed;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {index + 1} / {questions.length}(回答済 {answeredCount})
        </span>
        <span
          className={`rounded-md border px-2 py-1 font-mono text-lg tabular-nums ${remainingMs !== null && remainingMs < 5 * 60_000 ? "border-destructive text-destructive" : ""}`}
          aria-label="残り時間"
        >
          {remainingMs === null ? "--:--" : fmtRemaining(remainingMs)}
        </span>
      </header>

      {scenario && (
        <section className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium">{scenario.title_en ?? scenario.id}</p>
          {scenario.context_en && (
            <details className="mt-1">
              <summary className="cursor-pointer text-muted-foreground">シナリオ本文</summary>
              <p className="mt-2 whitespace-pre-line">{scenario.context_en}</p>
            </details>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="whitespace-pre-line font-medium">{q.stem_en}</p>
          <Button
            variant={state.flagged ? "default" : "outline"}
            size="sm"
            aria-pressed={state.flagged}
            onClick={() => patchAnswer(q.id, { flagged: !state.flagged })}
          >
            {state.flagged ? "🚩 見直す" : "🏳 フラグ"}
          </Button>
        </div>
        {q.type === "mcq_multi" && <p className="text-xs text-muted-foreground">{q.select_count} つ選択</p>}
        <div className="flex flex-col gap-2">
          {q.choices.map((c) => {
            const selected = state.chosen?.includes(c.label) ?? false;
            return (
              <button
                key={c.label}
                type="button"
                aria-pressed={selected}
                onClick={() => choose(q, c.label)}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${selected ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}
              >
                <span className="mr-2 font-semibold">{c.label}.</span>
                {c.text_en}
              </button>
            );
          })}
        </div>
      </section>

      <nav className="flex items-center justify-between">
        <Button variant="outline" disabled={index === 0} onClick={() => goTo(index - 1)}>
          ← 前へ
        </Button>
        <Button variant="outline" disabled={index === questions.length - 1} onClick={() => goTo(index + 1)}>
          次へ →
        </Button>
      </nav>

      <section aria-label="問題一覧" className="grid grid-cols-10 gap-1">
        {questions.map((qq, i) => {
          const a = answers[qq.id];
          const answered = (a?.chosen ?? null) !== null;
          return (
            <button
              key={qq.id}
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === index}
              title={`${i + 1}${a?.flagged ? "(フラグ)" : ""}`}
              className={`relative h-8 rounded border text-xs tabular-nums ${i === index ? "ring-2 ring-ring" : ""} ${answered ? "bg-primary text-primary-foreground" : "bg-background"}`}
            >
              {i + 1}
              {a?.flagged && <span className="absolute -right-0.5 -top-1 text-[10px]">🚩</span>}
            </button>
          );
        })}
      </section>

      <footer className="mt-auto flex flex-col gap-2 border-t pt-3">
        {submitFailed && (
          <div className="flex items-center justify-between rounded-md border border-destructive p-2 text-sm">
            <span className="text-destructive">提出に失敗しました(通信エラーの可能性)</span>
            <Button size="sm" disabled={submitting} onClick={() => void submit(false)}>
              提出を再試行
            </Button>
          </div>
        )}
        {saveFailed ? (
          <div className="flex items-center justify-between rounded-md border border-destructive p-2 text-sm">
            <span className="text-destructive">保存に失敗しました。再試行してください</span>
            <Button size="sm" variant="outline" onClick={retrySaves}>
              保存を再試行
            </Button>
          </div>
        ) : (
          pendingSaves > 0 && <p className="text-xs text-muted-foreground">保存中…({pendingSaves})</p>
        )}
        {confirming ? (
          <div className="flex items-center justify-between gap-2 rounded-md border p-2">
            <span className="text-sm">
              未回答 {questions.length - answeredCount} 問のまま提出します。よろしいですか?
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
                戻る
              </Button>
              <Button size="sm" disabled={savesBlocked || submitting} onClick={() => void submit(false)}>
                提出を確定
              </Button>
            </div>
          </div>
        ) : (
          <Button disabled={savesBlocked || submitting} onClick={() => setConfirming(true)}>
            提出する
          </Button>
        )}
        {savesBlocked && <p className="text-xs text-muted-foreground">未保存の操作がある間は提出できません(全 ACK 後に有効になります)</p>}
        {session.kind === "full" && <p className="text-xs text-muted-foreground">フル模試は一時停止・破棄できません。閉じても再開できますが時計は進みます。</p>}
      </footer>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">{children}</main>;
}

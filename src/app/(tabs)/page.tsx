import Link from "next/link";
import { CircleAlert, TriangleAlert } from "lucide-react";
import { ProgressRing } from "@/components/progress-ring";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { loadQueueView } from "@/lib/queue/serve";
import { cn } from "@/lib/utils";

/**
 * S-1 Home(specs/05)。カウントダウン + 進捗リング(予算消化)、ノルマ/バックログ分離、
 * CTA 1 ボタン、pace_warning 時のみ警告カード。推奨行動カード(9/20〜)は D5-1。
 * DB を読むため常に動的レンダリング(ビルド時に DATABASE_URL を要求しない)。
 */
export const dynamic = "force-dynamic";

const min = (sec: number) => Math.round(sec / 60);

export default async function HomePage() {
  const view = await loadQueueView(getDb(), new Date());
  const spentMin = min(view.spentTodaySec);
  const budgetMin = min(view.budgetSec);
  const canStart = view.kind === "ok" && view.session.kind === "ok";

  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="font-mono text-sm font-semibold tracking-[0.2em] text-muted-foreground md:hidden">CCAR-F</h1>
        <p className="text-sm text-muted-foreground">試験日 2026-09-27</p>
      </header>

      {/* シグネチャ: 45 分予算リングの中心に試験カウントダウンを重ねた計器 */}
      <section aria-label="今日の進捗" className="flex flex-col items-center gap-2 py-2">
        <ProgressRing fraction={view.spentTodaySec / view.budgetSec} size={216}>
          <span className="font-mono text-5xl font-bold tabular-nums leading-none">{view.daysLeft}</span>
          <span className="mt-1 text-xs text-muted-foreground">days to exam</span>
          <span className="mt-3 font-mono text-sm tabular-nums text-muted-foreground">
            {spentMin} <span className="text-muted-foreground/60">/ {budgetMin} min</span>
          </span>
        </ProgressRing>
      </section>

      {view.kind === "d_minus_1_unavailable" ? (
        <section className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-medium">前日(D-1)メニューは準備中です</p>
          <p className="mt-1 text-muted-foreground">
            間違いノート優先の前日キューは D5-1 で実装されます。今日は通常キューを配信しません。
          </p>
        </section>
      ) : view.bankEmpty ? (
        <section className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          問題バンクがまだ登録されていません。バンクが配信されると今日のキューが表示されます。
        </section>
      ) : (
        <>
          {/* ノルマとバックログの分離表示(specs/01 FR-6) */}
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">今日のノルマ</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                {min(view.totalEstSec)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">min</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Drill {view.drillTotal} 問
                {view.deferredPracticeCount > 0 ? ` + シナリオ ${view.deferredPracticeCount} 問` : ""}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">バックログ</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                {view.dueBacklogCount}
                <span className="ml-1 text-sm font-normal text-muted-foreground">問</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">予算外・明日以降に回収</p>
            </div>
          </section>

          {view.pace?.paceWarning ? (
            <section className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <div>
                <p className="font-medium">新規導入が上限を超えるペースです</p>
                <p className="mt-1 text-muted-foreground">
                  残り {view.pace.remainingNew} 問を消化するには 1 日 {view.pace.requiredNew} 問が必要ですが、上限は
                  40 問です。学習日数を増やすことを検討してください。
                </p>
              </div>
            </section>
          ) : null}

          {view.deferredPracticeCount > 0 ? (
            // CTA 1 ボタン(S-1)は維持し、シナリオ課題への導線は補助リンクとして添える(D2-1)
            <Link
              href="/practice"
              className="flex items-center gap-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              <CircleAlert className="size-3.5 shrink-0" aria-hidden />
              シナリオ演習 {view.deferredPracticeCount} 問は Practice 画面で実施する
            </Link>
          ) : null}

          {/* CTA は 1 ボタンのみ(specs/05 S-1) */}
          {canStart ? (
            <Link href="/drill" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base")}>
              今日のキューを始める
            </Link>
          ) : (
            <div className="flex flex-col gap-2">
              <span
                aria-disabled="true"
                className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base opacity-50 pointer-events-none")}
              >
                今日のキューを始める
              </span>
              <p className="text-center text-xs text-muted-foreground">
                {view.session.kind === "below_session_min"
                  ? `残り ${view.session.count} 問は 5 問に満たないため、次回のキューに持ち越します`
                  : view.drillTotal === 0 && view.deferredPracticeCount > 0
                    ? "今日の Drill 分は完了しています(残りはシナリオ演習のみ)"
                    : "今日の Drill は完了しました"}
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}

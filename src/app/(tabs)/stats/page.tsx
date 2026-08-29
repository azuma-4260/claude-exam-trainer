import Link from "next/link";
import { BarChart3, CalendarDays, ChevronRight, Settings } from "lucide-react";
import { getDb } from "@/db/client";
import { loadStatsView } from "@/lib/stats/load";

/** S-8 Stats。優先度低のため、ライブラリを追加せず棒と一覧で簡潔に表示する。 */
export const dynamic = "force-dynamic";

const percent = (value: number) => Math.round(value * 100);

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(new Date(iso));

export default async function StatsPage() {
  const view = await loadStatsView(getDb());
  const days = view.dailyAnswers.slice(-14);
  const maxDaily = Math.max(1, ...days.map((day) => day.count));

  return (
    <main className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5" aria-hidden />
            <h1 className="text-xl font-semibold">Stats</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">学習の蓄積と模試の推移</p>
        </div>
        <Link
          href="/settings"
          aria-label="設定を開く"
          className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="size-5" aria-hidden />
        </Link>
      </header>

      <section aria-labelledby="domain-heading" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="domain-heading" className="font-medium">ドメイン別習熟度</h2>
          <span className="text-xs text-muted-foreground">保持率 70% + カバレッジ 30%</span>
        </div>
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          {view.domains.map((domain) => {
            const value = percent(domain.proficiency);
            return (
              <div key={domain.domainId} className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{domain.domainId.toUpperCase()}</span>
                    <p className="truncate font-medium">{domain.name}</p>
                  </div>
                  <span className="shrink-0 font-mono text-lg font-semibold tabular-nums">{value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">試験比重 {domain.weight}%</span>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="daily-heading" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
          <h2 id="daily-heading" className="font-medium">日別回答数</h2>
        </div>
        {days.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            回答履歴はまだありません。
          </p>
        ) : (
          <div className="flex h-40 items-end gap-2 rounded-xl border border-border bg-card px-4 pb-3 pt-5">
            {days.map((day) => (
              <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className="font-mono text-xs tabular-nums">{day.count}</span>
                <div
                  className="w-full min-w-2 rounded-t bg-primary/80"
                  style={{ height: `${Math.max(8, (day.count / maxDaily) * 88)}px` }}
                  title={`${day.date}: ${day.count} 回答`}
                />
                <span className="text-[10px] tabular-nums text-muted-foreground">{day.date.slice(5).replace("-", "/")}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="mock-heading" className="flex flex-col gap-3">
        <div>
          <h2 id="mock-heading" className="font-medium">模試推移</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">initial と rehearsal は別系列です。</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["initial", "rehearsal"] as const).map((kind) => (
            <article key={kind} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-mono text-sm font-semibold">{kind}</h3>
                <span className="text-xs text-muted-foreground">{view.mockTrends[kind].length} 回</span>
              </div>
              {view.mockTrends[kind].length === 0 ? (
                <p className="mt-5 text-sm text-muted-foreground">まだ受験がありません。</p>
              ) : (
                <ol className="mt-3 flex flex-col gap-2">
                  {view.mockTrends[kind].map((point) => (
                    <li key={point.sessionId}>
                      <Link
                        href={`/mock/report/${point.sessionId}`}
                        className="group flex items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(point.finishedAt)} · {point.formId}
                          </p>
                          <p className="font-mono text-lg font-semibold tabular-nums">
                            {point.percent}%
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              {point.scoreRaw}/{point.total}
                            </span>
                          </p>
                          <div className="relative mt-1.5 h-1.5 overflow-visible rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary/80" style={{ width: `${point.percent}%` }} />
                            <span
                              aria-hidden
                              className="absolute -bottom-0.5 -top-0.5 w-px bg-foreground/70"
                              style={{ left: "85%" }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            重み付き {point.weightedPercent}% · 内部目標 85%
                          </p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

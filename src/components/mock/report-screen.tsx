import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { MockReport, MockReportDomain } from "@/lib/mock/report";

/**
 * S-6 模試レポート(specs/05 S-6、01 FR-5)。server component(誤答の解説展開は details/summary)。
 * - 素点(大)+ 85% ラインのゲージが画面の主役(スケールドスコアは出さない: 決定事項 10)
 * - ドメイン別横棒は素点ゲージと同じ文法(重み併記)
 * - rehearsal はヘッダで明示し readiness 判定外を注記
 */

const pct = (correct: number, total: number): number => (total > 0 ? Math.round((correct / total) * 100) : 0);

const TARGET_PCT = 85;

function fmtFinishedAt(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(
    new Date(iso),
  );
}

/** 素点ゲージ。85% の目標線を tick として重ねる(S-6 のシグネチャ要素) */
function ScoreGauge({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${percent >= TARGET_PCT ? "bg-primary" : "bg-primary/60"}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <div
        aria-hidden
        className="absolute -bottom-1 -top-1 w-0.5 rounded-full bg-foreground/70"
        style={{ left: `${TARGET_PCT}%` }}
      />
    </div>
  );
}

function DomainBar({ d }: { d: MockReportDomain }) {
  const p = pct(d.correct, d.total);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium">{d.name}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {d.total === 0 ? "出題なし" : `${d.correct} / ${d.total}(${p}%)`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        {d.total > 0 && <div className="h-full rounded-full bg-primary/80" style={{ width: `${p}%` }} />}
      </div>
      <span className="text-xs text-muted-foreground">出題比重 {d.weight}%</span>
    </div>
  );
}

export function MockReportScreen({ report }: { report: MockReport }) {
  const percent = pct(report.scoreRaw, report.total);
  const finished = fmtFinishedAt(report.finishedAt);
  const weakest = report.domains.find((d) => d.domainId === report.weakestDomainId) ?? null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-4 pb-10">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">模試レポート</h1>
          {report.formId && <Badge variant="outline">{report.formId}</Badge>}
          {report.rehearsal && <Badge variant="secondary">rehearsal(再受験)</Badge>}
        </div>
        {finished && <p className="text-sm text-muted-foreground">{finished} 提出</p>}
        {report.submissionReason === "timeout" && (
          <p className="text-sm text-muted-foreground">制限時間超過のため自動提出されました</p>
        )}
        {report.rehearsal && (
          <p className="text-sm text-muted-foreground">
            再受験のスコアは rehearsal 扱いで、readiness 判定には使われません。
          </p>
        )}
      </header>

      <section aria-label="素点" className="rounded-lg border p-4">
        <p className="flex items-baseline gap-2">
          <span className="text-5xl font-bold tabular-nums">{percent}%</span>
          <span className="text-base text-muted-foreground tabular-nums">
            {report.scoreRaw} / {report.total}
          </span>
        </p>
        <ScoreGauge percent={percent} className="mt-3" />
        <p className="mt-2 text-xs text-muted-foreground">| 内部目標 {TARGET_PCT}%(スケールドスコアは表示しません)</p>
      </section>

      <section aria-label="ドメイン別" className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">ドメイン別正答率</h2>
        {report.domains.map((d) => (
          <DomainBar key={d.domainId} d={d} />
        ))}
      </section>

      <section aria-label="誤答一覧" className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">
          誤答一覧 <span className="text-base font-normal text-muted-foreground">({report.wrong.length} 問)</span>
        </h2>
        {report.wrong.length === 0 && (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">全問正解です。</p>
        )}
        {report.wrong.map((w) => (
          <details key={w.questionId} className="rounded-lg border">
            <summary className="flex cursor-pointer items-start gap-2 p-3 text-sm">
              <span className="shrink-0 font-semibold tabular-nums">Q{w.position}</span>
              <span className="min-w-0 flex-1">
                {w.stemEn ?? `${w.questionId}(バンクに現行の問題がありません)`}
              </span>
              {w.unanswered && (
                <Badge variant="outline" className="shrink-0">
                  未回答
                </Badge>
              )}
            </summary>
            <div className="flex flex-col gap-3 border-t p-3 text-sm">
              {w.choices && (
                <ul className="flex flex-col gap-1">
                  {w.choices.map((c) => {
                    const isCorrect = w.correct?.includes(c.label) ?? false;
                    const isChosen = w.chosen.includes(c.label);
                    return (
                      <li
                        key={c.label}
                        className={`rounded-md border p-2 ${isCorrect ? "border-primary bg-primary/10" : isChosen ? "border-destructive" : ""}`}
                      >
                        <span className="mr-2 font-semibold">{c.label}.</span>
                        {c.text_en}
                        {isCorrect && <span className="ml-2 text-xs font-medium text-primary">正解</span>}
                        {isChosen && !isCorrect && (
                          <span className="ml-2 text-xs font-medium text-destructive">選択</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {w.explanationJa && <p className="whitespace-pre-line text-muted-foreground">{w.explanationJa}</p>}
              {w.refs.length > 0 && (
                <ul className="flex flex-col gap-0.5">
                  {w.refs.map((r) => (
                    <li key={r}>
                      <a href={r} target="_blank" rel="noreferrer" className="break-all text-xs underline underline-offset-2">
                        {r}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {w.revChanged && (
                <p className="text-xs text-muted-foreground">この問題は受験後に改訂されています(解説は現行版)。</p>
              )}
            </div>
          </details>
        ))}
      </section>

      <section aria-label="次の一手" className="flex flex-col gap-2 border-t pt-4">
        {weakest && (
          <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
            <div>
              <p className="font-medium">弱点ドメインのミニ模試</p>
              <p className="text-sm text-muted-foreground">
                {weakest.name}({pct(weakest.correct, weakest.total)}%)
              </p>
            </div>
            {/* D4-1(ドメイン別ミニ模試)実装後に開始導線へ差し替える */}
            <span className="shrink-0 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">準備中</span>
          </div>
        )}
        <Link href="/mock" className={buttonVariants({ variant: "outline" })}>
          Mock 画面へ戻る
        </Link>
      </section>

      {report.unknownQuestionIds.length > 0 && (
        <p className="text-xs text-destructive">
          バンクに存在しない問題があります: {report.unknownQuestionIds.join(", ")}
        </p>
      )}
    </main>
  );
}

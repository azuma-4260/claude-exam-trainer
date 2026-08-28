import Link from "next/link";
import { ArrowRight, CircleCheck, NotebookPen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { loadMistakesView } from "@/lib/mistakes/load";
import { cn } from "@/lib/utils";

/** S-7 間違いノート。attempt からリクエストごとに導出するためキャッシュしない。 */
export const dynamic = "force-dynamic";

export default async function MistakesPage() {
  const view = await loadMistakesView(getDb());

  return (
    <main className="flex flex-col gap-5">
      <header>
        <div className="flex items-center gap-2">
          <NotebookPen className="size-5" aria-hidden />
          <h1 className="text-lg font-semibold">間違いノート</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Practice と Mock の誤答を、3 回連続で正解するまで自動で追跡します。
        </p>
      </header>

      {view.kind === "empty" ? (
        <section className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
          <CircleCheck className="mx-auto size-8 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <h2 className="mt-3 font-medium">復習する問題はありません</h2>
          <p className="mt-1 text-sm text-muted-foreground">新しい誤答や、卒業後の再誤答があるとここに現れます。</p>
        </section>
      ) : (
        <>
          <section className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-xs text-muted-foreground">復習中</p>
              <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums">
                {view.items.length}
                <span className="ml-1 text-sm font-normal text-muted-foreground">問</span>
              </p>
            </div>
            <Link href="/mistakes/review" className={cn(buttonVariants({ size: "lg" }), "h-12")}>
              総ざらい開始
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Link>
          </section>

          <section aria-label="誤答回数順の問題" className="flex flex-col gap-3">
            {view.items.map((item) => (
              <article key={item.questionId} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-red-500/10 px-2 py-1 font-medium text-red-700 dark:text-red-300">
                    誤答 {item.wrongCount} 回
                  </span>
                  <span className="rounded-md bg-muted px-2 py-1 font-mono tabular-nums text-muted-foreground">
                    連続正解 {item.correctStreak}/3
                  </span>
                  <span className="ml-auto font-mono text-muted-foreground">{item.domainId.toUpperCase()}</span>
                </div>
                {item.released ? (
                  <p className="mt-3 text-xs font-medium text-muted-foreground">模試出題済み</p>
                ) : null}
                <p className="mt-2 text-sm font-medium leading-relaxed">{item.stemEn}</p>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuickDrill } from "@/components/drill/quick-drill";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { loadQueueView } from "@/lib/queue/serve";
import { showExamLabel } from "@/lib/scope/scope";
import { cn } from "@/lib/utils";

/**
 * S-3 Quick Drill(specs/05)。学習中は全画面(タブなし)。
 * キューはリクエスト毎にサーバーで再構築し、セッション分(5〜20 問)を props でクライアントへ渡す。
 * 再読込での復元 = 保存済み attempt がキュー再構築に反映される(クライアント永続化なし)。
 */
export const dynamic = "force-dynamic";

export default async function DrillPage() {
  const view = await loadQueueView(getDb(), new Date());

  if (view.session.kind === "ok") {
    return (
      <QuickDrill
        items={view.session.items}
        remainingAfterSession={view.session.remainingAfterSession}
        showExamLabel={showExamLabel(view.scope)}
      />
    );
  }

  // D-1 で先に Practice(間違いノート)が来る日は、順序を保つため Practice を案内する
  const practiceFirst = view.dMinus1?.nextMode === "practice";
  const message = practiceFirst
    ? "前日メニューは間違いノートから始まります。先に Practice で間違いノートを解いてください。"
    : view.bankEmpty
      ? "問題バンクがまだ登録されていません。"
      : "今日の Drill は完了しました。";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-5">
      <p className="text-center text-sm text-muted-foreground">{message}</p>
      {practiceFirst ? (
        <Link href="/practice" className={cn(buttonVariants())}>
          Practice へ進む
        </Link>
      ) : null}
      <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
        <ArrowLeft data-icon="inline-start" aria-hidden />
        Home へ戻る
      </Link>
    </main>
  );
}

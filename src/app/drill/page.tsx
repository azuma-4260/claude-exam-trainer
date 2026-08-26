import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuickDrill } from "@/components/drill/quick-drill";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { loadQueueView } from "@/lib/queue/serve";
import { cn } from "@/lib/utils";

/**
 * S-3 Quick Drill(specs/05)。学習中は全画面(タブなし)。
 * キューはリクエスト毎にサーバーで再構築し、セッション分(5〜20 問)を props でクライアントへ渡す。
 * 再読込での復元 = 保存済み attempt がキュー再構築に反映される(クライアント永続化なし)。
 */
export const dynamic = "force-dynamic";

export default async function DrillPage() {
  const view = await loadQueueView(getDb(), new Date());

  if (view.kind === "ok" && view.session.kind === "ok") {
    return <QuickDrill items={view.session.items} remainingAfterSession={view.session.remainingAfterSession} />;
  }

  const message =
    view.kind === "d_minus_1_unavailable"
      ? "前日(D-1)メニューは準備中です(D5-1)。今日は通常キューを配信しません。"
      : view.bankEmpty
        ? "問題バンクがまだ登録されていません。"
        : view.session.kind === "below_session_min"
          ? `残り ${view.session.count} 問は 5 問に満たないため、次回のキューに持ち越します。`
          : "今日の Drill は完了しました。";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-5">
      <p className="text-center text-sm text-muted-foreground">{message}</p>
      <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
        <ArrowLeft data-icon="inline-start" aria-hidden />
        Home へ戻る
      </Link>
    </main>
  );
}

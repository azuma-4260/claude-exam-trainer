import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Practice } from "@/components/practice/practice";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { loadPracticeView } from "@/lib/practice/serve";
import { cn } from "@/lib/utils";

/**
 * S-4 Practice(specs/05)。学習中は全画面(タブなし)。
 * バッチはリクエスト毎にサーバーで再構築する: 日次キューの practice 分を最優先し、
 * FR-4 プールの残り(当日回答済みを除く)を追補する(src/lib/practice/serve.ts)。
 */
export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const view = await loadPracticeView(getDb(), new Date());

  if (view.kind === "ok") {
    return <Practice items={view.items} scenarios={view.scenarios} remainingAfterBatch={view.remainingAfterBatch} />;
  }

  const message =
    view.kind === "bank_empty"
      ? "問題バンクがまだ登録されていません。"
      : "今日出題できる Practice 問題はありません(回答済み・holdout 対象を除く)。";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-5">
      <p className="text-center text-sm text-muted-foreground">{message}</p>
      <Link href="/study" className={cn(buttonVariants({ variant: "outline" }))}>
        <ArrowLeft data-icon="inline-start" aria-hidden />
        Study へ戻る
      </Link>
    </main>
  );
}

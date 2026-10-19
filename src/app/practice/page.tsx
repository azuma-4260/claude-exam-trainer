import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Practice } from "@/components/practice/practice";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { loadPracticeView } from "@/lib/practice/serve";
import { showExamLabel } from "@/lib/scope/scope";
import { cn } from "@/lib/utils";

/**
 * S-4 Practice(specs/05)。学習中は全画面(タブなし)。
 * バッチはリクエスト毎にサーバーで再構築する: 日次キューの practice 分を最優先し、
 * FR-4 プールの残り(当日回答済みを除く)を追補する(src/lib/practice/serve.ts)。
 */
export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const view = await loadPracticeView(getDb(), new Date());

  // D-1 で先に Drill(low-stability)が来る日は、間違いノート → low-stability の順を保つため Drill を案内する
  const drillFirst = view.dMinus1?.nextMode === "drill";

  if (view.kind === "ok") {
    return (
      <Practice
        items={view.items}
        scenarios={view.scenarios}
        remainingAfterBatch={view.remainingAfterBatch}
        showExamLabel={showExamLabel(view.scope)}
      />
    );
  }

  const message =
    view.kind === "bank_empty"
      ? "問題バンクがまだ登録されていません。"
      : drillFirst
        ? "前日メニューの次は Drill(stability の低い順)です。Drill へ進んでください。"
        : view.dMinus1
          ? "前日メニューの Practice 分は完了しました。"
          : "今日出題できる Practice 問題はありません(回答済み・holdout 対象を除く)。";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-5">
      <p className="text-center text-sm text-muted-foreground">{message}</p>
      {drillFirst ? (
        <Link href="/drill" className={cn(buttonVariants())}>
          Drill へ進む
        </Link>
      ) : null}
      <Link href="/study" className={cn(buttonVariants({ variant: "outline" }))}>
        <ArrowLeft data-icon="inline-start" aria-hidden />
        Study へ戻る
      </Link>
    </main>
  );
}

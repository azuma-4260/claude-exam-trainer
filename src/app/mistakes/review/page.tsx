import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuickDrill } from "@/components/drill/quick-drill";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { loadMistakesView } from "@/lib/mistakes/load";
import { nextReviewHref, parseReviewSeen } from "@/lib/mistakes/review-cursor";
import { cn } from "@/lib/utils";

/** 間違いノートの「総ざらい」。Quick Drill 形式で高速周回し、保存 mode だけ practice にする。 */
export const dynamic = "force-dynamic";

export default async function MistakeReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ seen?: string | string[] }>;
}) {
  const seen = parseReviewSeen((await searchParams).seen);
  const view = await loadMistakesView(getDb(), { reviewExcludeIds: seen });

  if (view.kind === "ok" && view.review.items.length > 0) {
    return (
      <QuickDrill
        items={view.review.items}
        scenarios={view.review.scenarios}
        remainingAfterSession={view.review.remainingAfterBatch}
        answerMode="practice"
        navigation={{
          backHref: "/mistakes",
          backLabel: "間違いノートへ戻る",
          nextSessionHref: nextReviewHref(
            seen,
            view.review.items.map((item) => item.questionId),
          ),
          completionTitle: "総ざらい完了",
        }}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-5">
      <p className="text-center text-sm text-muted-foreground">
        {view.kind === "ok" ? "この周回の総ざらいは完了しました。" : "復習する問題はありません。"}
      </p>
      <Link href="/mistakes" className={cn(buttonVariants({ variant: "outline" }))}>
        <ArrowLeft data-icon="inline-start" aria-hidden />
        間違いノートへ戻る
      </Link>
    </main>
  );
}

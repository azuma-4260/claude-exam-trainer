import Link from "next/link";
import { ChevronRight, ListChecks, Map, NotebookPen, Zap } from "lucide-react";

/**
 * S-2 Study ハブの最小版(D1-5 スコープ)。Quick Drill 入口のみ有効。
 * Practice(D2-1)/ 間違いノート(D4-2)/ シラバスマップ(B-D1-5-1)は担当タスクで有効化する。
 */
export default function StudyPage() {
  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Study</h1>
      <Link
        href="/drill"
        className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
      >
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="size-5" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block font-medium">Quick Drill</span>
          <span className="block text-sm text-muted-foreground">今日のキューを 1 問ずつ、片手で</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>

      {(
        [
          { icon: ListChecks, label: "Practice", note: "シナリオ演習(準備中)" },
          { icon: NotebookPen, label: "間違いノート", note: "誤答の総ざらい(準備中)" },
          { icon: Map, label: "シラバスマップ", note: "トピック別の習熟度(準備中)" },
        ] as const
      ).map(({ icon: Icon, label, note }) => (
        <div
          key={label}
          aria-disabled="true"
          className="flex items-center gap-4 rounded-xl border border-dashed border-border p-4 opacity-50 select-none"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block font-medium">{label}</span>
            <span className="block text-sm text-muted-foreground">{note}</span>
          </span>
        </div>
      ))}
    </main>
  );
}

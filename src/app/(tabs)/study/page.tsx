import Link from "next/link";
import { ChevronRight, ListChecks, Map, NotebookPen, Zap } from "lucide-react";

/**
 * S-2 Study ハブ(D1-5 で最小版、D2-1 で Practice 入口を有効化)。
 * 間違いノート(D4-2)/ シラバスマップ(B-D1-5-1)は担当タスクで有効化する。
 */
export default function StudyPage() {
  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Study</h1>
      {(
        [
          { href: "/drill", icon: Zap, label: "Quick Drill", note: "今日のキューを 1 問ずつ、片手で" },
          { href: "/practice", icon: ListChecks, label: "Practice", note: "シナリオ演習を本番形式で" },
        ] as const
      ).map(({ href, icon: Icon, label, note }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block font-medium">{label}</span>
            <span className="block text-sm text-muted-foreground">{note}</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
        </Link>
      ))}

      {(
        [
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

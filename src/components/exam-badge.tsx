import type { Exam } from "@/lib/bank/schema";
import { EXAM_LABEL, EXAM_SHORT } from "@/lib/exam/label";
import { cn } from "@/lib/utils";

/** exam ラベル(F / P)。学習スコープ both のとき問題・フォーム・ドメインに付ける(05 全体構造、D6-2) */
const TONE: Record<Exam, string> = {
  "ccar-f": "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "ccar-p": "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

export function ExamBadge({ exam, className }: { exam: Exam; className?: string }) {
  return (
    <span
      title={EXAM_LABEL[exam]}
      aria-label={EXAM_LABEL[exam]}
      className={cn(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border px-1.5 font-mono text-xs font-semibold",
        TONE[exam],
        className,
      )}
    >
      {EXAM_SHORT[exam]}
    </span>
  );
}

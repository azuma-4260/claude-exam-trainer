import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 今日の時間予算ゲージ(S-1 のシグネチャ要素)。SVG 手書き・依存なし・Server Component 可。
 * 中心スロットにカウントダウン等を重ねる(予算リング × 残日数の「計器」)。
 */
export function ProgressRing({
  fraction,
  size = 200,
  strokeWidth = 10,
  className,
  children,
}: {
  /** 0..1(超過は 1 にクランプ) */
  fraction: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: ReactNode;
}) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="stroke-primary transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

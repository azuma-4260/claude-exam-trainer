"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, GraduationCap, House, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 全体ナビゲーション(specs/05 §全体構造)。モバイルは下部タブ、md 以上はサイドバー。
 * Mock / Stats は担当タスク(D3-x / D4-3)まで無効表示(タブ枠だけ先に確保する)。
 */

const ITEMS = [
  { href: "/", label: "Home", icon: House, enabled: true },
  { href: "/study", label: "Study", icon: GraduationCap, enabled: true },
  { href: "/mock", label: "Mock", icon: Timer, enabled: false },
  { href: "/stats", label: "Stats", icon: ChartColumn, enabled: false },
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="メインナビゲーション"
      className={cn(
        // モバイル: 下部固定タブ(親指到達圏)
        "fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border bg-background/95 backdrop-blur",
        "pb-[env(safe-area-inset-bottom)]",
        // md 以上: 左サイドバー
        "md:inset-x-auto md:inset-y-0 md:left-0 md:h-dvh md:w-52 md:flex-col md:items-stretch md:justify-start md:gap-1 md:border-t-0 md:border-r md:p-4 md:pb-4",
      )}
    >
      <div className="hidden pb-6 pl-3 pt-2 md:block">
        <p className="font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">CCAR-F</p>
      </div>
      {ITEMS.map(({ href, label, icon: Icon, enabled }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        if (!enabled) {
          return (
            <span
              key={href}
              aria-disabled="true"
              title={`${label} は準備中`}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground/40 select-none",
                "md:flex-none md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-3 md:py-2 md:text-sm",
              )}
            >
              <Icon className="size-5 md:size-4" aria-hidden />
              {label}
            </span>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
              "md:flex-none md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-3 md:py-2 md:text-sm",
              active
                ? "text-foreground md:bg-muted md:font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5 md:size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SCOPE_LABEL } from "@/lib/exam/label";
import type { StudyScope } from "@/lib/scope/scope";
import { cn } from "@/lib/utils";

/**
 * 学習スコープの切替(05 全体構造・S-1 ヘッダ・S-9、01 FR-10、D6-2)。
 * PUT /api/study-setting の ACK 後に router.refresh() で各画面をスコープ基準で再取得する(楽観遷移なし)。
 * 選択肢(`options`)はサーバーで selectableScopes により試験日未設定の exam を含むものを除いて渡す。
 * 409 exam_date_unset(サーバー側の fail closed)はエラー表示する。
 */

export interface ScopeSwitcherProps {
  scope: StudyScope;
  options: readonly StudyScope[];
  /** full = S-9 のセグメント / compact = Home ヘッダのチップ + メニュー */
  variant: "full" | "compact";
}

function useScopeChange(current: StudyScope) {
  const router = useRouter();
  const [pending, setPending] = useState<StudyScope | null>(null);
  const [error, setError] = useState<string | null>(null);

  const change = async (next: StudyScope) => {
    if (next === current || pending) return;
    setPending(next);
    setError(null);
    try {
      const res = await fetch("/api/study-setting", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope: next }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 409) {
        setError("試験日が未設定の試験を含むため選べません");
        return;
      }
      if (!res.ok) {
        setError(`切替に失敗しました(HTTP ${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setError("切替に失敗しました(通信エラー)");
    } finally {
      setPending(null);
    }
  };

  return { pending, error, change };
}

export function ScopeSwitcher({ scope, options, variant }: ScopeSwitcherProps) {
  const { pending, error, change } = useScopeChange(scope);
  const busy = pending !== null;

  if (variant === "compact") {
    return (
      <div className="flex flex-col items-end gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={busy}
            render={<Button variant="outline" size="sm" aria-label={`学習スコープ: ${SCOPE_LABEL[scope]}(切替)`} />}
          >
            <span className="font-mono text-xs font-semibold">{busy ? "切替中…" : SCOPE_LABEL[scope]}</span>
            <ChevronDown data-icon="inline-end" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {options.map((s) => (
              <DropdownMenuItem key={s} onClick={() => change(s)} disabled={s === scope}>
                {SCOPE_LABEL[s]}
                {s === scope ? <span className="ml-auto text-xs text-muted-foreground">選択中</span> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="学習スコープ" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {options.map((s) => {
          const selected = s === scope;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={busy}
              onClick={() => change(s)}
              className={cn(
                buttonVariants({ variant: selected ? "default" : "ghost", size: "sm" }),
                "h-9 w-full",
                !selected && "text-muted-foreground",
              )}
            >
              {pending === s ? "切替中…" : SCOPE_LABEL[s]}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

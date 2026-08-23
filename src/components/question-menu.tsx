"use client";

import { useState } from "react";
import { Flag, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FLAG_REASONS, type FlagReason } from "@/lib/flags/reasons";

/**
 * 問題画面の右上メニュー(specs/05 S-3/S-4、01 FR-9)。
 * 「悪問をフラグ」→ ダイアログ(reason 3 択 + memo)→ POST /api/flags。
 * 保存 ACK 前は送信 disabled、失敗時はインラインエラーで再送できる(自動巻き戻しなし)。
 * 画面への配置は D1-5(Quick Drill)/ D2-1(Practice)で行う。
 */

const REASON_LABELS: Record<FlagReason, string> = {
  ambiguous: "曖昧(複数の選択肢が正しく読める)",
  wrong: "誤り(正解・解説が間違っている)",
  outdated: "古い(仕様・ドキュメントが更新された)",
};

export interface QuestionMenuProps {
  questionId: string;
  questionRev: number;
  /** 現行 rev に open フラグが既にあるか(再フラグは update になる) */
  initiallyFlagged?: boolean;
  /** 保存 ACK 後に呼ばれる(呼び出し側でキュー再取得などに使う) */
  onFlagged?: () => void;
}

type SendState = { kind: "idle" } | { kind: "sending" } | { kind: "error"; message: string } | { kind: "done" };

export function QuestionMenu(props: QuestionMenuProps) {
  // 問題(id, rev)が変わったら入力・送信状態を必ず捨てる(同一インスタンスのまま Next で差し替わる前提)
  return <QuestionMenuInner key={`${props.questionId}@${props.questionRev}`} {...props} />;
}

function QuestionMenuInner({ questionId, questionRev, initiallyFlagged = false, onFlagged }: QuestionMenuProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FlagReason>("ambiguous");
  const [memo, setMemo] = useState("");
  const [send, setSend] = useState<SendState>({ kind: "idle" });
  const [flagged, setFlagged] = useState(initiallyFlagged);

  const openDialog = () => {
    setSend({ kind: "idle" });
    setOpen(true);
  };

  const submit = async () => {
    setSend({ kind: "sending" });
    try {
      const res = await fetch("/api/flags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          question_rev: questionRev,
          reason,
          memo: memo.trim() === "" ? null : memo.trim(),
        }),
      });
      if (!res.ok) {
        setSend({ kind: "error", message: `保存に失敗しました(HTTP ${res.status})` });
        return;
      }
      setFlagged(true);
      setSend({ kind: "done" });
      onFlagged?.();
    } catch {
      setSend({ kind: "error", message: "通信に失敗しました。電波を確認して再送してください" });
    }
  };

  const sending = send.kind === "sending";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label="問題メニュー" />}
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={openDialog}>
            <Flag />
            {flagged ? "フラグを更新(フラグ済み)" : "悪問をフラグ"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={(next) => !sending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>悪問をフラグ</DialogTitle>
            <DialogDescription>
              {questionId}(rev {questionRev})を出題から除外します。同じ rev への再フラグは理由とメモを上書きします。
            </DialogDescription>
          </DialogHeader>

          {send.kind === "done" ? (
            <p role="status" className="text-sm">
              フラグしました。この問題は現行 rev が改訂されるまで出題されません。
            </p>
          ) : (
            <div className="grid gap-4">
              <fieldset className="grid gap-2" disabled={sending}>
                <legend className="text-sm font-medium">理由</legend>
                {FLAG_REASONS.map((r) => (
                  <label key={r} className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="flag-reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="mt-1"
                    />
                    <span>{REASON_LABELS[r]}</span>
                  </label>
                ))}
              </fieldset>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">メモ(任意)</span>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  disabled={sending}
                  rows={3}
                  className="rounded-md border bg-transparent px-3 py-2"
                  placeholder="どこが問題か(改訂時に参照します)"
                />
              </label>
              {send.kind === "error" && (
                <p role="alert" className="text-sm text-destructive">
                  {send.message}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            {send.kind === "done" ? (
              <Button onClick={() => setOpen(false)}>閉じる</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                  キャンセル
                </Button>
                <Button onClick={submit} disabled={sending}>
                  {sending ? "保存中…" : send.kind === "error" ? "再送" : "フラグする"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

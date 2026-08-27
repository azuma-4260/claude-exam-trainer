"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MockFormOption, MockFormOptions } from "@/lib/mock/availability";
import type { MockSessionDto } from "@/lib/mock/dto";

/**
 * S-5 開始画面(client)。進行中セッションがあれば「再開」を最優先表示する。
 * D3-2: availability NG は理由付き選択不可、提出済みは rehearsal ラベル、未実施フォームを推奨表示。
 */

type CurrentState =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "in_progress"; session: MockSessionDto }
  | { kind: "timed_out"; session: MockSessionDto }
  | { kind: "error" };

/** availability NG の理由表示(05 S-5: 未解決フラグ n 件) */
function blockedReason(o: MockFormOption): string {
  const parts: string[] = [];
  if (o.availability.openFlagCount > 0) parts.push(`未解決フラグ ${o.availability.openFlagCount} 件`);
  if (o.availability.inactiveCount > 0) parts.push(`非アクティブな問題 ${o.availability.inactiveCount} 件`);
  if (o.availability.missingCount > 0) parts.push(`バンク不整合 ${o.availability.missingCount} 件`);
  return parts.join(" / ");
}

export function MockStartScreen({ formOptions }: { formOptions: MockFormOptions }) {
  const router = useRouter();
  const [current, setCurrent] = useState<CurrentState>({ kind: "loading" });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/mock/sessions/current")
      .then(async (res) => {
        if (!alive) return;
        if (res.status === 204) return setCurrent({ kind: "none" });
        if (!res.ok) return setCurrent({ kind: "error" });
        const body = await res.json();
        setCurrent({ kind: body.kind, session: body.session });
        // timeout 提出をここで検知した場合、サーバー描画時の formOptions は提出前の状態なので
        // 取り直す(rehearsal ラベル・推奨フォームを提出後の状態で再計算)
        if (body.kind === "timed_out") router.refresh();
      })
      .catch(() => alive && setCurrent({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, [router]);

  const start = async (formId: string) => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/mock/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ form_id: formId }),
      });
      if (res.status === 201) {
        router.push("/mock/session");
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (res.status === 409 && body.error === "session_in_progress") {
        // 進行中あり(二重クリック含む)→ そのまま再開へ
        router.push("/mock/session");
        return;
      }
      if (res.status === 409 && body.error === "form_blocked") {
        // 画面表示後にフラグ状態が変わった。availability を取り直す
        setError(
          `このフォームは開始できません(未解決フラグ ${body.open_flag_count ?? 0} 件 / 非アクティブ ${body.inactive_count ?? 0} 件)。`,
        );
        router.refresh();
        return;
      }
      if (res.status === 409 && body.error === "form_not_next") {
        // 画面表示後に提出状態が変わった等。推奨フォームを取り直す
        setError(`未実施フォームは自動選択の順で受験します(次は ${body.recommended_form_id})。`);
        router.refresh();
        return;
      }
      setError(`開始できませんでした(${body.error ?? res.status})`);
    } catch {
      setError("開始できませんでした(通信エラー)");
    } finally {
      setStarting(false);
    }
  };

  const { options, recommendedFormId, allBlocked } = formOptions;
  const busy = starting || current.kind === "in_progress" || current.kind === "loading";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Mock(模試)</h1>

      {current.kind === "in_progress" && (
        <section className="rounded-lg border-2 border-primary p-4">
          <p className="font-medium">進行中の模試があります</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {current.session.kind === "full" ? `フル模試 ${current.session.form_id}` : `ミニ模試 ${current.session.domain_id}`}
            (閉じている間も時計は進んでいます)
          </p>
          <Button className="mt-3 w-full" onClick={() => router.push("/mock/session")}>
            再開する
          </Button>
        </section>
      )}
      {current.kind === "timed_out" && (
        <section className="rounded-lg border p-4 text-sm">
          前回の模試は制限時間超過のため提出されました(素点 {current.session.score_raw} / {current.session.question_ids.length})。
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">フル模試</h2>
        <p className="text-sm text-muted-foreground">
          60 問 / 120 分。<strong>一時停止・破棄はできません</strong>(手動提出か時間切れ提出のみ)。
          画面を閉じても同じセッションを再開できますが、<strong>時計は止まりません</strong>。
          採点と解説は提出後まで表示されません。
        </p>
        {options.length === 0 && (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            模試フォームがまだ収載されていません(C3b-A で form A が追加されます)。
          </p>
        )}
        {allBlocked && (
          <p className="rounded-md border border-destructive p-4 text-sm text-destructive">
            すべてのフォームが開始できません。フラグ済みの問題(悪問)を修正して現行 rev のフラグを解消してください。
          </p>
        )}
        {options.map((o) => {
          const available = o.availability.available;
          const isRecommended = o.formId === recommendedFormId;
          // 未実施フォームは自動選択(次の有効な未実施フォーム)のみ開始可(01 FR-5)。
          // 提出済みフォームは rehearsal として available なら常に選択可
          const startable = available && (o.submitted || isRecommended);
          return (
            <div key={o.formId} className="flex items-center justify-between gap-3 rounded-lg border p-4">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {o.formId}
                  {o.submitted && <Badge variant="secondary">rehearsal</Badge>}
                  {!o.submitted && isRecommended && <Badge>次のフォーム</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">{o.questionCount} 問 / 120 分</p>
                {!available && <p className="mt-1 text-sm text-destructive">開始不可: {blockedReason(o)}</p>}
                {available && !o.submitted && !isRecommended && (
                  <p className="mt-1 text-xs text-muted-foreground">未実施フォームは自動選択の順で受験します</p>
                )}
                {o.submitted && available && (
                  <p className="mt-1 text-xs text-muted-foreground">提出済み。再受験のスコアは rehearsal 扱い(readiness 判定外)</p>
                )}
              </div>
              <Button
                disabled={busy || !startable}
                variant={isRecommended ? "default" : "outline"}
                onClick={() => start(o.formId)}
              >
                開始
              </Button>
            </div>
          );
        })}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>
    </main>
  );
}

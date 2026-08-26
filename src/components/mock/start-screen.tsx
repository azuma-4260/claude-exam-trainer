"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { MockSessionDto } from "@/lib/mock/dto";

/** S-5 開始画面(client)。進行中セッションがあれば「再開」を最優先表示する */

interface FormItem {
  id: string;
  questionCount: number;
}

type CurrentState =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "in_progress"; session: MockSessionDto }
  | { kind: "timed_out"; session: MockSessionDto }
  | { kind: "error" };

export function MockStartScreen({ forms }: { forms: FormItem[] }) {
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
      })
      .catch(() => alive && setCurrent({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, []);

  const start = async (formId: string) => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/mock/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ form_id: formId }),
      });
      if (res.status === 201 || res.status === 409) {
        // 409 = 進行中あり(二重クリック含む)→ そのまま再開へ
        router.push("/mock/session");
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(`開始できませんでした(${body.error ?? res.status})`);
    } catch {
      setError("開始できませんでした(通信エラー)");
    } finally {
      setStarting(false);
    }
  };

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
        {forms.length === 0 && (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            模試フォームがまだ収載されていません(C3b-A で form A が追加されます)。
          </p>
        )}
        {forms.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{f.id}</p>
              <p className="text-sm text-muted-foreground">{f.questionCount} 問 / 120 分</p>
            </div>
            <Button disabled={starting || current.kind === "in_progress" || current.kind === "loading"} onClick={() => start(f.id)}>
              開始
            </Button>
          </div>
        ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>
    </main>
  );
}

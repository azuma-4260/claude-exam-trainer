import Link from "next/link";
import { ArrowLeft, Download, Flag, Layers, LogOut, Settings } from "lucide-react";
import { ExamBadge } from "@/components/exam-badge";
import { ScopeSwitcher } from "@/components/scope-switcher";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { EXAMS } from "@/lib/bank/schema";
import { loadMultiBank } from "@/lib/bank/runtime";
import { examOfQuestionId } from "@/lib/exam/dates";
import { EXAM_LABEL } from "@/lib/exam/label";
import { listCurrentOpenFlags } from "@/lib/export/load";
import { getStudyScope } from "@/lib/scope/repo";
import { selectableScopes } from "@/lib/scope/scope";
import { cn } from "@/lib/utils";

/**
 * S-9 設定。学習スコープ切替・データエクスポート(全 exam / exam 別)・未解決フラグ一覧・ログアウト(specs/05)。
 * パスコード変更 UI は仕様どおり持たない。
 */
export const dynamic = "force-dynamic";

const REASON_LABEL = {
  ambiguous: "曖昧",
  wrong: "誤り",
  outdated: "古い情報",
} as const;

export default async function SettingsPage() {
  // 未解決フラグ一覧は学習スコープに関係なく全 exam を exam ラベル付きで表示する(01 FR-10、05 S-9)
  const bank = loadMultiBank().all;
  const db = getDb();
  const [flags, scope] = await Promise.all([listCurrentOpenFlags(db, bank), getStudyScope(db)]);

  return (
    <main className="flex flex-col gap-7">
      <header>
        <Link href="/stats" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          Stats へ戻る
        </Link>
        <div className="flex items-center gap-2">
          <Settings className="size-5" aria-hidden />
          <h1 className="text-xl font-semibold">設定</h1>
        </div>
      </header>

      <section aria-labelledby="scope-heading" className="flex flex-col gap-3">
        <h2 id="scope-heading" className="font-medium">学習スコープ</h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Layers className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">
                出題・今日のキュー・間違いノート・Stats・模試の開始候補を、選んだ試験に絞ります。
                切り替えても学習履歴は変わりません。進行中の模試はスコープに関係なく再開できます。
              </p>
              <div className="mt-4">
                <ScopeSwitcher scope={scope} options={selectableScopes()} variant="full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="data-heading" className="flex flex-col gap-3">
        <h2 id="data-heading" className="font-medium">データ</h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Download className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium">学習データのエクスポート</p>
              <p className="mt-1 text-sm text-muted-foreground">
                進捗 5 テーブルと、現行 rev の未解決フラグのみを JSON で保存します。
              </p>
              <a href="/api/export" download className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}>
                <Download data-icon="inline-start" aria-hidden />
                全試験の JSON をダウンロード
              </a>
              {/* exam 別(03 §3: その exam の行のみ。study_setting は含まない) */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                {EXAMS.map((exam) => (
                  <a
                    key={exam}
                    href={`/api/export?exam=${exam}`}
                    download
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "border border-border")}
                  >
                    {EXAM_LABEL[exam]} のみ
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="flags-heading" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="flags-heading" className="font-medium">未解決フラグ</h2>
          <span className="text-xs text-muted-foreground">現行 rev のみ · {flags.length} 件</span>
        </div>
        {flags.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Flag className="mx-auto size-6 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm text-muted-foreground">現在の問題に未解決フラグはありません。</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {flags.map((flag) => {
              const question = bank.byId.get(flag.questionId);
              return (
                <li key={flag.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <ExamBadge exam={examOfQuestionId(flag.questionId)} />
                    <span className="rounded-md bg-amber-500/10 px-2 py-1 font-medium text-amber-700 dark:text-amber-300">
                      {REASON_LABEL[flag.reason as keyof typeof REASON_LABEL] ?? flag.reason}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {flag.questionId} · rev {flag.questionRev}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-relaxed">
                    {question?.stem_en ?? "現行バンクに問題がありません"}
                  </p>
                  {flag.memo ? <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{flag.memo}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="session-heading" className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 id="session-heading" className="font-medium">セッション</h2>
        <form action="/logout" method="post">
          <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "w-full text-destructive")}>
            <LogOut data-icon="inline-start" aria-hidden />
            ログアウト
          </button>
        </form>
      </section>
    </main>
  );
}

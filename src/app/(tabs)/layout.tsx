import { AppNav } from "@/components/app-nav";

/**
 * タブ付き画面群(Home / Study / Mock / Stats)のレイアウト(specs/05 §全体構造)。
 * ナビを出さない画面(/login の Route Handler、学習中・試験中は全画面の /drill・/practice・
 * /mistakes/review・/mock/session)は route group の外に置く。Mock の開始画面(/mock)と
 * レポート(/mock/report/[id])はタブ画面なのでこの group に置く。
 */
export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh md:pl-52">
      <div className="mx-auto w-full max-w-xl px-5 pb-24 pt-6 md:pb-10">{children}</div>
      <AppNav />
    </div>
  );
}

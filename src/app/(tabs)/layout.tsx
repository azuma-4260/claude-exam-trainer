import { AppNav } from "@/components/app-nav";

/**
 * タブ付き画面群(Home / Study / Mock / Stats)のレイアウト(specs/05 §全体構造)。
 * /login(Route Handler)と /drill(学習中は全画面)にはナビを出さないため route group に置く。
 */
export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh md:pl-52">
      <div className="mx-auto w-full max-w-xl px-5 pb-24 pt-6 md:pb-10">{children}</div>
      <AppNav />
    </div>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CCAR-F 対策",
  description: "Claude Certified Architect – Foundations 対策アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}

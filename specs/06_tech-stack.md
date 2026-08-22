# 06. 技術スタック(v1.2・固定仕様)

## 採用スタックとバージョン方針

| レイヤ | 採用 | 備考 |
|---|---|---|
| フレームワーク | **Next.js 16.x(stable)+ TypeScript** | major 固定 |
| UI | Tailwind CSS + shadcn/ui | ダークモードは標準対応の範囲でのみ |
| チャート | Recharts(Stats のみ・省略可) | |
| DB | **Neon(Postgres)** Vercel Marketplace 経由 | Free、scale-to-zero 前提 |
| ORM/接続 | Drizzle ORM + `@neondatabase/serverless` + `drizzle-orm/neon-http` | |
| SRS | **ts-fsrs 5.4.1(exact pin)** | |
| バリデーション | Zod(バンクスキーマ単一ソース) | |
| ホスティング | Vercel Hobby | |
| テスト | Vitest(SRS 遷移・書込プロトコル冪等性・キュー生成・採点・模試ライフサイクル・holdout) | UI テスト省略 |

**pin の意味**: 設計書で固定するのはセマンティックに重要なもの(Next.js major、ts-fsrs exact)のみ。実際の exact バージョンの再現ソースは package-lock.json とし、以後 `npm ci` を使用。試験前の無目的な依存更新は禁止。

## リクエスト前段(Next.js 16 / proxy)

Next.js 16 では middleware.ts の file convention は deprecated であり、通常のリクエスト介入には **`proxy.ts` / `proxy()`**(Node.js runtime)を使用する。middleware.ts は Edge runtime 互換目的で残存するが、本アプリでは使用しない。**Proxy は認証の optimistic check にのみ使用**し、write 系 API と export は各ハンドラ内でもセッション検証を行う(Proxy を完全な認可境界としない)。

## 接続方式(固定)

- 標準接続は Neon HTTP driver(`drizzle-orm/neon-http`)。長寿命 TCP プール禁止
- 複数更新は Neon HTTP の **non-interactive transaction**(事前構築したクエリ群の一括送信)で原子的に実行。**同一トランザクション内で「SELECT → JS 計算 → UPDATE」はできない**ため、書込プロトコルは `03` の実行順(読み → サーバー計算 → 原子的書込 → 競合時再取得)に従う
- Vercel Function region は Neon と近接させる
- 模試タイマーは deadline_at + クライアント表示。長時間 Function 保持は禁止

## scale-to-zero の扱い

- wake 遅延は許容。keep-alive cron 禁止。Study/Mock 進入時のデータ取得が実質 warm-up
- バンクは static bundle。問題文表示は DB 非依存

## 本番/開発 DB の分離と data-protection cutover

- Production と development/preview は **Neon branch で分離**。Production branch へは Vercel Production 環境のみ接続。テストコードから production DATABASE_URL 参照禁止
- **cutover ルール**: 最初の production attempt が保存された時点を data-protection cutover とする。cutover **前**はスキーマ修正目的の production DB リセットを許可(この期間に設計を素早く直す)。cutover **後**は DROP / 破壊的 ALTER / reset / reseed を禁止
- migration フロー(cutover 後): 生成 → dev branch 適用 → smoke test → production に一度だけ適用 → deploy。Preview デプロイごとの production migration 禁止。失敗時は deploy 中止

## 認証(固定)

- `POST /login` で APP_PASSCODE 照合 → SESSION_SECRET 署名(HMAC)トークンを HttpOnly; Secure; SameSite=Lax 長期 Cookie に発行
- パスコード自体・無署名フラグの Cookie 保存禁止。パスコード変更 UI なし(環境変数で変更)

## オーナーの手作業(初期のみ)

1. GitHub リポジトリ作成(Claude Code の `gh repo create` 代行可)
2. Vercel に Import
3. Marketplace で Neon 追加 + dev branch 作成
4. `APP_PASSCODE` 設定(`SESSION_SECRET` は Claude Code が生成し `vercel env add` 代行可)

## 環境の実体(2026-08-23 設定済み)

オーナー手作業 O-2a / O-3 / O-4 の結果。変更する場合は本節を更新する。

| 項目 | 値 |
|---|---|
| Vercel project | `azx3/claude-exam-trainer`(Hobby)。`VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` / `VERCEL_TOKEN` は GitHub Repository secrets |
| Git 自動 deploy 無効化 | Build and Deployment → Ignored Build Step = **Don't build anything**(CI の `vercel deploy --prebuilt` には影響しない) |
| Function Region | **sin1**(Singapore)。Neon の Vercel 統合に東京が無いため最寄りを選択 |
| Neon | Marketplace 統合(Free)、DB `claude-exam-trainer-db`、Region **ap-southeast-1**、**Neon Auth は無効**(認証は本書 §認証の自前実装) |
| Neon branch | `main`(Production 専用)/ `dev`(Auto-delete: Never) |
| `DATABASE_URL` | Production = main(統合が自動注入、Sensitive)/ Preview + Development = dev(手動登録、Non-sensitive) |
| `SESSION_SECRET` / `APP_PASSCODE` | Production + Preview に Sensitive で登録。**Development には置かない**(Vercel の Sensitive 変数は Development 不可)→ ローカルは `.env.local` に開発専用の値を書く |
| ローカル | `vercel link` 済み(`.vercel/` と `.env*` は git 除外)。`vercel env pull --environment=development` で dev branch の `DATABASE_URL` を取得 |

## リポジトリ構成

```
/
  specs/                      # 設計書(唯一の仕様ソース)
  ExamGuide/                  # 公式 Exam Guide PDF
  content/                    # バンク
  src/app/ src/lib/srs/ src/lib/bank/ src/db/
  scripts/validate-bank.ts    # CI
```

## バンク静的検証(CI、push ごと)

- Zod 検証(`03` の全不変条件)、id 重複、syllabus 整合、refs
- ドメイン別問題数の重み乖離(±30% 超で警告)
- **固定フォーム検証**: 60 問 / ドメイン配分 16-11-12-12-9 / form 間重複なし / mock eligible / scenario_id 非 null / scenario_id ∈ form.scenario_ids / 実使用シナリオ集合 = form.scenario_ids / (公式確認済みの場合のみ)各シナリオ 15 問
- **deploy は CI の後続 job からのみ実行**(validator → `npm test` → `npm run build` が全て成功した場合のみ Vercel CLI + token で deploy)。Vercel の Git 連携による自動 deploy は無効化する。これにより「CI 失敗 = deploy 中止」を仕組みで保証する
- 失敗時は CI fail・デプロイ中止。**フラグの resolved_at 更新はデプロイ成功条件に含めない**(旧 rev フラグは superseded として自動失効)

## 不採用(変更なし)

SvelteKit 等 / Supabase / ローカル SQLite + GitHub 同期 / localStorage のみ / API 動的生成(F 合格後まで)/ durable outbox / keep-alive cron

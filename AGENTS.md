# AGENTS.md

Claude 認定資格(CCAR-F: 2026-09-27 / CCAR-P: F 合格後)対策の個人用学習 Web アプリ。
実装契約・停止条件・確定決定事項・ドキュメント構成は以下を参照:

@README.md
(Codex など @import 非対応ツールは `README.md` を直接読むこと)

## 仕様の参照ルール

- `specs/` が唯一の仕様ソース。実装前に該当する spec を必ず読む(どの spec が何かは README のドキュメント構成表を参照)
- 仕様とコードが食い違ったら spec が正。仕様を変えたい場合は spec を先に更新する

## コマンド

- `npm ci` — 依存インストール(package-lock.json が exact バージョンの再現ソース。`npm install` での更新は禁止)
- `npm run dev` — 開発サーバー
- `npm test` / `npm run test:watch` — Vitest(`src/**/*.test.ts`, `scripts/**/*.test.ts`)
- `npm run typecheck` — `next typegen && tsc --noEmit`
- `npm run lint` — ESLint
- `npm run build` — Next.js ビルド
- `npm run validate-bank` — バンク静的検証 `scripts/validate-bank.ts`(CI で push ごとに実行、失敗時はデプロイ中止。D0-3 で実装)
- `npm run db:generate` / `db:migrate` / `db:check` — Drizzle migration 生成・適用・両 branch 整合検証(D0-4 で実装)
- `npm run task:check [ID]` / `npm run task:start <ID>` — タスク状態の判定と worktree での着手(`tasks/README.md`)
- shadcn/ui コンポーネント追加: `npx shadcn@latest add <name>`

タスク ID と実行順は `specs/09_task-plan.md` が単一ソース。着手は `npm run task:check <ID>` → READY なら `npm run task:start <ID>` のみ(並行セッション運用の規約は `tasks/README.md`)。

## スキル

スキルの正本は `.agents/skills/<name>/SKILL.md`(Codex がリポジトリルートの `.agents/skills` を
ネイティブに読む)。Claude Code は `.agents/skills` を読まないため、`.claude/skills/<name>` から
正本への **symlink** を張る。実体を 2 箇所に置いて二重管理しない。

- `grill-me` — 計画・設計をラウンド制の面接で詰める。Claude Code: `/grill-me`、Codex: `$grill-me`
- `.claude/skills/` 直下の実ディレクトリ(`adversarial-review-loop` / `codex-review` /
  `smart-commit` / `task-session`)は Claude 固有ツール前提のため Claude 専用のまま

新しく両対応スキルを足すときは `.agents/skills/` に本体を置き、
`ln -s ../../.agents/skills/<name> .claude/skills/<name>` を実行してコミットする。

## 禁止事項

- `middleware.ts` を使わない。Next.js 16 では `proxy.ts` を使う(specs/06)
- 依存の無目的な更新禁止。ts-fsrs は **5.4.1 exact pin**(README / specs/06)
- DB 接続は neon-http driver のみ。長寿命 TCP プール禁止、keep-alive cron 禁止(specs/06)
- 回答保存は厳密 ACK 方式のみ。outbox・楽観遷移・巻き戻し UI を実装しない(specs/03)
- Mock は FSRS を更新しない。Mock の attempt は提出時に一括生成(specs/04)
- holdout ゲート: 未提出フォーム収載問題を当該フォーム以外に一切出題しない(specs/03)
- data-protection cutover(8/27 Drill 開始)以後、本番データを変更・破壊する操作をしない(specs/06)

## 規約

- 全日付ロジックは Asia/Tokyo、日次リセットは 00:00 JST
- 問題文(stem)は英語、解説は日本語
- バンクスキーマは Zod 単一ソース。型は `z.infer` で導出し、validator も同じ schema を import する
- 会話・コミットメッセージ・コード内コメントは日本語

## 指示ファイルの正本

- この指示は `AGENTS.md` が正本。`CLAUDE.md` は `@AGENTS.md` でインポートするだけなので編集しない

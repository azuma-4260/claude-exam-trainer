# CLAUDE.md

Claude 認定資格(CCAR-F: 2026-09-27 / CCAR-P: F 合格後)対策の個人用学習 Web アプリ。
実装契約・停止条件・確定決定事項・ドキュメント構成は以下を参照:

@README.md

## 仕様の参照ルール

- `specs/` が唯一の仕様ソース。実装前に該当する spec を必ず読む(どの spec が何かは README のドキュメント構成表を参照)
- 仕様とコードが食い違ったら spec が正。仕様を変えたい場合は spec を先に更新する

## コマンド

package.json は未作成。Phase 0 スキャフォールド後に確定コマンド(dev/build/test 等)でこの節を更新すること。

- 依存インストールは `npm ci` のみ(package-lock.json が exact バージョンの再現ソース)
- テストは Vitest
- バンク静的検証は `scripts/validate-bank.ts`(CI で push ごとに実行、失敗時はデプロイ中止)

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

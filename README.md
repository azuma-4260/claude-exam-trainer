# Claude 認定資格 対策アプリ 設計書

**v1.2.1(2026-08-23)**: `09_task-plan.md` 追加(タスク分解・依存関係・DoD・リリースゲート)。`02`/`06`/`07` のパス記述を実態(`specs/`・`ExamGuide/`)に修正。`06` に CI 後続 job による deploy 直列化を追記。

**v1.2(2026-08-22)**: 第 2 ラウンドレビュー反映。主な変更: 回答保存を厳密 ACK 方式に一本化(サーバー実行順まで固定)、srs_state 生成を「初回 rating commit 時」に変更、Mock attempt の提出時一括生成、模試フォームの holdout/解放ポリシー確立、日次キューを 45 分時間予算方式へ、**診断テスト機能の全削除**、MAX_INTERVAL 10 日上限の削除、実装契約の適用範囲の絞り込み、data-protection cutover の導入。

**v1.1(2026-08-22)**: 第 1 ラウンドレビュー(Critical 10 / Major 20 / Minor 7)反映。

個人利用の資格試験対策 Web アプリ。対象:

| 資格 | コード | 試験日 | 形式 |
|---|---|---|---|
| Claude Certified Architect – Foundations | CCAR-F | **2026-09-27** | 60問 / 120分 / シナリオベース |
| Claude Certified Architect – Professional | CCAR-P | F 合格後(未定) | 63問 / 120分 / 独立問題 |

実装はすべて Claude Code に委任(オーナーはコードを読むが書かない)。本設計書群は AI 実装者への指示書として機能することを最優先とする。

## 実装契約(全セッション共通)

### 停止条件(TODO(owner) を追記して停止するのは以下のみ)

未定義の選択によって次の**意味が変わる**場合に限る:

- 永続データの意味・スキーマ
- 状態遷移
- 採点
- SRS スケジューリング
- Mock の holdout / スコア
- 認証・認可境界
- 本番データを変更・破壊する操作

UI 文言、loading/empty state、コンポーネント分割、CSS、内部関数構造、非永続的なフォールバック、標準的なエラーハンドリング等は、Claude Code が合理的な一般実装を自律的に選択してよい。

### 常時遵守

1. スキーマ・API・enum は設計書に明記された値のみ使用する
2. SRS 更新、attempt 保存、模試セッション、問題 rev のライフサイクルは、実装前に Vitest で状態遷移テストを書く
3. 本番学習データの保護は `06` の data-protection cutover ルールに従う
4. UI の完成度より「回答 → 保存 → 復元 → 復習」の end-to-end 経路の堅牢性を優先する
5. バージョン方針: 設計書で固定するのはセマンティックに重要なもののみ(Next.js 16.x / ts-fsrs **5.4.1 exact**)。実際の exact バージョンの再現ソースは package-lock.json とし、以後 `npm ci` を使用。試験前の無目的な依存更新は禁止
6. 実装完了後、commit 前に Codex による第二者レビューを実行する: `/codex:review`(未コミット差分)または `/codex:review --base main`(ブランチ差分)。P1(Blocking)指摘は修正してから commit する。設計書の実装契約を観点に含めたい場合は `/codex:adversarial-review` で指示する。これらのスラッシュコマンドはユーザー起動専用のため、Claude Code が自律的に実行するときはプロジェクトスキル `codex-review`(`.claude/skills/codex-review/`)から **Codex CLI を直接**呼ぶ(Claude プラグインの companion スクリプトは経由しない)

## ドキュメント構成

| ファイル | 内容 |
|---|---|
| `01_requirements.md` | 機能要件・非機能要件・スコープ外 |
| `02_syllabus.md` | 公式ブループリント整理とトピックツリー方針 |
| `03_data-model.md` | バンクスキーマ・進捗 DB・書込プロトコル・整合性ルール |
| `04_srs-spec.md` | FSRS 調整・時間予算キュー・モード行列 |
| `05_screens.md` | 画面設計(モバイルファースト) |
| `06_tech-stack.md` | スタック・接続方式・DB 運用・認証の固定仕様 |
| `07_content-pipeline.md` | バンク生成パイプライン(シナリオ優先) |
| `08_roadmap.md` | 絶対日付スケジュール |
| `09_task-plan.md` | トラック・依存表・クリティカルパス・DoD・リリースゲート・セッション配分 |
| `10_task-ops.md` | タスク運用補助: バックログ形式・`task:report` 出力・`/task-session` のセッション状態と承認ハッシュ |

## 確定した決定事項(v1.2)

1. 9/27 までは UI 上 CCAR-F 固定。P の実装は F 合格後(DB の `exam` 列のみ将来互換)
2. バンクは Git 内静的ファイル。生成優先順: 最小フラッシュ → **Practice 用シナリオ MCQ(8/28 まで)** → 固定フォーム 3 本 → 残フラッシュ → 独立 MCQ
3. 問題文は英語、解説は日本語
4. ts-fsrs 5.4.1 を lossless 使用。試験日対応は `maximum_interval = max(1, days_until_exam - 1)` のみ(それ以外の間隔上限なし)
5. **初期診断テストは実装しない**。習熟度は最初から実回答で推定する(未学習トピックの retention 既定値 0.3)
6. 模試は固定フォーム 3 本。**holdout ゲート**: 未提出フォーム収載問題は当該フォーム以外に一切出題しない。提出後は Practice に解放(ただし srs_eligible=false 維持)。再受験スコアは rehearsal 扱いで readiness 判定に使わない
7. Mock は FSRS 非更新。attempt は提出時に一括生成
8. 学習回答は**厳密 ACK 方式**のみ(outbox・楽観遷移・巻き戻し UI は実装しない)
9. 日次キューは 45 分の時間予算方式(item 数 cap ではない)
10. スケールドスコア表示なし。素の正答率 + 内部目標 85%
11. 全日付ロジックは Asia/Tokyo、日次リセット 00:00 JST
12. PC/スマホの同期は逐次利用前提。複数端末からの同時回答送信はサポート外

## 未確定事項

- CCAR-P の受験時期
- ~~公式 Exam Guide の模試構造(4×15 か否か)→ `07` Step 0 で照合~~ → **解消(2026-08-23, C0)**: Guide に各シナリオ問題数の記述なし。各シナリオ 15 問検証は OFF 確定(`content/ccar-f/SOURCES.md` §1.1)
- ハーフ模試: 任意機能(Phase 4 以降・余力時のみ)

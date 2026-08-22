# 02. 試験ブループリント整理(v1.1)

このファイルは Web 調査(2026-08 時点)に基づく。**バンク生成前に必ず公式 Exam Guide v1.0(PDF)を取得し、タスクステートメントを原文から転記して照合すること**(`07` Step 0)。公式ガイドと本ファイルが食い違う場合は公式が正。

## 共通仕様(全 4 試験)

- 120 分 / スケールドスコア 100–1000、合格 720 / Pearson VUE(オンライン監督 or テストセンター)/ 英語 / 有効 12 ヶ月
- 登録は Anthropic Partner Academy 経由(Claude Partner Network、Registered レベルは無料)

## CCAR-F: Claude Certified Architect – Foundations($125)

- 60 問、多肢選択、シナリオベース: 6 本のプロダクションシナリオから 4 本が抽選され、全設問がそのシナリオに紐づく
- ⚠ **要検証(Step 0)**: 「4 シナリオ × 各 15 問」なのか「4 シナリオで合計 60 問(配分不均等あり)」なのかは調査情報では未確定。固定フォーム(`07`)のシナリオ内問題数は公式 PDF の記述を確認してから確定する。確認できない場合も 4 × 15 を不変条件としてハードコードしない
- 推奨経験: Claude API / Claude Code のハンズオン 6 ヶ月以上

### ドメインと重み

| # | ドメイン | 重み | 主なトピック(調査ベース、公式で要照合) |
|---|---|---|---|
| F-D1 | Agentic Architecture & Orchestration | 27% | マルチエージェント設計、タスク分解、hub-and-spoke、agentic loop、サブエージェント協調、自律システムの信頼性パターン |
| F-D2 | Tool Design & MCP Integration | 18% | MCP サーバー/クライアント設計、ツール境界、トランスポートのトレードオフ、認証パターン、堅牢なツールスキーマ |
| F-D3 | Claude Code Configuration & Workflows | 20% | CLAUDE.md 階層、カスタムスラッシュコマンド、CI/CD 統合、永続プロジェクトコンテキスト、AI-first 開発ワークフロー |
| F-D4 | Prompt Engineering & Structured Output | 20% | JSON スキーマ強制、few-shot、バリデーション再試行ループ、プログラム的強制 vs プロンプト的強制 |
| F-D5 | Context Management & Reliability | 15% | プロンプトキャッシュ(cache_control)、会話コンパクション、トークン見積り・予算管理、マルチターン設計、長文コンテキスト |

### 60 問へのドメイン配分(largest-remainder 法で固定)

27/18/20/20/15% × 60 = 16.2 / 10.8 / 12 / 12 / 9 → **16 / 11 / 12 / 12 / 9 問**。固定フォームはこの配分を満たすことを validator で検証する。

### 公式サンプルシナリオの傾向(Exam Guide 記載)

カスタマーサポートエージェント / マルチエージェントリサーチパイプライン / Agent SDK による開発者生産性ツール(Read/Write/Bash/Grep/Glob + MCP)/ 構造化データ抽出システム / CI/CD 統合 / チーム向け Claude Code 設定。模試シナリオはこの傾向に合わせる。

## CCAR-P: Claude Certified Architect – Professional($175)

- 63 問、独立問題形式、multiple-choice + multiple-response
- 対象: ミッド〜シニアのソリューションアーキテクト

### ドメインと重み

| # | ドメイン | 重み |
|---|---|---|
| P-D1 | Solution Design & Architecture | 17% |
| P-D2 | Claude Models, Prompting & Context Engineering | 13% |
| P-D3 | Integration | 19% |
| P-D4 | Evaluation, Testing & Optimization | 16% |
| P-D5 | Governance, Safety & Risk Management | 14% |
| P-D6 | Stakeholder Communication & Lifecycle Management | 14% |
| P-D7 | Developer Productivity & Operational Enablement | 7% |

### F との差分

Governance / Stakeholder & Lifecycle / Developer Enablement(計 35%)は F に存在しない。F 期間中この 3 領域のバンクは作らない。P フェーズで F バンクから流用する場合も**新 ID を採番して移植**する(`07` 参照)。

## トピックツリーの構造方針

- 階層: `exam > domain > task_statement > topic`。問題は primary topic 1 つに帰属(集計単位)、関連 topic は secondary として保持
- topic の粒度: フラッシュカード 3〜5 枚で覆える概念単位。F 全体で 60〜80 topics 目安
- ツリーは `content/ccar-f/syllabus.yaml` が単一ソース

## 主要ソース

- 公式 Exam Guide v1.0(CCAR-F): Partner Academy 配布 PDF(`ExamGuide/CCAR-F.pdf` に保存済み)
- Pearson VUE: https://www.pearsonvue.com/us/en/anthropic.html
- Anthropic Academy 対応コース(無料)、docs.claude.com、Anthropic engineering ブログ(解説 refs の一次参照先)

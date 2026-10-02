# 02. 試験ブループリント整理(v1.3)

**v1.3.1(2026-10-03, T-pmock)**: CCAR-P の出題構造と 63 問の配分を確定値に更新(`03` §mock_forms)。

**v1.3(2026-09-29, CP0)**: CCAR-P 節を公式 Exam Guide v1.0(`ExamGuide/CCAR-P.pdf`)と突合し、公式優先で更新。転記原文と判断記録は `content/ccar-p/SOURCES.md` が正本。「独立問題形式」は Guide 未確認(シナリオ構造の記述が無いだけ)と訂正し、P の出題範囲・F との重なり・トピックツリー方針を追記。

**v1.2(2026-08-23, C0)**: 公式 Exam Guide v1.0(`ExamGuide/CCAR-F.pdf`)と突合し、公式優先で全面更新。転記原文と判断記録は `content/ccar-f/SOURCES.md` が正本(本ファイルはその要約)。CCAR-P 節は引き続き Web 調査ベース(P の Exam Guide 取得後に同手順で突合する)。

## 共通仕様

- 120 分 / スケールドスコア 100–1000、合格 720(criterion-referenced、ドメイン別 % は参考表示のみ)/ Pearson VUE(オンライン監督 or テストセンター)/ 有効 12 ヶ月
- 登録は Anthropic Partner Academy → Pearson VUE。キャンセル・変更は 24 時間前まで。再受験待機 14 / 30 / 90 日、12 ヶ月で最大 4 回

## CCAR-F: Claude Certified Architect – Foundations($125)

- **60 問**、**multiple-choice + multiple-response**(各問で選択数を明記)。バンクでは `mcq_single` / `mcq_multi` が対応(`03`)
- シナリオベース: **6 本のシナリオから 4 本がランダム抽選**され、設問はシナリオに紐づく
- **模試構造(Step 0 で確定)**: Guide に「各シナリオ 15 問」の記述は**なし**(`SOURCES.md` §1.1)。固定フォームのシナリオ内問題数は固定せず、validator の各シナリオ 15 問検証は **OFF**(`03` §1 / `06`)。フォームは 4 シナリオ × 12〜18 問の範囲でドメイン配分を優先して組む
- 推奨経験: Claude API / Agent SDK / Claude Code / MCP のハンズオン 6 ヶ月以上

### ドメインと重み(公式 §4 Blueprint)

| # | ドメイン | 重み | タスクステートメント(公式 §6、`SOURCES.md` §3 に原文) |
|---|---|---|---|
| F-D1 | Agentic Architecture & Orchestration | 27% | 1.1 agentic loop(stop_reason 制御・ツール結果の履歴追加・アンチパターン)/ 1.2 coordinator-subagent(hub-and-spoke・分解の狭さリスク・反復精緻化)/ 1.3 subagent 起動と文脈受け渡し(現行 Agent tool・旧 Task 名との互換判定・allowedTools・明示的コンテキスト・並列 spawn・fork)/ 1.4 多段ワークフローの強制とハンドオフ(programmatic prerequisite・構造化 handoff)/ 1.5 Agent SDK hooks(PostToolUse 正規化・ツール呼出し遮断)/ 1.6 タスク分解戦略(prompt chaining vs 動的分解)/ 1.7 セッション再開・fork(Agent SDK の session_id/resume・Claude Code の --resume・fork_session・stale 文脈の扱い) |
| F-D2 | Tool Design & MCP Integration | 18% | 2.1 ツール説明の設計(差別化・分割・system prompt のキーワード干渉)/ 2.2 MCP 構造化エラー(isError・失敗理由・回復可能性・空結果との区別。Exam Guide 記載の errorCategory/isRetryable は概念名として扱い、MCP 標準フィールドと誤認しない)/ 2.3 ツール配分と tool_choice(最小権限・auto/any/tool/none と既定値)/ 2.4 MCP サーバー統合(.mcp.json project vs ~/.claude.json user・環境変数展開・MCP resources)/ 2.5 組込みツール選択(Grep/Glob/Read/Write/Edit/Bash・Edit 失敗時の Read+Write) |
| F-D3 | Claude Code Configuration & Workflows | 20% | 3.1 CLAUDE.md 階層(user/project/directory・@import・.claude/rules/・/context でロード状況確認・/memory で一覧/編集)/ 3.2 スラッシュコマンドと skills(.claude/commands/・SKILL.md frontmatter: context: fork / allowed-tools / argument-hint)/ 3.3 path-specific rules(YAML frontmatter paths glob)/ 3.4 plan mode vs 直接実行(Explore subagent)/ 3.5 反復改善(入出力例・テスト先行・interview pattern・一括 vs 逐次修正)/ 3.6 CI/CD 統合(-p/--print・--output-format json・--json-schema・独立レビューインスタンス) |
| F-D4 | Prompt Engineering & Structured Output | 20% | 4.1 明示基準で精度向上(vague な「保守的に」は効かない・誤検知カテゴリの一時無効化)/ 4.2 few-shot(2〜4 例・曖昧ケース・形式統一)/ 4.3 tool_use + JSON schema(tool_choice・nullable・enum "other"+detail・構文 vs 意味エラー)/ 4.4 検証・リトライ・フィードバックループ(エラー付き再試行・retry が無効なケース・detected_pattern・calculated_total)/ 4.5 Message Batches API(50%・24h 処理窓/expiry・custom_id・client-side tool_result 往復不可・server tools loop 可・SLA 逆算)/ 4.6 多インスタンス・多パスレビュー(自己レビューの限界・per-file + integration pass・confidence 併記) |
| F-D5 | Context Management & Reliability | 15% | 5.1 長期会話の文脈保持(要約による数値喪失・lost-in-the-middle・case facts ブロック・ツール出力のトリミング)/ 5.2 エスカレーションと曖昧性解消(明示基準・顧客の明示要求は即時・sentiment/自己申告 confidence は不可・複数一致は追加識別子)/ 5.3 マルチエージェントのエラー伝播(構造化エラー文脈・access failure vs 空結果・局所回復・coverage 注記)/ 5.4 大規模コードベース探索の文脈管理(scratchpad・subagent 委任・manifest による crash recovery・/compact)/ 5.5 人間レビューと信頼度較正(層化抽出・文書種別/フィールド別精度・labeled set で閾値較正)/ 5.6 来歴と不確実性(claim-source mapping・矛盾の注記・日付必須・型に応じた描画) |

**v1.1 からの主な訂正**(`SOURCES.md` §1.3): D2 の「トランスポートのトレードオフ・認証パターン」、D5 の「プロンプトキャッシュ(cache_control)・トークン見積り」は公式の **Out-of-Scope**(MCP サーバーのデプロイ/ホスティング、OAuth/認証プロトコル、prompt caching の実装詳細、token counting algorithms / tokenization specifics)に該当するため削除。バンクではこれらを問題化しない。**ただし `Context window management — token budgets` は Appendix の出題対象概念**であり、コンテキスト予算の判断(ツール出力のトリミング・構造化事実抽出・subagent の予算配慮)は D5 5.1 / 5.4 として出題する。除外するのは計数アルゴリズム・tokenization の詳細のみ。

### 60 問へのドメイン配分(largest-remainder 法で固定・公式重みで確認済み)

27/18/20/20/15% × 60 = 16.2 / 10.8 / 12 / 12 / 9 → **16 / 11 / 12 / 12 / 9 問**。固定フォームはこの配分を満たすことを validator で検証する。

### 公式シナリオ(Guide §5・6 本、原文は `SOURCES.md` §2)

| # | シナリオ | Primary domains |
|---|---|---|
| 1 | Customer Support Resolution Agent(Agent SDK + MCP tools: get_customer / lookup_order / process_refund / escalate_to_human、FCR 80%+) | D1, D2, D5 |
| 2 | Code Generation with Claude Code(slash commands・CLAUDE.md・plan mode vs 直接実行) | D3, D5 |
| 3 | Multi-Agent Research System(coordinator + web search / document analysis / synthesis / report subagents) | D1, D2, D5 |
| 4 | Developer Productivity with Claude(Agent SDK + 組込みツール Read/Write/Bash/Grep/Glob + MCP) | D2, D3, D1 |
| 5 | Claude Code for Continuous Integration(自動コードレビュー・テスト生成・PR フィードバック・誤検知最小化) | D3, D4 |
| 6 | Structured Data Extraction(非構造化文書 → JSON schema 検証・エッジケース・下流統合) | D4, D5 |

模試フォーム(`07` Step 3b)のシナリオはこの 6 本の文脈と primary domains に準拠して自作する(Guide の文章そのものは転記しない)。公式サンプル問題 12 問(シナリオ 1 / 2 / 3 / 5 × 各 3 問)は文体・難易度・解説スタイルの基準として `SOURCES.md` §5 に転記済み。

### 出題範囲(Guide §17 Appendix)

In-Scope / Out-of-Scope の全リストは `content/ccar-f/SOURCES.md` §4。**CCAR-F の Out-of-Scope は F のバンクに出題しない**(P には流用しない。P は下記 CCAR-P §出題範囲): fine-tuning、API 認証/課金、言語・フレームワーク固有実装、MCP サーバーのデプロイ/ホスティング、モデル内部・学習、Constitutional AI/RLHF、embedding/ベクトル DB、computer use、vision、streaming/SSE、rate limit/料金計算、OAuth/キーローテーション、クラウド別設定、ベンチマーク、prompt caching 実装詳細、tokenization。

## CCAR-P: Claude Certified Architect – Professional($175)

(公式 Exam Guide v1.0 で突合済み・2026-09-29 CP0。転記原文と判断記録は `content/ccar-p/SOURCES.md`)

- **63 問**、**multiple-choice + multiple-response**(各問で選択数を明記。具体的な選択数の記述は Guide に無い)。バンクでは `mcq_single` / `mcq_multi` が対応(`03`)
- **出題構造**: Guide に**シナリオ構造の記述が無い**(F の "4 scenarios drawn from a bank of 6" に相当する記述なし)。受験記(`SOURCES.md` §1.1 追記)では各問が独立し、stem に 2〜4 文の状況説明が付く。**本アプリの P 模試は独立問題形式で確定**(オーナー決定 2026-10-03, T-pmock。`03` §mock_forms)。受験記にある「共通の選択肢で複数の小問に答える」形式(Yes/No Matrix・Drop-down Matching)は採点の一次情報が無く、`09` T-bundle で扱う
- 対象: ミッド〜シニアの技術職(solution architect / AI・ML engineer / tech lead / senior SWE)。推奨経験: systems architecture 3 年以上、本番 LLM システム 6 ヶ月以上

### ドメインと重み(公式 §6 Blueprint・一致を確認)

重みは "the approximate proportion of scored items drawn from each domain"。P のドメイン数は **7**。

| # | ドメイン | 重み | 詳細目標(公式 §6、`SOURCES.md` §3 に原文) |
|---|---|---|---|
| P-D1 | Solution Design & Architecture | 17% | 1.1 業務課題 → Claude ソリューション / 1.2 end-to-end アーキテクチャ(feedback loop 含む)/ 1.3 パターン選択(workflow・agentic・augmented LLM)/ 1.4 マルチエージェントとオーケストレーション / 1.5 分解技法 / 1.6 ビジネス価値の柱(効率・変革・生産性・コスト・性能 SLA) |
| P-D2 | Claude Models, Prompting & Context Engineering | 13% | 2.1 モデル選択のトレードオフ / 2.2 system prompt・テンプレート・guardrails / 2.3 zero-shot・few-shot・CoT / 2.4 コンテキストウィンドウ最適化とトークン管理 / 2.5 プロンプト再利用(caching・modular prompts・Skills) |
| P-D3 | Integration | 19% | 3.1 ツール・エージェント構成の capability bloat / 3.2 認証・認可要件のセキュリティギャップ / 3.3 精度 - レイテンシのトレードオフ / 3.4 大規模 observability と監視戦略 / 3.5 RAG(chunking・indexing)/ 3.6 データ形状・クエリに合わせた retrieval / 3.7 接続方式(MCP・API/CLI・agent-to-agent)/ 3.8 progressive discovery vs monolithic context |
| P-D4 | Evaluation, Testing & Optimization | 16% | 4.1 評価指標(精度・レイテンシ・コスト・安全性・セキュリティ)/ 4.2 評価データセットと混合手法のテスト / 4.3 A/B テストと反復改善 / 4.4 障害診断(prompt failure・hallucination・model mismatch)/ 4.5 トークン・レイテンシ・コスト最適化 / 4.6 ロギング・observability による監視 |
| P-D5 | Governance, Safety & Risk Management | 14% | 5.1 guardrails と安全統制 / 5.2 リスク・限界・故障モード / 5.3 human-in-the-loop 検証 / 5.4 規制準拠(GDPR・HIPAA・FedRAMP)/ 5.5 倫理(bias・fairness・transparency) |
| P-D6 | Stakeholder Communication & Lifecycle Management | 14% | 6.1 構造化 discovery と要件収集 / 6.2 意思決定とトレードオフの伝達 / 6.3 フィードバックループと期待値調整(SLA 含む)/ 6.4 アーキテクチャ文書化と実装ガイダンス / 6.5 ライフサイクル(discovery・design・handoff・monitoring・iteration) |
| P-D7 | Developer Productivity & Operational Enablement | 7% | 7.1 チーム向け Claude ツール・環境設定(Claude Code 等)/ 7.2 AI 支援ツールによる開発ワークフロー改善 / 7.3 デバッグと運用上の問題解決 |

63 問への配分は Guide に記述が無い。本アプリの固定フォームは largest-remainder で **11 / 8 / 12 / 10 / 9 / 9 / 4** に確定(T-pmock。計算は `SOURCES.md` §1.1、正本は `03` §mock_forms)。

### 出題範囲

P の Guide には In-Scope / Out-of-Scope の Appendix が**無い**。出題範囲は上表の 38 目標と Guide §7(Claude API・models・prompt engineering・MCP・Skills の公式ドキュメント)で読む。**CCAR-F の Out-of-Scope は P に流用しない**: prompt caching(2.5・サンプル 2)、認証・認可(3.2)、RAG / embedding(3.5・3.6・サンプル 3)は P では出題対象(`SOURCES.md` §4)。

### F との差分

D5 / D6 / D7(計 35%)は**ドメインとしては** F に無いが、目標単位では D7 は F-D3 とほぼ重なり、D5 の guardrails・HITL も F と重なる。F に対応の無い領域は D6 全体、D5 の規制準拠・倫理、D3 の RAG・retrieval・observability・認証認可、D4 の評価・監視、D1 / D2 のビジネス整合・モデル選択。P 38 目標 × F task statement の重なりマップ(強 / 部分 / なし)は `SOURCES.md` §8 が正本で、CP2 の優先付けと F カードとの重複回避に使う。F バンクから流用する場合も**新 ID を採番して移植**する(`07` 参照)。

## トピックツリーの構造方針

- 階層: `exam > domain > task_statement > topic`。**task_statement 層は公式の 30 本(7/5/6/6/6)と 1:1**(ID: `f-dn-tm`)。問題は primary topic 1 つに帰属(集計単位)、関連 topic は secondary として保持
- topic の粒度: フラッシュカード 3〜5 枚で覆える概念単位。F 全体で 60〜80 topics 目安(task statement あたり 2〜3)
- ツリーは `content/ccar-f/syllabus.yaml` が単一ソース(Step 1 = C1 で作成、オーナー粒度レビュー)
- **CCAR-P**: task_statement 層は公式詳細目標 **38 本(6/5/8/6/5/5/3)** と 1:1(ID: `p-dn-tm`。Guide は番号無しの bullet のため、列挙順に採番。`content/ccar-p/SOURCES.md` §3)。topic は同じ粒度規則(task statement あたり 2〜3)で **76〜114 topics** 目安。ツリーは `content/ccar-p/syllabus.yaml`(CP1)

## 主要ソース

- 公式 Exam Guide v1.0(CCAR-F): Partner Academy 配布 PDF(`ExamGuide/CCAR-F.pdf`、SHA-256 は `content/ccar-f/SOURCES.md` §0)
- 公式 Exam Guide v1.0(CCAR-P): Partner Academy 配布 PDF(`ExamGuide/CCAR-P.pdf`、SHA-256 は `content/ccar-p/SOURCES.md` §0)
- Pearson VUE: https://www.pearsonvue.com/us/en/anthropic.html
- Anthropic Academy 対応コース(無料)、docs.claude.com、Anthropic engineering ブログ(解説 refs の一次参照先)

# CCAR-P ソーススナップショット(`07` Step 0 成果物・CP0)

本ファイルは公式 Exam Guide の**転記**(英語原文をそのまま保持)と、`02` / `07` / README への反映判断の記録。P のバンク生成(CP1 以降)の一次参照先(根拠資料)。**仕様の正本は引き続き `specs/`**(AGENTS.md): 公式と specs の食い違いを見つけたら、本ファイルに追従するのではなく **spec を先に更新**し、その判断を本ファイル §10 / §11 に記録する。構成は `content/ccar-f/SOURCES.md` に揃える(Guide に該当節が無いものは「該当なし」と明記)。

## 0. スナップショット

| 項目 | 値 |
|---|---|
| 文書 | Claude Certified Architect – Professional Exam Guide |
| Version | **1.0** · Effective July 2026 · Exam code: CCAR-P · "This guide is subject to change without notice." |
| Document Control(§16) | 1.0 Initial publication (July 2026) |
| ファイル | `ExamGuide/CCAR-P.pdf` |
| SHA-256 | `19a111ae61a07066ebe26f7f2b87744f8266cfc0d47093a1d5bbf61e12dd4221` |
| 取得・転記日 | 2026-09-29(CP0) |
| 転記方法 | `pdftotext -layout` で抽出し、ページヘッダ除去・行結合のみ。語句は改変しない |

改訂トリガー(`07` 原則): (a) Exam Guide の version / errata、(b) フラグで判明した明確な事実誤り、のみ。Guide の新版を検知したら本表の Version / SHA-256 を更新し、差分を §11 に追記する。

### 参照 docs スナップショット(バンク refs の一次参照先)

| ソース | 参照開始日 | 備考 |
|---|---|---|
| docs.claude.com(Claude API / models / prompt engineering / MCP / Skills / Claude Code) | 2026-09-29 | Guide §7 が名指しする範囲。各問題の `refs` に URL を記載 |
| Anthropic Academy(公式コース) | 2026-09-29 | 解説の補助参照 |
| Anthropic engineering ブログ | 2026-09-29 | 解説 refs の一次参照先 |

refs ソース台帳(F の §10 に相当)は CP2 で本ファイルに追加する。サードパーティ問題集は参照・転記禁止(`07` 原則)。

## 1. 試験構造(Exam Details at a Glance §5 / Scoring §9 転記)

| 項目 | 公式記述(原文) |
|---|---|
| Credential | Claude Certified Architect – Professional |
| Exam code | CCAR-P |
| Number of items | **63** |
| Item format | Multiple-choice **and multiple-response** items; each item states how many responses to select |
| Time limit | 120 minutes |
| Delivery | Proctored: online proctored and/or test center, per program policy |
| Passing score | Scaled score of **720** on a scale of 100–1,000 |
| Exam fee | $175 USD |
| Validity period | 12 months from the date the credential is awarded |
| Result reporting | Pass/fail with scaled score (100–1,000), plus percent-correct by domain on the score report |

F の "Exam structure: 4 scenarios drawn from a bank of 6" に相当する行は **P の表に存在しない**。

§9 要点: criterion-referenced(相対評価ではない)。cut score 720 は standard-setting study で設定。ドメイン別 % は参考情報で合否判定には使わない("Section-level percentages ... are not used to determine your pass or fail result, which is based on your total scaled score.")。

### 1.1 模試構造の Guide 上の事実(`07` §CCAR-P Step 0)— **ここでは記録のみ。`03` §mock_forms への仕様化は T-pmock(停止条件: Mock のスコア)**

| 観点 | Guide の記述 | 備考 |
|---|---|---|
| 問題数 | **63**(§5 "Number of items 63") | 採点対象外の未採点問題の有無は記述なし |
| ドメイン配分 | 7 ドメインの重み(§6、§1.2)。"The percentages indicate the approximate proportion of **scored items** drawn from each domain." | 問題数への丸め方は記述なし |
| シナリオ構造 | **記述なし**。Guide 全文に "scenario" の語は §13(NDA: "questions, answer options, and scenarios")の 1 回のみで、出題構造としての言及は無い | **独立問題形式か否かは Guide では未確認**。サンプル問題(§8)3 問はいずれも独立した 4 択単一正解だが、"They are not drawn from the live item bank" とある例示であり本試験構造の根拠にはならない |
| multiple-response の選択数 | "each item states how many responses to select" のみ。**具体的な選択数(2 つ / 3 つ等)・選択肢数の記述なし** | サンプル 3 問は全て A–D の 4 択・単一正解 |
| フォーム本数 | Guide の範囲外(本アプリの模試フォームは自作) | `03` / T-pmock で決める |
| 時間 | 120 分 / 63 問(約 1.9 分/問) | |

- **P のドメイン数 = 7**(`09` §1 の 6「抜き取り」を P で読むときの値。各ドメイン 5 問 → 35 問)
- F の §1.1(「各シナリオ 15 問」の判定)に相当する論点は、シナリオ記述が無いため P では発生しない

### 1.2 ドメイン配分(§6 Blueprint)— `02` の重みを**確認**

| Domain | Content Domain | Weight |
|---|---|---|
| 1 | Solution Design & Architecture | 17% |
| 2 | Claude Models, Prompting & Context Engineering | 13% |
| 3 | Integration | 19% |
| 4 | Evaluation, Testing & Optimization | 16% |
| 5 | Governance, Safety & Risk Management | 14% |
| 6 | Stakeholder Communication & Lifecycle Management | 14% |
| 7 | Developer Productivity & Operational Enablement | 7% |

**参考計算(確定値ではない)**: 17/13/19/16/14/14/7% × 63 = 10.71 / 8.19 / 11.97 / 10.08 / 8.82 / 8.82 / 4.41 → largest-remainder(切り捨て 59、残り 4 を端数 .97 / .82 / .82 / .71 の D3・D5・D6・D1 へ)で **11 / 8 / 12 / 10 / 9 / 9 / 4**(端数の同値 D5 = D6 は両方とも加算対象のためタイブレーク不要)。Guide は "approximate proportion of scored items" としか述べないため、フォームの問題数とドメイン配分は **T-pmock 冒頭でオーナー承認を経て `03` §mock_forms に確定する**。`02` にはこの値を固定値として書かない。

### 1.3 `02` との突合結果(公式優先で `02` を v1.3 に更新)

| 項目 | `02` v1.2(Web 調査ベース) | 公式 v1.0 | 処置 |
|---|---|---|---|
| 問題数 | 63 | 63(一致) | 公式確認済みと明記 |
| 設問形式 | multiple-choice + multiple-response | 一致(選択数は問題ごとに表示、具体値の記述なし) | 同上 |
| 独立問題形式 | 「独立問題形式」と断定 | **シナリオ構造の記述なし**(独立問題とも書かれていない) | 「Guide 未確認」に訂正。形式の確定は T-pmock。README 試験表・`07` §CCAR-P の断定も訂正 |
| ドメインと重み | 7 ドメイン 17/13/19/16/14/14/7 | 一致 | 公式確認済みと明記。詳細目標(§3)の要約を追記 |
| 対象者 | ミッド〜シニアのソリューションアーキテクト | "mid- to senior-level technical professionals ... solution architects, AI/ML engineers, technical leads, and senior software engineers"(一致) | 変更なし |
| 受験料 | $175 | $175(一致) | 変更なし |
| F との差分 | 3 ドメイン(計 35%)は「F に存在しない」 | ドメインとしては F に無いが、**目標単位では D5 / D7 の一部が F と重なる**(§8) | 「F との差分」を §8 の重なりマップ参照に書き換え |
| 出題範囲 | (記載なし) | **In-Scope / Out-of-Scope の Appendix が無い**(§4) | F の Out-of-Scope リストを P に流用しない旨を追記 |

## 2. 公式シナリオ

**該当なし**。P の Guide にはシナリオの一覧・抽選方式・primary domains の記述が無い(§1.1)。

## 3. ドメイン別詳細目標(§6 "Detailed objectives by domain" 転記・38 本)

原文前文: "Each domain below lists the tasks a candidate is expected to perform. Exam items are written against these objectives."

Guide の目標は**番号の無い bullet**。`02` §トピックツリーの task_statement 層はこの 38 本と 1:1 とし、Guide の列挙順に番号を振る(本ファイルでの採番。Guide の番号ではない)。ID 対応: Domain n → `p-dn`、n 番目ドメインの m 番目の目標 → `p-dn-tm`。

| Domain | 本数 | 目標 |
|---|---|---|
| 1 Solution Design & Architecture | 6 | 1.1–1.6 |
| 2 Claude Models, Prompting & Context Engineering | 5 | 2.1–2.5 |
| 3 Integration | 8 | 3.1–3.8 |
| 4 Evaluation, Testing & Optimization | 6 | 4.1–4.6 |
| 5 Governance, Safety & Risk Management | 5 | 5.1–5.5 |
| 6 Stakeholder Communication & Lifecycle Management | 5 | 6.1–6.5 |
| 7 Developer Productivity & Operational Enablement | 3 | 7.1–7.3 |

### Domain 1: Solution Design & Architecture (17%)
- **1.1** Translate business problems into Claude-based AI solutions
- **1.2** Design end-to-end architectures (input → processing → output → feedback loops)
- **1.3** Select appropriate architectural patterns (workflow, agentic, augmented LLM)
- **1.4** Design multi-agent systems and orchestration strategies
- **1.5** Apply decomposition techniques for complex problem solving
- **1.6** Align solutions to business value pillars (efficiency, transformation, productivity, cost, performance SLAs)

### Domain 2: Claude Models, Prompting & Context Engineering (13%)
- **2.1** Select appropriate Claude models based on trade-offs
- **2.2** Design system prompts, templates, and guardrails
- **2.3** Apply prompt engineering techniques (zero-shot, few-shot, chain-of-thought)
- **2.4** Optimize context windows and manage token usage
- **2.5** Implement prompt reuse strategies (caching, modular prompts, Skills)

### Domain 3: Integration (19%)
- **3.1** Evaluate tool/agent configuration for capability bloat
- **3.2** Analyze authentication and authorization requirements to identify security gaps
- **3.3** Evaluate accuracy-latency trade-offs and justify configuration decisions
- **3.4** Analyze observability challenges and select monitoring strategies at scale
- **3.5** Design a RAG pipeline with appropriate chunking and indexing strategies
- **3.6** Apply retrieval strategies matched to data shape and query pattern
- **3.7** Evaluate connection protocols and select the appropriate integration mechanism (MCP, API/CLI, agent-to-agent)
- **3.8** Evaluate progressive discovery vs. monolithic context strategy

### Domain 4: Evaluation, Testing & Optimization (16%)
- **4.1** Define evaluation metrics (accuracy, latency, cost, safety, security)
- **4.2** Design evaluation datasets and test frameworks using mixed methodologies
- **4.3** Conduct A/B testing and iterative improvements
- **4.4** Diagnose system issues (prompt failure, hallucinations, model mismatch)
- **4.5** Optimize token usage, latency, and cost-performance trade-offs
- **4.6** Monitor system performance using logging and observability tools

### Domain 5: Governance, Safety & Risk Management (14%)
- **5.1** Implement guardrails and safety controls
- **5.2** Identify risks, limitations, and failure modes of LLM systems
- **5.3** Apply human-in-the-loop validation strategies
- **5.4** Ensure compliance with regulations (e.g., GDPR, HIPAA, FedRAMP)
- **5.5** Address ethical AI considerations (bias, fairness, transparency)

### Domain 6: Stakeholder Communication & Lifecycle Management (14%)
- **6.1** Conduct structured discovery and requirement gathering
- **6.2** Communicate architectural decisions and trade-offs
- **6.3** Manage stakeholder feedback loops and expectation alignment (including SLAs)
- **6.4** Document architectures and provide implementation guidance
- **6.5** Support lifecycle phases (discovery, design, handoff, monitoring, iteration)

### Domain 7: Developer Productivity & Operational Enablement (7%)
- **7.1** Configure Claude tools and environments for teams (e.g., Claude Code)
- **7.2** Improve developer workflows using AI-assisted tooling
- **7.3** Support debugging and operational issue resolution

## 4. 出題範囲の明示

**該当なし**: P の Guide には F の §17 Appendix に相当する Technologies and Concepts / In-Scope / Out-of-Scope のリストが**存在しない**。出題範囲は §3 の 38 目標と §7 How to Prepare("official Anthropic documentation for the Claude API, models, prompt engineering, MCP, and Skills")で読む。

**F の Out-of-Scope(`content/ccar-f/SOURCES.md` §4.3)は F 専用であり、P に流用しない**。F で範囲外だった次の領域は、P では目標またはサンプルで明示的に出題対象になっている:

| F で Out-of-Scope | P での根拠 |
|---|---|
| Prompt caching implementation details | 2.5 "prompt reuse strategies (caching, ...)"、Sample 2(静的 prefix + prompt caching が正解) |
| OAuth / authentication protocol details、API 認証 | 3.2 "Analyze authentication and authorization requirements to identify security gaps" |
| Embeddings / vector databases | 3.5 RAG pipeline(chunking / indexing)、3.6 retrieval strategies、Sample 3 の解説("mismatched embeddings") |
| Rate limit / 料金計算、ベンチマーク | 3.3 accuracy-latency、4.1 metrics(cost)、4.5 cost-performance(料金の暗記ではなくトレードオフ判断として) |

P の生成時(CP2 以降)は、公式ドキュメントで裏付けられる設計判断として問題化する。価格・レート制限の具体数値など改定の早い値の暗記問題は、改訂トリガー運用(`07` 原則)を踏まえて避ける(これは本アプリの制作方針であり Guide の記述ではない)。

## 5. 公式サンプル問題(§8 転記・3 問)

原文: "These illustrative items show the style and cognitive level of the exam. They are not drawn from the live item bank. Correct answers and rationale appear after the questions."

文体・難易度・解説スタイル(正解の根拠 + 各誤答が劣る理由)の**基準**。3 問とも 4 択・単一正解で、各問の見出しにドメインが付く。**これらはバンクに転記しない**(Guide の再配布に当たるため。バンクは同型の自作問題のみ)。

### Sample 1 · Domain 3 — Integration

A team exposes a customer-support agent that can read tickets, draft replies, issue refunds, and delete user accounts. Support staff only ever need to read tickets and draft replies. Applying least-privilege principles, which change best reduces risk?
- A. Add logging to the refund and delete tools so misuse can be audited later.
- B. Remove the refund and delete tools from the agent's configuration entirely.
- C. Keep all tools but add a confirmation prompt before refunds and deletions.
- D. Replace the agent with a larger model that follows instructions more reliably.

**Answer: B.** Least privilege means removing capabilities the role does not require, eliminating the attack surface rather than monitoring or guarding it. Logging (A) and confirmations (C) are detective/compensating controls, not removal of unnecessary privilege; model size (D) is unrelated to authorization scope.

### Sample 2 · Domain 2 — Models, Prompting & Context

An application sends the same 8,000-token system prompt and policy document on every request, followed by a short, varying user message. Latency and cost are both concerns. Which optimization most directly addresses both?
- A. Truncate the policy document to the first 1,000 tokens.
- B. Switch to the smallest available model regardless of task fit.
- C. Place the static system prompt and policy before the dynamic content and enable prompt caching.
- D. Move the policy document into a few-shot example block.

**Answer: C.** Ordering stable content first and enabling prompt caching lets repeated prefixes be reused, reducing both time-to-first-token and per-request cost without discarding required context. Truncation (A) loses needed policy; downsizing blindly (B) risks quality; relocating to few-shot (D) does not create a cacheable, reusable prefix.

### Sample 3 · Domain 4 — Evaluation & Optimization

A RAG system suddenly returns confident but incorrect answers after a document refresh, while latency and model version are unchanged. What is the most likely first place to investigate?
- A. The model weights have silently changed.
- B. The retrieval/indexing step is returning irrelevant or stale chunks.
- C. The temperature setting is too low.
- D. The context window has shrunk.

**Answer: B.** Confident-but-wrong answers following a document refresh, with model and latency unchanged, point to retrieval feeding the model poor context, for example a broken re-index or mismatched embeddings. The other options would not be triggered specifically by a document refresh.

### 5.1 サンプルから読み取る出題パターン(バンク生成への指針)

| パターン | 例 | 設計への反映 |
|---|---|---|
| 「予防的統制 > 検知的・補償的統制」 | Sample 1(ツール除去 > ログ / 確認プロンプト) | 最小権限・capability bloat(3.1 / 3.2 / 5.1)では「権限そのものを外す」が正解側、監査ログ・確認ダイアログ・大きいモデルは誤答側 |
| 「必要な文脈を捨てずに 2 つの制約を同時に満たす」 | Sample 2(静的 prefix を先頭 + caching) | 切り詰め・盲目的なモデル縮小・置き場所の移動だけ、を誤答に(2.4 / 2.5 / 4.5) |
| 「直近の変化と症状を結び付けて最初の調査箇所を選ぶ」 | Sample 3(document refresh → retrieval / indexing) | 不変条件(latency・model version)で排除できる選択肢を誤答に。"most likely first place" 型(3.5 / 3.6 / 4.4) |
| 「モデルを変えれば解決」は誤答側 | Sample 1 D、Sample 2 B | 2.1 のモデル選択は「タスク適合を前提としたトレードオフ」として問う |

## 6. 準備指針(§7 要約・原文は PDF 参照)

§7 How to Prepare: blueprint(§6)で各目標を自己評価、公式ドキュメント(Claude API・models・prompt engineering・MCP・Skills)を読む、RAG・評価・observability を含む end-to-end の Claude ソリューションを少なくとも 1 つ構築・運用、アーキテクチャ判断(モデル選択・統合プロトコル・セキュリティのトレードオフ)を練習、§8 のサンプル問題を解く。F の §8 Preparation Exercises に相当する節は**無い**。

§4 推奨経験: ソフトウェア工学の基礎(modular design・separation of concerns・scalability)、systems architecture / platform engineering 3 年以上、本番の Claude または同等 LLM システムのハンズオン 6 ヶ月以上、discovery から deployment・operationalization までの end-to-end 経験。必須の前提資格・コースは無い(F の取得も前提ではない)。

## 7. 受験ポリシー(§10–§15 要点・オーナー向け)

- 登録: Anthropic Partner Academy → Pearson VUE。キャンセル・日程変更は **24 時間前まで**(以後は受験料没収)。受験料は partner tier の割引が checkout に反映される
- 当日: 有効な政府発行の写真付き ID、登録名と完全一致。オンライン受験はカメラの視野内に留まり、机上に資料・電話・セカンドモニター等を置かない
- 再受験: 待機期間 1 回目 14 日 / 2 回目 30 日 / 3 回目 90 日。12 ヶ月のローリング期間で最大 4 回(試験ごとに独立)
- 有効期限: 取得日から 12 ヶ月。期限内の更新は Partner Academy の無料・非監督の assessment
- NDA: 試験内容(問題・選択肢・シナリオ)の開示・複製・配布禁止。本アプリのバンクは自作問題のみで構成し、本番問題を記録しない
- 不服申立て: 通知から 14 日以内(結果については受験日から 14 日以内)に Pearson VUE へ

## 8. F バンクとの重なりマップ(CP2 以降で F カードとの重複を避ける根拠)

P の 38 目標を F の task statement(`content/ccar-f/SOURCES.md` §3、ID `f-dn-tm`)と照合した結果。**強** = F の task statement が同じ判断を直接扱う / **部分** = 一部の観点(技法・用語)だけ重なる / **なし** = F に対応が無い。重なりがあっても P の問題は**新 ID で自作**する(`07` §CCAR-P。F の問題の流用も新 ID 採番)。P は architect 視点(ビジネス要件・トレードオフ・組織)で問うため、「強」でも F のカードをそのまま再利用しない。

| P 目標 | 重なり | F task statement | 補足 |
|---|---|---|---|
| 1.1 業務課題 → Claude ソリューション | なし | — | |
| 1.2 end-to-end アーキテクチャ(feedback loop 含む) | 部分 | f-d4-t4 | validation / feedback loop のみ |
| 1.3 アーキテクチャパターン(workflow / agentic / augmented LLM) | 部分 | f-d1-t1, f-d1-t6 | agentic loop・prompt chaining のみ。augmented LLM と選択基準は新規 |
| 1.4 マルチエージェントとオーケストレーション | 強 | f-d1-t2, f-d1-t3 | |
| 1.5 分解技法 | 強 | f-d1-t6 | |
| 1.6 ビジネス価値の柱(効率・コスト・SLA 等) | なし | — | |
| 2.1 モデル選択のトレードオフ | なし | — | |
| 2.2 system prompt・テンプレート・guardrails | 部分 | f-d4-t1, f-d1-t4 | 明示基準・programmatic enforcement |
| 2.3 zero-shot / few-shot / CoT | 部分 | f-d4-t2 | few-shot のみ |
| 2.4 コンテキストウィンドウ・トークン管理 | 部分 | f-d5-t1, f-d5-t4 | token budgets の判断 |
| 2.5 プロンプト再利用(caching・modular・Skills) | 部分 | f-d3-t2 | Skills のみ。caching は F で範囲外(§4) |
| 3.1 capability bloat の評価 | 強 | f-d2-t3, f-d2-t1 | 最小権限・ツール配分 |
| 3.2 認証・認可の要件分析 | 部分 | f-d2-t3 | 最小権限の観点のみ。認証・認可そのものは F で範囲外 |
| 3.3 精度 - レイテンシのトレードオフ | 部分 | f-d4-t5 | Batches(非同期)とレイテンシ要件の対応のみ |
| 3.4 大規模 observability と監視戦略 | なし | — | |
| 3.5 RAG(chunking / indexing) | なし | — | F で範囲外(embedding) |
| 3.6 データ形状・クエリに合わせた retrieval | なし | — | |
| 3.7 接続方式の選択(MCP / API・CLI / agent-to-agent) | 部分 | f-d2-t4 | MCP 統合のみ |
| 3.8 progressive discovery vs monolithic context | 部分 | f-d2-t4, f-d3-t3, f-d5-t4 | MCP ツールの遅延ロード・path-specific rules・subagent 委任 |
| 4.1 評価指標(精度・レイテンシ・コスト・安全性) | なし | — | |
| 4.2 評価データセット・テストフレームワーク | 部分 | f-d5-t5 | labeled set・層化抽出 |
| 4.3 A/B テストと反復改善 | 部分 | f-d3-t5 | 反復改善技法のみ。A/B は新規 |
| 4.4 障害診断(prompt failure・hallucination・model mismatch) | 部分 | f-d4-t4, f-d5-t6 | |
| 4.5 トークン・レイテンシ・コスト最適化 | 部分 | f-d4-t5, f-d5-t1 | Batches の 50%・出力トリミング |
| 4.6 ロギング・observability による監視 | なし | — | |
| 5.1 guardrails と安全統制 | 部分 | f-d1-t4, f-d1-t5 | hooks・programmatic enforcement |
| 5.2 LLM システムのリスク・限界・故障モード | 部分 | f-d5-t1, f-d4-t6 | lost-in-the-middle・自己レビューの限界 |
| 5.3 human-in-the-loop 検証 | 強 | f-d5-t5, f-d5-t2 | |
| 5.4 規制準拠(GDPR / HIPAA / FedRAMP) | なし | — | |
| 5.5 倫理(bias・fairness・transparency) | なし | — | |
| 6.1〜6.5 discovery・意思決定の伝達・期待値調整・文書化・ライフサイクル | なし | — | D6 全体 |
| 7.1 チーム向け Claude ツール・環境設定(Claude Code) | 強 | f-d3-t1, f-d3-t2, f-d3-t3, f-d2-t4 | |
| 7.2 AI 支援ツールによる開発ワークフロー改善 | 強 | f-d3-t4, f-d3-t5, f-d3-t6 | |
| 7.3 デバッグと運用上の問題解決 | 部分 | f-d2-t5, f-d5-t4 | |

集計: 強 6(1.4 / 1.5 / 3.1 / 5.3 / 7.1 / 7.2)・部分 17・なし 15(D6 の 5 本を含む)。**ドメインとしては D5 / D6 / D7 が F に無いが、目標単位では D7 は F-D3 とほぼ重なり、D5 も guardrails・HITL が F と重なる。F に対応の無い領域は D6 全体、D5 の 5.4 / 5.5、D3 の RAG・retrieval・observability・認証認可、D4 の評価・監視、D1 / D2 のビジネス整合・モデル選択**。CP2 の優先付けはこの「なし」「部分」を先にする根拠として使う(`07` §CCAR-P Step 2)。

## 9. CP1(Step 1)への申し送り

- **task_statement 層**: §3 の 38 本と 1:1(6 / 5 / 8 / 6 / 5 / 5 / 3、ID `p-dn-tm`)
- **topic 数の範囲**: F と同じ粒度規則(task statement あたり 2〜3、フラッシュ 3〜5 枚で覆える概念単位)を適用し **76〜114 topics**(`09` CP1 の「CP0 で決めた範囲」)
- **P 内で目標が重なるペア(primary 境界の注記が必要)**: 問題は primary topic 1 つに帰属するため、CP1 で F の【primary 境界】注記と同様の振り分け規則を書く
  - 2.4 context windows / token usage ⇔ 4.5 token usage / latency / cost 最適化
  - 3.4 observability / monitoring strategies at scale ⇔ 4.6 logging / observability tools による監視
  - 3.3 accuracy-latency trade-offs ⇔ 4.5 cost-performance trade-offs
  - 1.4 multi-agent systems ⇔ 1.5 decomposition techniques
  - 2.2 guardrails(prompt 側)⇔ 5.1 guardrails and safety controls(統制側)
  - 6.5 lifecycle phases(monitoring / iteration)⇔ 4.3 iterative improvements / 4.6 monitoring
- **サンプル問題の割当**: Sample 1 は見出し上 Domain 3(least privilege → 3.1 / 3.2)、Sample 2 は Domain 2(2.5)、Sample 3 は Domain 4(4.4)

## 10. 本ファイルが更新した specs

| spec | 箇所 | 内容 |
|---|---|---|
| `02` | CCAR-P 節・トピックツリー方針・主要ソース | 公式 v1.0 で突合済みに書き換え(v1.3)。独立問題形式は Guide 未確認と明記、詳細目標 38 本の要約、出題範囲(Appendix 無し・F の Out-of-Scope を流用しない)、F との差分を §8 参照に、P の task_statement / topic 数、CCAR-P PDF の SHA-256 |
| `07` | §CCAR-P フェーズ(Step 2 / Step 3a の行) | Step 2 の優先根拠を「F に無い 3 ドメイン(計 35%)」から §8 の重なりマップへ。Step 3a 不適用の根拠を「独立問題形式」の断定から「Guide にシナリオ記述が無いための暫定制作方針(T-pmock で見直し)」へ |
| `README` | 試験表・未確定事項 | 試験表の「独立問題」を「シナリオ記述なし」に。未確定事項に CP0 完了分と T-pmock の確認事項を反映 |

`09` CP2 行と `08` の「F に無い 3 ドメイン」表現は CP0 の spec 範囲外のため `tasks/backlog/B-CP0-1.md` に起票。

## 11. 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-09-29 | 初版(CP0)。Exam Guide v1.0 を転記 |
| 2026-09-30 | CP1: §3 の 38 目標と 1:1 の `syllabus.yaml`(108 topics)を作成。§9 の P 内重なり 6 ペアは両側の scope_ja に【primary 境界】を記載。`form_questions` は T-pmock 確定まで書かない |
| 2026-09-30 | CP3: 独立 MCQ の ID 帯(q501〜q599・ドメイン内連番)と CP3 の refs 台帳 88 URL(#301〜#388、curl で 200 確認)を §13(CP3 節)に追加。独立 MCQ 76 問(12/10/13/11/10/10/10、mcq_single のみ)を flagged で生成。配分根拠は `content/ccar-p/CP3-allocation.md`。Step 4 は別セッション(step4-review)で実施 |
| 2026-09-30 | CP3 Step 4: 独立レビュー 2 周(1 周目 P1 1 / P2 21、2 周目 P1 0 / P2 8 を修正)、refs 突合(使用 52 URL)、P 内・F バンクとの重複統合。許可ソースで裏付けられない 3 topic(B-CP2-1)に割り当てていた p-d2-q510 / p-d3-q512 / p-d6-q503 を同じ task statement 内の topic へ差し替え。全 76 問を active 化。記録は `content/ccar-p/CP3-allocation.md` §Step 4 |

## 13. CP3: 独立 MCQ の ID 帯と refs ソース台帳(2026-09-30)

CP3(`07` Step 5 相当・独立 MCQ)専用の節。CP2(flash)が追加する台帳・帯と独立させ、merge は URL 行の和集合で解消する(オーナー決定 2026-09-30)。

### 13.1 独立 MCQ の ID 帯(B-D6-3-3)

- **`q501〜q599` = 独立 MCQ**(form 非収載・`eligible_modes: ["mock","practice"]`・`srs_eligible: true`・`scenario_id: null`)。ドメインごとに q501 からの連番(retired も履歴として含む)。F の C5 帯(`content/ccar-f/SOURCES.md` §9 2026-09-03)と同じ番号域で、flash の `q001〜` と衝突しない
- `scripts/audit-practice-mcq.ts --exam ccar-p` が同じ定義(`BAND_P_INDEPENDENT`)で帯・連番を検査する。form 非収載の P MCQ が帯の外にあれば error
- 配分と新規 ID 一覧は `content/ccar-p/CP3-allocation.md`

### 13.2 refs ソース台帳(CP3)

独立 MCQ の `refs` は本表(と CP2 が追加する台帳)の「ref URL」列の URL **のみ**を使用する。全 URL は 2026-09-30 に curl で HTTP 200 とタイトルの整合を確認済み。docs.claude.com は platform.claude.com / code.claude.com へ 301 リダイレクトされる(「正規 URL」列が最終到達先)。許可ソースは `07` 原則(docs.claude.com / Anthropic Academy / Anthropic 公式ブログ・engineering・research)のみで、trust.anthropic.com・privacy.claude.com は使わない。番号は CP2 の台帳(§12)と衝突しないよう 301 から振る。節番号も CP2 の §12 と分けて §13 とする。

| # | ref URL | 正規 URL(最終到達先) | 主な対応目標(§3) |
|---|---|---|---|
| 301 | https://www.anthropic.com/engineering/building-effective-agents | www.anthropic.com/research/building-effective-agents | 1.1, 1.3, 1.5, 3.3 |
| 302 | https://www.anthropic.com/engineering/built-multi-agent-research-system | (直接) | 1.4, 1.5, 4.2, 4.6 |
| 303 | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents | (直接) | 2.4, 3.8 |
| 304 | https://www.anthropic.com/engineering/writing-tools-for-agents | (直接) | 3.1, 4.2 |
| 305 | https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents | (直接) | 1.4, 2.4 |
| 306 | https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills | (直接) | 2.5, 3.8 |
| 307 | https://www.anthropic.com/engineering/code-execution-with-mcp | (直接) | 3.7, 3.8, 4.5 |
| 308 | https://www.anthropic.com/engineering/advanced-tool-use | (直接) | 3.1, 3.8 |
| 309 | https://www.anthropic.com/engineering/contextual-retrieval | (直接) | 3.5, 3.6 |
| 310 | https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents | (直接) | 4.1, 4.2, 4.3 |
| 311 | https://www.anthropic.com/engineering/claude-think-tool | (直接) | 2.3 |
| 312 | https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues | (直接) | 3.4, 4.4, 4.6 |
| 313 | https://www.anthropic.com/engineering/claude-code-sandboxing | (直接) | 7.1 |
| 314 | https://www.anthropic.com/engineering/claude-code-best-practices | code.claude.com/docs/en/best-practices | 7.2, 7.3 |
| 315 | https://www.anthropic.com/news/evaluating-and-mitigating-discrimination-in-language-model-decisions | (直接) | 5.5 |
| 316 | https://www.anthropic.com/research/agentic-misalignment | (直接) | 5.2 |
| 317 | https://www.anthropic.com/transparency | (直接) | 5.5 |
| 318 | https://www.anthropic.com/news/claude-gov-models-for-u-s-national-security-customers | (直接) | 5.4 |
| 319 | https://www.anthropic.com/news/offering-expanded-claude-access-across-all-three-branches-of-government | (直接) | 5.4 |
| 320 | https://docs.claude.com/en/docs/about-claude/models/overview | platform.claude.com/docs/en/models/overview | 2.1 |
| 321 | https://docs.claude.com/en/docs/about-claude/models/choosing-a-model | platform.claude.com/docs/en/about-claude/models/choosing-a-model | 2.1 |
| 322 | https://docs.claude.com/en/docs/about-claude/models/migrating-to-claude-4 | platform.claude.com/docs/en/about-claude/models/migration-guide | 2.1, 4.4 |
| 323 | https://docs.claude.com/en/docs/about-claude/model-deprecations | platform.claude.com/docs/en/about-claude/model-deprecations | 2.1, 6.5 |
| 324 | https://docs.claude.com/en/docs/build-with-claude/prompt-caching | platform.claude.com/docs/en/build-with-claude/prompt-caching | 2.5, 4.5 |
| 325 | https://docs.claude.com/en/docs/build-with-claude/extended-thinking | platform.claude.com/docs/en/build-with-claude/extended-thinking | 2.3, 3.3 |
| 326 | https://docs.claude.com/en/docs/build-with-claude/effort | platform.claude.com/docs/en/build-with-claude/effort | 3.3, 4.5 |
| 327 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview | platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview | 2.3, 4.4 |
| 328 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/system-prompts | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#give-claude-a-role | 2.2 |
| 329 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/prompt-templates-and-variables | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices | 2.2, 2.5 |
| 330 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/multishot-prompting | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#use-examples-effectively | 2.3 |
| 331 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/chain-of-thought | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#leverage-thinking-and-interleaved-thinking-capabilities | 2.3 |
| 332 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/chain-prompts | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#chain-complex-prompts | 1.5 |
| 333 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/long-context-tips | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#long-context-prompting | 2.4 |
| 334 | https://docs.claude.com/en/docs/build-with-claude/context-windows | platform.claude.com/docs/en/build-with-claude/context-windows | 2.4 |
| 335 | https://docs.claude.com/en/docs/build-with-claude/context-editing | platform.claude.com/docs/en/build-with-claude/context-editing | 2.4 |
| 336 | https://docs.claude.com/en/docs/build-with-claude/compaction | platform.claude.com/docs/en/build-with-claude/compaction | 2.4 |
| 337 | https://docs.claude.com/en/docs/build-with-claude/token-counting | platform.claude.com/docs/en/build-with-claude/token-counting | 2.4, 4.5 |
| 338 | https://docs.claude.com/en/docs/build-with-claude/batch-processing | platform.claude.com/docs/en/build-with-claude/batch-processing | 3.3, 4.5 |
| 339 | https://docs.claude.com/en/docs/build-with-claude/streaming | platform.claude.com/docs/en/build-with-claude/streaming | 3.3 |
| 340 | https://docs.claude.com/en/docs/build-with-claude/embeddings | platform.claude.com/docs/en/build-with-claude/embeddings | 3.5, 3.6 |
| 341 | https://docs.claude.com/en/docs/build-with-claude/citations | platform.claude.com/docs/en/build-with-claude/citations | 4.4, 5.5 |
| 342 | https://docs.claude.com/en/docs/build-with-claude/search-results | platform.claude.com/docs/en/build-with-claude/search-results | 3.5 |
| 343 | https://docs.claude.com/en/docs/build-with-claude/structured-outputs | platform.claude.com/docs/en/build-with-claude/structured-outputs | 1.2 |
| 344 | https://docs.claude.com/en/docs/build-with-claude/zero-data-retention | platform.claude.com/docs/en/manage-claude/api-and-data-retention | 5.4 |
| 345 | https://docs.claude.com/en/docs/build-with-claude/data-residency | platform.claude.com/docs/en/manage-claude/data-residency | 5.4 |
| 346 | https://docs.claude.com/en/docs/build-with-claude/claude-on-amazon-bedrock | platform.claude.com/docs/en/build-with-claude/claude-on-amazon-bedrock-legacy | 5.4 |
| 347 | https://docs.claude.com/en/docs/build-with-claude/claude-on-vertex-ai | platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai | 5.4 |
| 348 | https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview | platform.claude.com/docs/en/agents-and-tools/tool-use/overview | 1.2, 3.1 |
| 349 | https://docs.claude.com/en/docs/agents-and-tools/tool-use/tool-search-tool | platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool | 3.1, 3.8 |
| 350 | https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool | platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | 2.4 |
| 351 | https://docs.claude.com/en/docs/agents-and-tools/tool-use/programmatic-tool-calling | platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling | 3.7, 4.5 |
| 352 | https://docs.claude.com/en/docs/agents-and-tools/mcp | modelcontextprotocol.io/docs/2026-07-28/getting-started/intro | 3.7 |
| 353 | https://docs.claude.com/en/docs/agents-and-tools/mcp-connector | platform.claude.com/docs/en/agents-and-tools/mcp-connector | 3.7 |
| 354 | https://docs.claude.com/en/docs/agents-and-tools/remote-mcp-servers | platform.claude.com/docs/en/agents-and-tools/remote-mcp-servers | 3.7 |
| 355 | https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview | platform.claude.com/docs/en/agents-and-tools/agent-skills/overview | 2.5, 3.8 |
| 356 | https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices | platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices | 2.5 |
| 357 | https://docs.claude.com/en/docs/test-and-evaluate/develop-tests | platform.claude.com/docs/en/test-and-evaluate/develop-tests | 1.1, 4.1, 4.2, 6.1 |
| 358 | https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations | platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations | 4.4, 5.2 |
| 359 | https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/increase-consistency | platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency | 2.2 |
| 360 | https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks | platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks | 2.2, 5.1 |
| 361 | https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-latency | platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency | 3.3, 4.5 |
| 362 | https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-prompt-leak | platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-prompt-leak | 5.1 |
| 363 | https://docs.claude.com/en/docs/about-claude/use-case-guides/ticket-routing | platform.claude.com/docs/en/about-claude/use-case-guides/ticket-routing | 1.1, 6.1 |
| 364 | https://docs.claude.com/en/docs/about-claude/use-case-guides/customer-support-chat | platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat | 1.1, 6.1 |
| 365 | https://docs.claude.com/en/docs/about-claude/use-case-guides/content-moderation | platform.claude.com/docs/en/about-claude/use-case-guides/content-moderation | 5.1 |
| 366 | https://docs.claude.com/en/docs/about-claude/use-case-guides/legal-summarization | platform.claude.com/docs/en/about-claude/use-case-guides/legal-summarization | 1.1 |
| 367 | https://docs.claude.com/en/api/service-tiers | platform.claude.com/docs/en/api/service-tiers | 1.6, 6.3 |
| 368 | https://docs.claude.com/en/api/rate-limits | platform.claude.com/docs/en/api/rate-limits | 6.3 |
| 369 | https://docs.claude.com/en/api/errors | platform.claude.com/docs/en/api/errors | 7.3 |
| 370 | https://docs.claude.com/en/api/usage-cost-api | platform.claude.com/docs/en/manage-claude/usage-cost-api | 1.6, 4.6 |
| 371 | https://docs.claude.com/en/docs/claude-code/settings | code.claude.com/docs/en/settings | 7.1 |
| 372 | https://docs.claude.com/en/docs/claude-code/server-managed-settings | code.claude.com/docs/en/server-managed-settings | 7.1 |
| 373 | https://docs.claude.com/en/docs/claude-code/iam | code.claude.com/docs/en/iam | 7.1 |
| 374 | https://docs.claude.com/en/docs/claude-code/security | code.claude.com/docs/en/security | 7.1 |
| 375 | https://docs.claude.com/en/docs/claude-code/memory | code.claude.com/docs/en/memory | 7.1 |
| 376 | https://docs.claude.com/en/docs/claude-code/skills | code.claude.com/docs/en/skills | 7.1 |
| 377 | https://docs.claude.com/en/docs/claude-code/mcp | code.claude.com/docs/en/mcp | 7.1 |
| 378 | https://docs.claude.com/en/docs/claude-code/plugins | code.claude.com/docs/en/plugins | 7.1 |
| 379 | https://docs.claude.com/en/docs/claude-code/hooks | code.claude.com/docs/en/hooks | 5.1, 7.1 |
| 380 | https://docs.claude.com/en/docs/claude-code/monitoring-usage | code.claude.com/docs/en/monitoring-usage | 7.2 |
| 381 | https://docs.claude.com/en/docs/claude-code/analytics | code.claude.com/docs/en/analytics | 7.2 |
| 382 | https://docs.claude.com/en/docs/claude-code/github-actions | code.claude.com/docs/en/github-actions | 7.2 |
| 383 | https://docs.claude.com/en/docs/claude-code/headless | code.claude.com/docs/en/headless | 7.2 |
| 384 | https://docs.claude.com/en/docs/claude-code/common-workflows | code.claude.com/docs/en/common-workflows | 7.2, 7.3 |
| 385 | https://docs.claude.com/en/docs/claude-code/troubleshooting | code.claude.com/docs/en/troubleshooting | 7.3 |
| 386 | https://docs.claude.com/en/docs/claude-code/third-party-integrations | code.claude.com/docs/en/third-party-integrations | 7.1 |
| 387 | https://docs.claude.com/en/docs/claude-code/sub-agents | code.claude.com/docs/en/sub-agents | 7.2 |
| 388 | https://docs.claude.com/en/docs/claude-code/sandboxing | code.claude.com/docs/en/sandboxing | 7.1 |

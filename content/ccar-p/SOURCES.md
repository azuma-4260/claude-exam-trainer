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

refs ソース台帳(F の §10 に相当)は CP2 で §12 に追加した。サードパーティ問題集は参照・転記禁止(`07` 原則)。

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

### 1.1 模試構造の Guide 上の事実(`07` §CCAR-P Step 0)— **T-pmock で `03` §mock_forms に確定済み(2026-10-03)**

| 観点 | Guide の記述 | 備考 |
|---|---|---|
| 問題数 | **63**(§5 "Number of items 63") | 採点対象外の未採点問題の有無は記述なし |
| ドメイン配分 | 7 ドメインの重み(§6、§1.2)。"The percentages indicate the approximate proportion of **scored items** drawn from each domain." | 問題数への丸め方は記述なし |
| シナリオ構造 | **記述なし**。Guide 全文に "scenario" の語は §13(NDA: "questions, answer options, and scenarios")の 1 回のみで、出題構造としての言及は無い | **独立問題形式か否かは Guide では未確認**。サンプル問題(§8)3 問はいずれも独立した 4 択単一正解だが、"They are not drawn from the live item bank" とある例示であり本試験構造の根拠にはならない |
| multiple-response の選択数 | "each item states how many responses to select" のみ。**具体的な選択数(2 つ / 3 つ等)・選択肢数の記述なし** | サンプル 3 問は全て A–D の 4 択・単一正解 |
| フォーム本数 | Guide の範囲外(本アプリの模試フォームは自作) | 2 本(form A / B)で確定(T-pmock、`03` §mock_forms) |
| 時間 | 120 分 / 63 問(約 1.9 分/問) | |

- **P のドメイン数 = 7**(`09` §1 の 6「抜き取り」を P で読むときの値。各ドメイン 5 問 → 35 問)
- F の §1.1(「各シナリオ 15 問」の判定)に相当する論点は、シナリオ記述が無いため P では発生しない

#### 1.1.1 受験記による補足(2026-10-03, T-pmock。Guide 外の受験者証言であり公式仕様ではない)

| 出典 | 種別 | 内容 |
|---|---|---|
| KDDI Tech Note(https://tech-note.kddi.com/n/n11674d06d5fd、2026-10-02、885 点) | 受験者証言 | 形式は「4〜5 個の選択肢から 1 つを選ぶ」「4〜5 個の選択肢から 2 つを選ぶ」「5 つ程度の小問がまとめて出て、それぞれに対して共通の 2〜3 個の選択肢から答える(これで 1 問の扱い)」の 3 種。3 つ目は Guide に記載がない。「問題文は 2〜4 文のシナリオ」。63 問を一通り解くのに 100 分 |
| Reddit 調査メモ(`ExamGuide/memo.md`、オーナー作成 2026-10-03) | 受験者証言の整理 + 設計推奨 | 965 点の受験者が Yes/No Matrix(1 シナリオ × 約 5 statement を独立に Yes/No)と Drop-down Matching(複数シナリオを再利用可能な共通 option から分類)を報告。multiple-response は「much more frequent」との証言。F の「4 シナリオ × 15 問」を P に流用しないこと。形式別の比率は公式値なし(memo §31 LOW) |
| Partner Academy FAQ(https://anthropic-partners.skilljar.com/page/faq-certifications) | 公式 | "All Claude certification exams use multiple choice and scenario-based multiple response questions." Pearson VUE で実施 |

- **採点**: Guide §9 は "the percentage of items you answered correctly within each content domain" のみ。まとめ形式・multiple-response の部分点の有無を直接述べる一次情報は見つからない(2026-10-03 調査)
- **T-pmock の確定事項**(オーナー決定 2026-10-03): 独立問題形式(各問 stem に状況説明)/ 63 問 / 配分 11-8-12-10-9-9-4 / 問題形式の件数は validator で固定しない。まとめ形式は `09` T-bundle(採点確定が着手条件)。memo の制作指針は `09` S-4 で `07` に反映した(memo の節ごとの区分・信頼度・振り分けは §14)

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

**参考計算(確定値ではない)**: 17/13/19/16/14/14/7% × 63 = 10.71 / 8.19 / 11.97 / 10.08 / 8.82 / 8.82 / 4.41 → largest-remainder(切り捨て 59、残り 4 を端数 .97 / .82 / .82 / .71 の D3・D5・D6・D1 へ)で **11 / 8 / 12 / 10 / 9 / 9 / 4**(端数の同値 D5 = D6 は両方とも加算対象のためタイブレーク不要)。Guide は "approximate proportion of scored items" としか述べないため、フォームの問題数とドメイン配分は **T-pmock 冒頭でオーナー承認を経て `03` §mock_forms に確定する**。`02` にはこの値を固定値として書かない。→ **2026-10-03 T-pmock でこの値に確定**(オーナー決定。`03` §mock_forms)。

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
| `07` / `03` / `05` / `09` / README | §CCAR-P の P 制作指針、§1 の任意フィールド(`binding_constraint_ja` / `lifecycle_phase` / 選択肢の `plausible_ja`・`not_best_ja`)と P MCQ の不変条件、解説表示、D6-9 の追加 | S-4(2026-10-03)。memo の振り分けは §14 |

`09` CP2 行と `08` の「F に無い 3 ドメイン」表現は CP0 の spec 範囲外のため `tasks/backlog/B-CP0-1.md` に起票し、CP2 で §8 基準に書き換えた(B-CP0-1 を absorb)。

## 11. 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-09-29 | 初版(CP0)。Exam Guide v1.0 を転記 |
| 2026-10-03 | T-pmock: §1.1 の模試構造を `03` §mock_forms に確定(オーナー決定)。§1.1.1 に受験記・Reddit 調査メモ・Partner Academy FAQ の補足を追加 |
| 2026-10-03 | S-4: §14 に Reddit 調査メモの区分・信頼度・振り分けを追加。P 制作指針を `07` に、構造化解説フィールドを `03` に確定(オーナー承認) |
| 2026-09-30 | CP1: §3 の 38 目標と 1:1 の `syllabus.yaml`(108 topics)を作成。§9 の P 内重なり 6 ペアは両側の scope_ja に【primary 境界】を記載。`form_questions` は T-pmock 確定まで書かない |
| 2026-09-30 | CP3: 独立 MCQ の ID 帯(q501〜q599・ドメイン内連番)と CP3 の refs 台帳 88 URL(#301〜#388、curl で 200 確認)を §13(CP3 節)に追加。独立 MCQ 76 問(12/10/13/11/10/10/10、mcq_single のみ)を flagged で生成。配分根拠は `content/ccar-p/CP3-allocation.md`。Step 4 は別セッション(step4-review)で実施 |
| 2026-09-30 | CP3 Step 4: 独立レビュー 2 周(1 周目 P1 1 / P2 21、2 周目 P1 0 / P2 8 を修正)、refs 突合(使用 52 URL)、P 内・F バンクとの重複統合。許可ソースで裏付けられない 3 topic(B-CP2-1)に割り当てていた p-d2-q510 / p-d3-q512 / p-d6-q503 を同じ task statement 内の topic へ差し替え。全 76 問を active 化。記録は `content/ccar-p/CP3-allocation.md` §Step 4 |
| 2026-09-30 | CP2: §12 refs ソース台帳と topic 対応表 `CP2-refs-map.md` を追加。オーナー決定で syllabus の p-d2-t5-02 を改訂(p-d2-t2-02 に境界注記)、p-d3-t7-03 / p-d6-t2-01 はカードの論点を絞る(B-CP2-1) |
| 2026-09-30 | CP2 Step 4: 独立レビュー 6 周(全 150 枚 × 2 周 + 修正したカードのみ 4 周〔51 → 25 → 9 → 4 枚〕。各周で生成・修正に関わらない新しいレビュアーがカードの refs 本文を取得して文ごとに突合)、P 内・F フラッシュ・CP3 MCQ との重複統合(stem+answer の Jaccard と目視)。出典より強い表現・裏付けの無い解説文・列挙型・廃止機能(temperature / budget_tokens / Priority Tier)中心のカードを修正または論点差し替え。p-d1-q019 を p-d1-t3-03、p-d6-q009 を p-d6-t5-01 へ移動(topic 被覆は不変)。全 150 枚を active 化。残課題は B-CP2-2 |

## 12. refs ソース台帳(CP2・2026-09-30)

カードの `refs` は本台帳の「ref URL」列の URL **のみ**を使用する(`07` 原則・Step 2、CP2 プラン)。許可ソースは `07` 原則の 4 つ(公式 Exam Guide / docs.claude.com / Anthropic Academy / Anthropic 公式ブログ)に限り、Exam Guide は URL を持たないため台帳には載らない。Trust Center・support 記事・法令原文・サードパーティ資料は載せない。

- 全 URL は 2026-09-30 に `curl -sL` で HTTP 200 と最終到達先を確認し、本文を取得して topic の主張を裏付ける箇所を引用で記録した(`CP2-refs-map.md`)。全 352 引用は curl で取得した生の本文と機械照合済み。docs.claude.com は platform.claude.com / code.claude.com / modelcontextprotocol.io へ、一部の anthropic.com/news は claude.com/blog へ 301 される(「正規 URL」列が最終到達先)
- #1〜26 は F 台帳(`content/ccar-f/SOURCES.md` §10)と同じ URL。最終到達先が同じ URL は F の表記に統一した(`test-and-evaluate/develop-tests` → `define-success`、`engineering/multi-agent-research-system` → `built-multi-agent-research-system`)
- 「主な対応目標」は §3 の目標番号。topic 単位の対応と根拠の強さ(direct / partial)は `CP2-refs-map.md` が正本
- **範囲調整(オーナー決定 2026-09-30、B-CP2-1)**: 許可ソースで中核を裏付けられなかった 3 topic を次のとおり扱う。p-d2-t5-02 は syllabus を「再利用可能なプロンプト部品と再利用の仕組みの使い分け」に改訂(バージョン管理は主題にしない)。p-d3-t7-03 は連携方式(API / MCP / 自律エージェントへの委任)の選択と信頼境界に絞る(A2A プロトコル仕様は扱わない)。p-d6-t2-01 は相手の意思決定に必要な形で判断を示す骨格に絞る(経営層 / 技術者の対比は扱わない)
- 「Anthropic 公式ブログ」には anthropic.com の news / engineering / research と claude.com/blog を含める(オーナー決定 2026-09-30。anthropic.com/news の一部が claude.com/blog へ 301 されるため)

| # | ref URL | 正規 URL(最終到達先) | 主な対応目標 |
|---|---|---|---|
| 1 | https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview | platform.claude.com/docs/en/agents-and-tools/tool-use/overview | 3.7 |
| 2 | https://docs.claude.com/en/docs/agents-and-tools/mcp | modelcontextprotocol.io/docs/2026-07-28/getting-started/intro | 3.7 |
| 3 | https://docs.claude.com/en/docs/claude-code/memory | code.claude.com/docs/en/memory | 6.4, 7.1 |
| 4 | https://docs.claude.com/en/docs/claude-code/skills | code.claude.com/docs/en/skills | 7.1 |
| 5 | https://docs.claude.com/en/docs/claude-code/mcp | code.claude.com/docs/en/mcp | 3.2, 3.7, 7.1 |
| 6 | https://docs.claude.com/en/docs/claude-code/common-workflows | code.claude.com/docs/en/common-workflows | 7.2, 7.3 |
| 7 | https://docs.claude.com/en/docs/claude-code/github-actions | code.claude.com/docs/en/github-actions | 7.2 |
| 8 | https://docs.claude.com/en/docs/claude-code/settings | code.claude.com/docs/en/settings | 7.1 |
| 9 | https://docs.claude.com/en/docs/claude-code/headless | code.claude.com/docs/en/headless | 7.2 |
| 10 | https://docs.claude.com/en/docs/claude-code/hooks | code.claude.com/docs/en/hooks | 5.1 |
| 11 | https://docs.claude.com/en/docs/claude-code/sub-agents | code.claude.com/docs/en/sub-agents | 3.1, 3.8 |
| 12 | https://docs.claude.com/en/api/agent-sdk/subagents | code.claude.com/docs/en/agent-sdk/subagents | 1.4, 3.1, 3.8 |
| 13 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview | platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview | 4.3 |
| 14 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/multishot-prompting | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#use-examples-effectively | 2.3 |
| 15 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#be-clear-and-direct | 2.2, 4.4 |
| 16 | https://docs.claude.com/en/docs/build-with-claude/batch-processing | platform.claude.com/docs/en/build-with-claude/batch-processing | 1.6, 3.3 |
| 17 | https://docs.claude.com/en/docs/build-with-claude/context-windows | platform.claude.com/docs/en/build-with-claude/context-windows | 2.4, 3.8, 5.2 |
| 18 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/long-context-tips | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#long-context-prompting | 2.4 |
| 19 | https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations | platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations | 2.2, 4.4, 5.2, 5.5, 6.3 |
| 20 | https://docs.claude.com/en/docs/test-and-evaluate/define-success | platform.claude.com/docs/en/test-and-evaluate/develop-tests | 1.1, 2.3, 3.3, 4.1, 4.2, 4.3, 6.1, 6.3 |
| 21 | https://www.anthropic.com/engineering/building-effective-agents | (直接) | 1.1, 1.2, 1.3, 1.5, 2.1, 3.7, 5.2 |
| 22 | https://www.anthropic.com/engineering/built-multi-agent-research-system | www.anthropic.com/engineering/multi-agent-research-system | 1.4, 1.5, 3.3, 3.4, 3.6, 3.7, 4.3, 4.4, 4.5, 4.6, 5.2 |
| 23 | https://www.anthropic.com/engineering/writing-tools-for-agents | (直接) | 3.1 |
| 24 | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents | (直接) | 2.4, 3.5, 3.6, 3.8 |
| 25 | https://docs.claude.com/en/docs/build-with-claude/structured-outputs | platform.claude.com/docs/en/build-with-claude/structured-outputs | 1.2 |
| 26 | https://docs.claude.com/en/docs/claude-code/costs | code.claude.com/docs/en/costs | 3.1, 3.7, 4.5 |
| 27 | https://docs.claude.com/en/docs/about-claude/use-case-guides/ticket-routing | platform.claude.com/docs/en/about-claude/use-case-guides/ticket-routing | 1.1, 1.2, 2.1, 2.2 |
| 28 | https://www.anthropic.com/news/contextual-retrieval | www.anthropic.com/engineering/contextual-retrieval | 1.2, 3.5, 3.6, 3.8, 4.4, 4.5 |
| 29 | https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents | (直接) | 1.2, 3.4, 4.1, 4.2, 4.3, 4.4, 4.6, 5.3, 6.1, 6.3, 6.4, 6.5 |
| 30 | https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them | (直接) | 1.4, 1.5 |
| 31 | https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence | platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence | 1.4, 2.1, 3.3, 4.1, 4.2, 4.4, 4.5 |
| 32 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices | 1.5, 2.4 |
| 33 | https://www.anthropic.com/news/driving-ai-transformation-with-claude | claude.com/blog/driving-ai-transformation-with-claude | 1.6 |
| 34 | https://claude.com/blog/a-guide-to-cost-visibility-and-control-in-claude | (直接) | 1.6 |
| 35 | https://www.anthropic.com/research/estimating-productivity-gains | (直接) | 1.6 |
| 36 | https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-latency | platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency | 1.6, 2.4, 3.3, 4.1, 4.5 |
| 37 | https://docs.claude.com/en/docs/about-claude/models/choosing-a-model | platform.claude.com/docs/en/about-claude/models/choosing-a-model | 2.1, 3.3, 4.5, 6.2, 6.3 |
| 38 | https://docs.claude.com/en/docs/about-claude/models/overview | platform.claude.com/docs/en/models/overview | 2.1, 5.2 |
| 39 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/system-prompts | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#give-claude-a-role | 2.2 |
| 40 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#structure-prompts-with-xml-tags | 2.2, 2.5 |
| 41 | https://docs.claude.com/en/docs/build-with-claude/thinking | platform.claude.com/docs/en/build-with-claude/thinking | 2.3 |
| 42 | https://docs.claude.com/en/docs/build-with-claude/extended-thinking | platform.claude.com/docs/en/build-with-claude/extended-thinking | 2.3, 3.3 |
| 43 | https://docs.claude.com/en/docs/build-with-claude/effort | platform.claude.com/docs/en/build-with-claude/effort | 2.3 |
| 44 | https://docs.claude.com/en/docs/build-with-claude/compaction | platform.claude.com/docs/en/build-with-claude/compaction | 2.4 |
| 45 | https://docs.claude.com/en/docs/build-with-claude/prompt-caching | platform.claude.com/docs/en/build-with-claude/prompt-caching | 2.5, 4.5 |
| 46 | https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview | platform.claude.com/docs/en/agents-and-tools/agent-skills/overview | 2.5, 3.8 |
| 47 | https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills | (直接) | 2.5 |
| 48 | https://docs.claude.com/en/docs/agents-and-tools/tool-use/tool-search-tool | platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool | 3.1, 3.8 |
| 49 | https://www.anthropic.com/engineering/advanced-tool-use | (直接) | 3.1, 3.8 |
| 50 | https://docs.claude.com/en/docs/claude-code/security | code.claude.com/docs/en/security | 3.1, 5.1, 7.1 |
| 51 | https://docs.claude.com/en/docs/claude-code/monitoring-usage | code.claude.com/docs/en/monitoring-usage | 3.2, 3.4, 4.6, 7.1 |
| 52 | https://docs.claude.com/en/docs/build-with-claude/files | platform.claude.com/docs/en/build-with-claude/files | 3.2 |
| 53 | https://docs.claude.com/en/docs/agents-and-tools/mcp-connector | platform.claude.com/docs/en/agents-and-tools/mcp-connector | 3.2 |
| 54 | https://docs.claude.com/en/docs/agents-and-tools/remote-mcp-servers | platform.claude.com/docs/en/agents-and-tools/remote-mcp-servers | 3.2 |
| 55 | https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks | platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks | 3.2, 5.1 |
| 56 | https://www.anthropic.com/research/prompt-injection-defenses | (直接) | 3.2, 4.1 |
| 57 | https://www.anthropic.com/engineering/claude-code-sandboxing | (直接) | 3.2 |
| 58 | https://www.anthropic.com/news/message-batches-api | claude.com/blog/message-batches-api | 3.3 |
| 59 | https://anthropic.skilljar.com/claude-with-the-anthropic-api | (直接) | 3.5 |
| 60 | https://docs.claude.com/en/docs/build-with-claude/embeddings | platform.claude.com/docs/en/build-with-claude/embeddings | 3.5 |
| 61 | https://www.anthropic.com/news/model-context-protocol | (直接) | 3.7 |
| 62 | https://anthropic.skilljar.com/introduction-to-model-context-protocol | (直接) | 3.7 |
| 63 | https://docs.claude.com/en/api/agent-sdk/secure-deployment | code.claude.com/docs/en/agent-sdk/secure-deployment | 3.7 |
| 64 | https://www.anthropic.com/engineering/code-execution-with-mcp | (直接) | 3.8 |
| 65 | https://anthropic.skilljar.com/introduction-to-agent-skills | (直接) | 3.8 |
| 66 | https://docs.claude.com/en/docs/agents-and-tools/tool-use/programmatic-tool-calling | platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling | 4.5 |
| 67 | https://docs.claude.com/en/docs/manage-claude/usage-cost-api | platform.claude.com/docs/en/manage-claude/usage-cost-api | 4.6 |
| 68 | https://docs.claude.com/en/docs/claude-code/analytics | code.claude.com/docs/en/analytics | 4.6, 7.2 |
| 69 | https://docs.claude.com/en/docs/claude-code/sandboxing | code.claude.com/docs/en/sandboxing | 5.1 |
| 70 | https://docs.claude.com/en/docs/claude-code/hooks-guide | code.claude.com/docs/en/hooks-guide | 5.1 |
| 71 | https://docs.claude.com/en/docs/claude-code/permissions | code.claude.com/docs/en/permissions | 5.1, 7.1 |
| 72 | https://claude.com/blog/ciso-guide-to-agentic-ai | (直接) | 5.1, 5.2, 5.5, 6.2 |
| 73 | https://www.anthropic.com/research/trustworthy-agents | (直接) | 5.1, 5.2 |
| 74 | https://docs.claude.com/en/api/messages | platform.claude.com/docs/en/api/messages | 5.2, 6.3 |
| 75 | https://www.anthropic.com/research/towards-understanding-sycophancy-in-language-models | (直接) | 5.2 |
| 76 | https://docs.claude.com/en/docs/claude-code/best-practices | code.claude.com/docs/en/best-practices | 5.2, 7.2 |
| 77 | https://claude.com/blog/deploying-ai-from-pilot-to-production | (直接) | 5.3, 5.5, 6.1, 6.2, 6.3, 6.5 |
| 78 | https://www.anthropic.com/news/our-framework-for-developing-safe-and-trustworthy-agents | (直接) | 5.3, 5.5 |
| 79 | https://claude.com/blog/the-ai-native-sdlc-playbook | (直接) | 5.3, 6.4, 6.5, 7.3 |
| 80 | https://docs.claude.com/en/docs/about-claude/use-case-guides/customer-support-chat | platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat | 5.3 |
| 81 | https://docs.claude.com/en/docs/build-with-claude/citations | platform.claude.com/docs/en/build-with-claude/citations | 5.3, 5.5 |
| 82 | https://docs.claude.com/en/docs/claude-code/code-review | code.claude.com/docs/en/code-review | 5.3 |
| 83 | https://claude.com/blog/how-to-prepare-for-ai-driven-code-modernization-projects | (直接) | 5.3, 6.1, 6.2, 6.5 |
| 84 | https://docs.claude.com/en/docs/build-with-claude/api-and-data-retention | platform.claude.com/docs/en/manage-claude/api-and-data-retention | 5.4 |
| 85 | https://docs.claude.com/en/docs/build-with-claude/data-residency | platform.claude.com/docs/en/manage-claude/data-residency | 5.4 |
| 86 | https://www.anthropic.com/news/claude-in-amazon-bedrock-fedramp-high | (直接) | 5.4 |
| 87 | https://www.anthropic.com/news/claude-on-google-cloud-fedramp-high | claude.com/blog/claude-on-google-cloud-fedramp-high | 5.4 |
| 88 | https://www.anthropic.com/research/evaluating-and-mitigating-discrimination-in-language-model-decisions | (直接) | 5.5 |
| 89 | https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start | (直接) | 6.1, 6.5, 7.2 |
| 90 | https://docs.claude.com/en/docs/api/service-tiers | platform.claude.com/docs/en/api/service-tiers | 6.3 |
| 91 | https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues | (直接) | 6.3, 7.3 |
| 92 | https://claude.com/blog/how-anthropic-teams-use-claude-code | (直接) | 6.4, 7.3 |
| 93 | https://docs.claude.com/en/docs/about-claude/model-deprecations | platform.claude.com/docs/en/about-claude/model-deprecations | 6.5 |
| 94 | https://www.anthropic.com/research/measuring-agent-autonomy | (直接) | 6.5 |
| 95 | https://docs.claude.com/en/docs/claude-code/managed-settings | code.claude.com/docs/en/managed-settings | 7.1 |
| 96 | https://docs.claude.com/en/docs/claude-code/admin-setup | code.claude.com/docs/en/admin-setup | 7.1 |

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

## 14. Reddit 調査メモ(`ExamGuide/memo.md`)の区分・信頼度・振り分け(S-4・2026-10-03)

`ExamGuide/memo.md`(オーナー作成、最終調査 2026-10-03)を、memo 自身の 3 区分と信頼度(memo §31)で節ごとに記録し、spec への振り分け(反映 / 不採用(理由)/ 別タスク)を確定する(`09` S-4)。**memo は一次ソースではない**: 技術的事実の根拠(`refs`)には使わず、形式・難易度・思考パターンの補助情報として使う(`07` 原則、memo §18・§33-18)。

- 区分: **A** = 公式 Exam Guide 由来(正本は Guide 本体 §1〜§9)/ **B** = 実受験者の証言(NDA のため形式・傾向の報告のみ。フォーム差があり得る)/ **C** = A・B から導いたアプリ設計上の推奨
- 信頼度: memo §31 の HIGH / MEDIUM-HIGH / MEDIUM / LOW。C は信頼度ではなく採否で扱う(「–」)
- 振り分けの決定はオーナー承認済み(grill-me 2 ラウンド、2026-10-03)。判断軸は「拡張性より、利用者が合格できるか」

| memo § | 内容 | 区分 | 信頼度 | 振り分け |
|---|---|---|---|---|
| §0 | 資料の目的・3 区分 | – | – | 反映: 本節の区分列 |
| §1 | 63 問 / 120 分 / 720 / 7 ドメイン / 重み / MC・MR | A | HIGH | 反映済み: §1・§1.2、`03` §mock_forms §CCAR-P(配分 11-8-12-10-9-9-4 は memo の概算と一致) |
| §2.1 | Yes/No Matrix | B(965 点の 1 名) | MEDIUM | 別タスク: `09` T-bundle / D6-8(採点の確定が着手条件) |
| §2.2 | Drop-down Matching(option 再利用可) | B(同上) | MEDIUM | 別タスク: T-bundle / D6-8 |
| §3 | multi-response が多い・本番は模試より複雑 | B(複数名) | MEDIUM-HIGH | 反映: `07` §P 制作指針(Select TWO・4〜5 択・形式比率)、`03` §1(P の multi は Select TWO のみ) |
| §4 | 知識の再生より architectural judgment(40/60 の体感) | B | MEDIUM-HIGH(40/60 の比率は LOW) | 反映: `07` §P 制作指針(比率は固定しない) |
| §5 | もっともらしい誤答(一般には正しいが BEST でない) | C(B 由来) | – | 反映: `07` §P 制作指針(誤答の推奨型) |
| §6 | binding constraint を先に決める | C | – | 反映: `07`(作問手順)、`03` §1 `binding_constraint_ja`、`05`(表示)。実装は D6-9 |
| §7 | 応急処置と構造的解決 | B(965 点)+ C | MEDIUM | 反映: `07` 誤答の推奨型(応急処置)。機械的な規則にしない旨も明記 |
| §8 | least privilege = 能力の削減 | B + C | MEDIUM | 反映: `07` 誤答の推奨型(予防でなく監視)。Guide Sample 1(§5)とも整合 |
| §9 | phase-gate が多い | B(965 点) | MEDIUM | 反映: `07` 問題タイプ(phase-gate)、`03` §1 `lifecycle_phase` |
| §10 | 派手な architecture が正解とは限らない | C(B 由来) | – | 反映: `07` 問題タイプ(アーキテクチャ選択)・誤答の推奨型(過剰設計) |
| §11 | RAG は障害診断まで問う | B + C | MEDIUM | 反映: `07` 問題タイプ(障害診断)。**syllabus に独立カテゴリを作るのは不採用**(syllabus は Guide の 38 目標と 1:1。診断は既存 topic の問題タイプで扱う) |
| §12 | コスト最適化 = 小さいモデルとは限らない | C | – | 反映: `07` 誤答の推奨型(caching / retrieval が本当の原因なのに小さいモデル) |
| §13 | 技術知識だけの試験ではない | B(897 点) | MEDIUM-HIGH | 反映: `07` §P 制作指針(Claude 固有知識だけに偏らない) |
| §14 | governance / security が難所 | B(複数)+ C | MEDIUM-HIGH | 反映: `07` 重点(法規制は暗記でなく設計の制約として使う) |
| §15 | evaluation は評価設計まで | C(Guide Domain 4 と整合) | – | 反映: `07` 重点 |
| §16 | stakeholder communication | C(Guide Domain 6 と整合) | – | 反映: `07` 問題タイプ(ステークホルダー判断) |
| §17 | 本番の難易度(F より上か下か) | B(証言が相反) | LOW | **不採用**: 経歴による個人差が大きく、仕様に入れない |
| §18 | 市販模試を正解の根拠にしない | C | – | 反映済み: `07` 原則(サードパーティ問題集は参照・転記禁止)。`07` §P 制作指針にも明記 |
| §19 | F の形式と混同しない | C | – | 反映済み: `exam` フィールドとディレクトリ分離(`03` §1)、P の独立問題形式(T-pmock) |
| §20 | 問題タイプ A〜G | C | – | A・B 反映: `07` / `03`。C・D 別タスク: T-bundle / D6-8。E・F・G 反映: `07` 問題タイプ |
| §21 | Full Mock 63 問 / 120 分・形式比率の初期案 | A(63 / 120)+ C(比率) | HIGH(構造)/ LOW(比率) | 構造は反映済み(`03` §mock_forms)。比率は反映: `07` の目安(2 ケース、validator で強制しない) |
| §22 | 難易度 3 段階 | C | – | 反映: `03` §1(P MCQ の `difficulty` を再定義)、`07`(フォームの目安) |
| §23 | 誤答の禁止パターンと推奨型 10 種 | C | – | 反映: `07` §P 制作指針。「正解だけ長い / 具体的」の形の偏りは既存の `audit:choices` が検査 |
| §24 | 作問時に内部で持つ構造 | C | – | 一部反映: `binding_constraint` / `lifecycle_phase` / 選択肢ごとの plausible・not-best を `03` §1 の任意フィールドに。domain / objective / difficulty / source_basis は既存の `domain_id` / `primary_topic_id` / `difficulty` / `refs` で代替。question_type・secondary_constraints・confidence はバンクに持たず作問時のメモにとどめる(表示しても学習効果が小さいため) |
| §25 | 解説画面に出す情報 | C | – | 反映: `05`(拘束条件の枠・選択肢ごとの理由・「どんな条件なら正解か」・フェーズのタグ)。実装は D6-9 |
| §26 | 学習の 7 段階 | C | – | **不採用**: 既存の Drill(知識の適用)/ Practice(制約判断・トレードオフ・診断・phase-gate)/ Mock と日次キューで段階を担える。段階ごとの画面は作らない |
| §27 | Full Mock 品質チェックリスト | C | – | 反映: `07` Step 4 の P 版 |
| §28 | 特に重視する出題領域 | B + C | MEDIUM-HIGH | 反映: `07` 重点(syllabus の topic は変えない) |
| §29 | 「CCAR-P らしい問題」のテンプレート | C | – | 反映: `07` §P 制作指針 |
| §30 | 避けるべきこと 16 項目 | C | – | 反映: `07` 禁止パターン |
| §31 | 情報の信頼度 | – | – | 反映: 本節の信頼度列 |
| §32 | 最終原則(BEST が一意に決まるか) | C | – | 反映: `07` §P 制作指針の品質基準 |
| §33 | 実装指示 1〜20 | C | – | 下記 |

**§33 の各項目**: 1 現行仕様との比較・20 差分の提示 = S-4 の grill-me で実施 / 2 既存仕様を破棄しない・17 公式ソースとの整合 = 遵守(`07` 原則) / 3 公式と Reddit 由来の区別 = 本節 / 4 形式のサポート = single・multi は対応済み、Matrix・Dropdown は T-bundle / D6-8 / 5・6・7 = `03` §1 の任意フィールド(D6-9) / 8・9 = 反映済み(`03` §mock_forms、`FORM_DOMAIN_QUOTA`) / 10・19 形式比率は設定値で強制しない = `07` の目安・監査は表示のみ / 11 定義想起の検出 = CP7 / 12 ありえない誤答の検出 = `07` Step 4 P 版のレビュー観点(意味の判断なので機械検査はしない) / 13 = `03` §1 の `difficulty` / 14・15 = `07` 問題タイプ(CP4-A / CP7 で作る) / 16 = `05` / 18 = `07` §P 制作指針

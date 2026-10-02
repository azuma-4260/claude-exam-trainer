CCAR-P（Claude Certified Architect – Professional）

Reddit実受験者情報を基にした試験形式・出題傾向・問題生成仕様

最終調査：2026-10-03

⸻

0. この資料の目的

この資料は、Anthropicの「Claude Certified Architect – Professional（CCAR-P）」対策アプリケーションを開発するために、Reddit上の実受験者報告を整理したものである。

特に、公式Exam Guideだけでは分かりにくい以下の情報を補完することを目的とする。

* 実際の問題形式
* 問題文の性質
* Single Select / Multiple Response以外のUI形式
* distractor（誤答選択肢）の作られ方
* scenario-based questionの特徴
* architecture judgmentの問われ方
* lifecycle / phase-gate問題
* RAG / security / governance等の実際の問われ方
* 本番と模試の難易度差
* CCAR-Pらしい問題を生成するための設計原則

重要：

この資料には、

A. 公式Exam Guide由来の情報
B. 実際にCCAR-Pを受験した人物の証言
C. 複数証言から導いたアプリ設計上の推奨

の3種類が含まれる。

これらを混同してはならない。

特に、Reddit受験者の報告は有力な実地情報ではあるが、試験問題はNDA対象であり、試験フォームによる差もあり得る。そのため「ある受験者が経験したこと」と「全受験者に必ず当てはまる公式仕様」は区別すること。

⸻

1. 公式仕様として扱ってよい情報

2026年7月発効のCCAR-P Exam Guide v1.0を引用している複数資料で、以下の仕様が一致している。

* Exam：Claude Certified Architect – Professional
* Exam code：CCAR-P
* 問題数：63問
* 制限時間：120分
* Passing score：720 / 1000（scaled score）
* 7 domains
* Multiple Choice / Multiple Responseを含む

63問120分なので、単純平均では1問あたり約114秒、約1分54秒。

Domain weighting：

1. Solution Design & Architecture：17%
2. Claude Models, Prompting & Context Engineering：13%
3. Integration：19%
4. Evaluation, Testing & Optimization：16%
5. Governance, Safety & Risk Management：14%
6. Stakeholder Communication & Lifecycle Management：14%
7. Developer Productivity & Operational Enablement：7%

63問に単純換算した場合の期待問題数は概ね、

* Integration：約12問
* Solution Design & Architecture：約11問
* Evaluation, Testing & Optimization：約10問
* Governance, Safety & Risk Management：約9問
* Stakeholder Communication & Lifecycle Management：約9問
* Claude Models, Prompting & Context Engineering：約8問
* Developer Productivity & Operational Enablement：約4問

となる。

ただし、実際の各試験フォームが必ずこの整数配分になるとは限らない。

アプリのFull Mockでは、この比率をできるだけ再現する。

⸻

2. Reddit調査で特に重要な実受験者報告

Source A：CCAR-P合格者、965/1000

Reddit上で、Pearson VUE test centerで受験し965/1000を取得した人物が、問題内容そのものではなく試験形式について詳細に報告している。

この報告で特に重要なのは以下。

2.1 Yes/No Matrixが存在した

受験者は、通常の選択問題以外に、

「1つのscenarioに対して約5つのstatementがあり、それぞれを独立してYes/No判定する」

形式を経験したと報告している。

つまり、

Scenario
↓
Statement A → Yes / No
Statement B → Yes / No
Statement C → Yes / No
Statement D → Yes / No
Statement E → Yes / No

という形式。

重要なのは、各statementを独立評価すること。

「Yesが2つ、Noが3つになるはず」のような個数推測をしてはいけない。

⸻

2.2 Drop-down Matchingが存在した

同じ受験者は、

「複数scenarioをshared option setから分類するdrop-down matching」

も経験したと報告している。

例：

Scenario A → [Discovery / Design / Handoff / Monitoring]
Scenario B → [Discovery / Design / Handoff / Monitoring]
Scenario C → [Discovery / Design / Handoff / Monitoring]

重要な特徴：

同じoptionを複数scenarioに使用できる。

つまりone-to-one matchingではない。

「Discoveryを一度使ったから、次のscenarioではDiscoveryは使えない」という考え方は誤り。

対策アプリでは、この再利用可能なdropdown形式を実装する価値が高い。

⸻

3. Multiple Responseは軽視しない

別のCCAR-P合格者は、本番について、

「real exam was much more complex」
「multiple-answer questions were much more frequent」

と報告している。

つまり、

Select ONE

だけでなく、

Select TWO

などのMultiple Responseが相当数含まれる可能性がある。

この受験者は、事前に利用したmock examより実試験の方がかなり複雑だったとも述べている。

別の受験者も、

mock：1000/1000
↓
real exam：mockよりsignificantly harder

だったと報告している。

したがって、アプリをSingle Select中心で構築するのは危険。

⸻

4. 問題は「知識再生」より「architectural judgment」

複数のCCAR-P受験者報告で最も一貫している特徴。

CCAR-Pは、

「MCPとは何か？」

「RAGとは何か？」

「prompt cachingとは何か？」

というdefinition recall中心の試験ではない。

むしろ、

「このbusiness requirementとtechnical constraintが存在する状況で、architectとして何を選択するべきか？」

を問う。

ある実受験者は、自分が経験した問題について概算で、

* 約40%：答えを比較的すぐ判断できた
* 約60%：scenario paragraph全体を読み、trade-offを考える必要があった

と報告している。

この人物はAI systemsについて4〜5年の経験があり、Claude Codeをproduction-grade system開発に日常利用している。

したがって、この40/60という比率を公式仕様として固定してはいけない。

しかし、

「かなりの割合がscenario/trade-off型」

という定性的情報は重要。

⸻

5. CCAR-Pの問題生成で最重要なのは「plausible distractor」

一般的な低品質資格問題：

Q. 最も安全な方法は？

A. Least privilegeを使用する
B. Passwordを公開する
C. Authenticationを無効化する
D. 全ユーザーにadmin権限を与える

このような問題はCCAR-P対策として価値が低い。

本番に近い問題では、複数の選択肢がtechnically reasonableである。

例えば：

A. Loggingを強化する
B. User confirmationを追加する
C. Agentから不要なcapabilityを除去する
D. Monitoring dashboardを追加する

これらはすべて一般論としては有用。

しかし、

「least privilegeを実現する」

というconstraintなら、

不要なcapabilityそのものを除去する

のがBEST answerになる可能性が高い。

したがって、

wrong answer = 明らかな間違い

ではなく、

wrong answer =
「一般的には正しいが、このscenarioのconstraintに対してBESTではない」

とする。

これはCCAR-P問題生成における最重要原則の一つ。

⸻

6. Binding Constraintを見抜かせる

CCAR-P型問題では、scenarioに多数の情報が含まれていても、そのうち一部が最終判断を決定する。

これをここではbinding constraintと呼ぶ。

例：

企業がClaude agentを導入している。

* latency < 2 sec
* regulated environment
* sensitive customer data
* low engineering capacity
* existing deterministic workflow
* 10,000 requests/day

などが書かれている。

問題によって、

「security」
「latency」
「maintainability」
「cost」

のどれが最終判断を拘束するかが異なる。

良い問題では、選択肢AとBの両方がtechnically possibleだが、binding constraintを満たす方だけがBESTになる。

したがって問題生成AIは、

1. scenarioを生成
2. binding constraintを明示的に内部定義
3. correct answerを決定
4. 他の選択肢を「別のconstraintなら正解になり得る」形で生成

するべき。

⸻

7. 「応急処置」と「構造的解決」の区別

965/1000の受験者が、試験での重要な判断傾向として報告している。

例：

production systemでmessage delivery failureが発生。

候補：

A. Retry回数を増やす
B. Timeoutを伸ばす
C. Durable queueを導入する
D. Operatorに手動retryさせる

短期的にはA/B/Dも問題を緩和する。

しかしarchitectural root causeに対処するならC。

CCAR-Pでは、

temporary mitigation

より、

durable architectural fix

がBEST answerになるscenarioが存在する。

ただし、これを機械的ルールにしてはいけない。

scenarioが、

「immediate containment」

を要求しているならtemporary mitigationが正解になり得る。

つまり、

question objective
+
lifecycle phase
+
constraint

によって判断する。

⸻

8. Least Privilegeは「監視」ではなく「能力削減」まで考える

実受験者報告で特に有用な考え方。

Agentが不要なdangerous capabilityを持っている場合、

* loggingする
* confirmationを要求する
* monitoringする

ことはrisk mitigationにはなる。

しかしleast privilegeという観点では、

「そもそも不要なcapabilityをagentから取り除く」

方が根本的。

したがってsecurity問題では、

control after capability use

と

removal/restriction of capability itself

を区別する。

問題生成時にはこのようなarchitecture-level distinctionを利用する。

⸻

9. Phase-Gate / Lifecycle問題が重要

965/1000の受験者は、

「lots of phase-gate questions」

と報告している。

典型的な構造：

「現在Discovery phaseである。Designへ移行する前に実施するべき活動をTWO選べ。」

ここで重要なのは、

distractorが「間違った活動」とは限らないこと。

例えば、

* stakeholder requirements gathering
* success criteria definition
* guardrail architecture design
* production monitoring configuration

はすべてproject全体では必要。

しかしDiscovery phaseで必要なのは前者。

つまり、

wrong practice

ではなく、

correct practice at the wrong lifecycle phase

をdistractorとして使用できる。

CCAR-P対策アプリではこの問題タイプを明示的に持つべき。

Lifecycleとして少なくとも、

Discovery
→ Design
→ Handoff / Deployment
→ Monitoring
→ Iteration

の時系列判断を訓練する。

⸻

10. 「派手なarchitecture」が正解とは限らない

CCAR-Pでは、

multi-agent
RAG
agentic architecture

などを知っているだけでは不十分。

むしろ、

「そのproblemに本当に必要なのか？」

を判断する。

単純なdeterministic workflowでbusiness requirementを満たせるなら、

multi-agent system

を選択する理由はない。

したがって問題では、

A. Simple augmented LLM
B. Deterministic workflow + LLM
C. Single agent
D. Multi-agent orchestration

をすべてplausibleにして、

business requirement
uncertainty
task decomposition
tool use
autonomy requirement
latency
cost
operational complexity

から適切なarchitectureを選ばせる。

基本原則：

「最も高度なarchitecture」ではなく、
「constraintを満たす最も適切なarchitecture」。

⸻

11. RAGはdefinitionではなくdiagnosisまで問う

実受験者報告では、RAGについてarchitectureだけでなくproduction failure diagnosisが重要とされている。

例：

「document refresh後から、Claudeが自信を持って古い/誤った回答をするようになった。」

このとき、

「model hallucinationだからmodelを変更する」

と即断するのではなく、

* document ingestion
* index refresh
* embedding consistency
* metadata
* retrieval
* stale data
* chunking
* ranking
* context assembly

などpipeline全体を考える。

重要な問題形式：

Symptoms
→ probable failure layer
→ evidence to inspect
→ first diagnostic action
→ appropriate fix

したがってアプリには「RAG troubleshooting」カテゴリを独立して用意する価値がある。

⸻

12. Cost Optimizationも単純なmodel downgradeではない

「costを削減したい」

というrequirementに対して、

常にsmaller model

が正解ではない。

例えば大量のstable prompt prefixが繰り返し送信されているなら、

prompt caching

の方がarchitectureを変えずにcost/latencyを改善できる可能性がある。

同様にlong context問題でも、

単純truncate

ではなく、

* retrieval
* progressive disclosure
* context engineering
* caching
* modular prompts

などを検討する。

したがって、

Requirement
→ Root Cause
→ Lowest-complexity effective intervention

というreasoningを問う。

⸻

13. 「technical knowledgeだけ」の試験ではない

897/1000で合格したsecurity/data/cloud/ML背景の受験者は、

「exam was less technical than I expected」

と報告している。

もちろん以下は必要だったとしている。

* Claude API
* SDK
* MCP
* Claude Code
* Skills
* RAG / chunking
* prompt caching
* context management
* secure design
* platform limitations
* enterprise deployment
* agentic architecture
* workflows vs agents
* evaluation of LLM applications

しかし、それに加えてかなりの数の、

* architecture decisions
* project scoping
* customer expectation management
* model selection
* cost reduction
* general best practices

が問われたとしている。

したがって、CCAR-PをClaude API暗記試験として設計してはいけない。

⸻

14. Governance / Securityは重要

複数の受験者が、technical toolingより判断が難しい領域として、

governance
security
regulated environment

を挙げている。

アプリでは最低限、

* authentication
* authorization
* identity propagation
* least privilege
* human-in-the-loop
* guardrails
* auditability
* observability
* GDPR
* HIPAA
* FedRAMP
* safety controls
* data handling
* tool permissions
* enterprise deployment boundaries

についてscenario-based questionsを作る。

ただし法規制問題は、単純な法律暗記問題にしない。

Architecture decisionのconstraintとして利用する。

⸻

15. Evaluationは単なるaccuracy計算ではない

CCAR-Pではevaluation architectureそのものが重要。

対策対象：

* golden datasets
* representative eval sets
* offline evaluation
* online evaluation
* human evaluation
* LLM-as-a-Judge
* task success
* accuracy
* groundedness
* safety
* latency
* cost
* security
* regression testing
* A/B testing
* production monitoring

問題では、

「accuracyを上げたい。どのmetricを使う？」

だけではなく、

「このsystem failureをproduction前に検出するにはどのevaluation frameworkが適切か？」

のように設計する。

⸻

16. Stakeholder Communicationも試験対象

Professional Architectでは、技術設計だけでなく、

* requirement discovery
* stakeholder alignment
* expectation management
* SLA
* trade-off explanation
* architecture documentation
* handoff

が問われる。

したがって、

「technical architectとして正しい」

だけでなく、

「このproject phaseでstakeholderに何を確認するべきか」

も問題にする。

⸻

17. 本番難易度については証言が一致していない

ここは非常に重要。

あるexperienced AI engineerはCCAR-Pについて、

「moderately easy」
「CCAR-Fよりnoticeably easier」

と評価している。

別の4資格取得者も、

Associate
→ Developer
→ CCAR-P
→ CCAR-F

の順で難しく感じたと報告している。

一方、別のCCAR-P合格者は、

「hardest exam in the program by a good margin」

と報告している。

さらに別の受験者は、

「mockよりreal examの方がmuch more complex」

と報告している。

したがって、

「CCAR-PはCCAR-Fより難しい」
または
「CCAR-PはCCAR-Fより簡単」

という情報をアプリ仕様に入れてはいけない。

個人のbackgroundによる影響が大きい可能性がある。

特にarchitecture / production AI / RAG / agentic systemsの実務経験がある人はscenario判断が容易になる可能性が高い。

⸻

18. 市販Mockをground truthにしてはいけない

Redditでは、市販/公開mockに対して相反する報告がある。

一部ユーザーは特定のmockが役立ったと報告。

しかし別の合格者は、

mockで1000/1000
↓
real examはsignificantly harder

だったと報告している。

Udemy等を含むmockが本番difficultyを再現していなかったという証言もある。

また、オンラインstudy guideについて、

LLMによって大量生成されただけに見える教材が多い

という警告もある。

したがってアプリ開発では、

「既存問題を大量収集して似た問題を作る」

ことを中心戦略にしない。

Official Exam Guide
+
Official Anthropic technical documentation
+
high-quality scenario design

をground truthにする。

Redditは「形式・難易度・思考パターン」の補助情報として使用する。

⸻

19. CCAR-Fの情報と混同しない

これは非常に重要。

RedditにはCCAR-Fについて、

* 4 scenarios
* 各scenarioから15問
* 60問
* single-answer four-choice

などの報告が存在する。

しかしこれはCCAR-F。

CCAR-Pにそのまま適用してはいけない。

CCAR-Pについて確認できる情報とCCAR-F情報をデータモデル上でも分離すること。

exam_type:

CCAR_F
CCAR_P

を明示的に持つことを推奨。

⸻

20. 推奨する問題タイプ

アプリでは最低でも以下を実装する。

Type A：Single Select

4 options程度。

BEST answerを1つ選ぶ。

ただし他の3つもplausibleにする。

⸻

Type B：Multiple Response

例：

Select TWO.

2つの正解が、それぞれ独立した理由で必要になるようにする。

「ほぼ同じ意味の答えを2つ選ばせる」だけの問題は禁止。

⸻

Type C：Yes/No Matrix

1 scenario + 4〜6 statements。

各statement：

Yes / No

を独立判定。

⸻

Type D：Drop-down Matching

複数scenario × shared options。

optionsの再利用を許可。

⸻

Type E：Phase-Gate Scenario

現在のproject phaseを指定。

「今やるべきもの」を選択。

Later-phase activityをplausible distractorとして使用。

⸻

Type F：Failure Diagnosis

Production symptomを提示。

以下を判断：

* failure layer
* first investigation
* evidence
* root cause
* remediation

RAG / agents / integration / evaluationで使用。

⸻

Type G：Architecture Selection

Business requirementとconstraintsを提示。

以下から選択：

* deterministic software
* augmented LLM
* workflow
* single agent
* multi-agent
* RAG-enhanced system

⸻

21. Full Mockの推奨構成

公式仕様：

63 questions
120 minutes

Domain weightingは公式blueprintに合わせる。

問題形式別の正確な本番比率は公開されていない。

したがって以下は「公式比率」ではなく、Reddit証言を反映したtraining distributionとして扱う。

初期案：

Single Select：約30〜35
Multiple Response：約15〜20
Yes/No Matrix：約5〜8
Drop-down / Matching：約5〜8

ただし合計63になるよう調整。

このdistributionは将来的に新しい受験者証言が増えたら変更可能にする。

DB/configにhard-codeしないこと。

⸻

22. 問題難易度の設計

3段階を推奨。

Level 1：Knowledge Application

必要知識が分かれば比較的直接解ける。

例：

stable prompt prefixが大量に再利用される
→ prompt caching

ただしdefinition recallにはしない。

⸻

Level 2：Constraint Judgment

複数のtechnically valid optionからBESTを選択。

最低2つのplausible optionsを含める。

⸻

Level 3：Architectural Trade-off

複数constraintを含む長めのscenario。

例：

* regulated environment
* 2 sec latency SLA
* existing IAM
* frequently changing internal data
* limited operations team
* high request volume

を同時に提示。

一つのtechnology knowledgeだけでは解けないようにする。

Full MockではLevel 2/3を中心にする。

⸻

23. Distractor生成ルール

非常に重要。

禁止：

* 明らかに危険
* 明らかに無関係
* absurd
* correct answerだけ異常に長い
* correct answerだけ具体的
* terminologyだけ違う
* 「always」「never」などで簡単に消去できる
* security問題で「認証を無効化」など現実には選ばない選択肢

推奨distractor：

1. Correct solution, wrong phase
2. Correct solution, wrong constraint
3. Temporary mitigation instead of structural fix
4. Over-engineered solution
5. Under-engineered solution
6. Correct technology, wrong failure layer
7. Monitoring instead of prevention
8. Prompt-level control instead of system-level enforcement
9. Smaller model when caching/retrieval is actual bottleneck
10. Multi-agent when deterministic workflow is sufficient

理想：

受験者が、

「Aもあり得る。しかしscenarioではBの方が適切」

と考える問題。

⸻

24. 問題生成AIが内部的に保持すべき構造

各question生成前に、最低限以下を内部定義する。

domain

objective

question_type

scenario

lifecycle_phase

primary_skill

binding_constraint

secondary_constraints

correct_answer

why_correct

distractor_1

why_distractor_1_is_plausible

why_distractor_1_is_not_best

distractor_2

why_distractor_2_is_plausible

why_distractor_2_is_not_best

distractor_3

why_distractor_3_is_plausible

why_distractor_3_is_not_best

difficulty

source_basis

confidence

特に、

why distractor is plausible

と

why it is still wrong

を別々に生成させる。

これにより低品質な「馬鹿げた誤答」を防ぐ。

⸻

25. 解説画面で必ず表示すべき情報

単に、

Correct: C

では不十分。

最低限、

1. Correct answer
2. Why it is correct
3. Binding constraint
4. Why A is not best
5. Why B is not best
6. Why C is best
7. Why D is not best
8. Generalizable principle
9. Relevant domain/objective
10. Source/reference

を表示。

理想的には、

「What would make option B correct?」

も追加する。

例：

Bはこのscenarioでは不正解。

ただしrequirementが「immediate containment」であればBが適切になる可能性がある。

この解説方式はarchitectural judgmentの学習に非常に有効。

⸻

26. 学習モードの推奨構成

単純に、

教材
→ 問題
→ 模試

だけにしない。

以下を推奨。

Stage 1：Knowledge
公式objectiveとconcept理解。

↓

Stage 2：Application
短いscenario。

↓

Stage 3：Constraint Recognition
binding constraint特定。

↓

Stage 4：Trade-off
複数のplausible architecture比較。

↓

Stage 5：Diagnosis
production failure troubleshooting。

↓

Stage 6：Lifecycle
phase-gate / stakeholder judgment。

↓

Stage 7：Full Mock
63問 / 120分。

⸻

27. Full Mockで再現すべき「CCAR-Pらしさ」

Full Mockの品質評価では、単純な正答率だけでなく以下をチェックする。

* scenario-basedか
* binding constraintが存在するか
* 2つ以上の選択肢が一見plausibleか
* correct answerがscenario情報によって一意に決まるか
* distractorがabsurdではないか
* over-engineeringを誘惑する選択肢があるか
* lifecycle timingを問う問題が含まれるか
* root-cause diagnosisが含まれるか
* business + technical trade-offが含まれるか
* governance/securityがarchitecture constraintとして使われているか
* stakeholder判断が含まれるか
* Claude固有知識だけに偏っていないか

⸻

28. 特に優先すべき出題領域

Reddit証言とofficial blueprintを合わせると、特に以下を重視する。

Architecture

* business problem → architecture
* workflow vs agent
* augmented LLM
* single vs multi-agent
* decomposition
* architecture complexity
* SLA
* cost / latency / quality trade-offs

Claude / Context

* model selection
* prompting
* few-shot
* context management
* prompt caching
* modular prompts
* Skills

Integration

最重要domain、19%。

* MCP
* API / CLI
* agent-to-agent
* tool design
* capability bloat
* authn
* authz
* identity
* RAG
* chunking
* indexing
* retrieval
* latency
* observability
* progressive discovery

Evaluation

* golden dataset
* evaluation framework
* LLM-as-a-Judge
* regression
* A/B testing
* accuracy
* latency
* cost
* safety
* security
* production monitoring

Governance

* least privilege
* human-in-the-loop
* guardrails
* failure modes
* GDPR
* HIPAA
* FedRAMP
* bias/fairness/transparency
* auditability

Stakeholder / Lifecycle

* discovery
* requirements
* architecture communication
* trade-off explanation
* expectation management
* SLA
* design
* handoff
* monitoring
* iteration

Developer Productivity

* Claude Code
* team tooling
* developer workflows
* debugging
* operational issue resolution

⸻

29. 「CCAR-Pらしい問題」のテンプレート

以下の構造を標準テンプレートとして利用できる。

Scenario

Company / organization context

↓

Current architecture

↓

Problem / symptom

↓

Constraints

↓

Lifecycle phase

↓

Question:
What should the architect do FIRST / BEST / NEXT?
または
Which TWO actions should the architect take?

Options

A. technically reasonable approach
B. technically reasonable but wrong constraint
C. BEST answer
D. technically reasonable but wrong phase / over-engineered

Explanation

Correct = C

Binding constraint = X

A:
一般的には正しい。
しかし、このscenarioではYのためBESTではない。

B:
Zという状況なら正しい。
しかし現在のphaseでは早すぎる。

C:
Xを直接満たし、追加complexityが最小。

D:
要件は満たせるがunnecessary complexityを追加する。

General principle:
「最も高度なarchitectureではなく、binding constraintを満たす最小十分なarchitectureを選択する。」

⸻

30. アプリ品質上、絶対に避けるべきこと

1. Definition問題ばかりにする
2. Correct answerが明らかすぎる
3. Distractorを馬鹿げた内容にする
4. 「Claudeなら何でもagent」にする
5. Multi-agentを上位architectureとして扱う
6. RAGを万能解として扱う
7. Securityをpromptだけで解決させる
8. Monitoringとpreventionを混同する
9. Immediate mitigationとroot-cause fixを混同する
10. Lifecycle phaseを無視する
11. Business requirementを無視してtechnologyだけ問う
12. Cost問題をsmaller modelだけで解決する
13. Long context問題をtruncateだけで解決する
14. Mockサイトの問題をground truthとして学習する
15. CCAR-Fの試験形式をCCAR-Pへ流用する
16. Reddit上の一人の体験談を公式仕様として固定する

⸻

31. 情報の信頼度

HIGH

複数のofficial-guide-derived sourcesで一致：

* 63 questions
* 120 minutes
* 720/1000
* 7 domains
* domain weighting
* multiple choice / multiple response

MEDIUM-HIGH

複数の実受験者報告で整合：

* scenario-heavy
* architecture judgment重視
* plausible distractors
* business/technical trade-offs
* project/scoping/stakeholder questions
* multiple-responseが重要
* mockよりreal examが難しい場合がある

MEDIUM

特定の高得点実受験者による詳細報告：

* Yes/No Matrix
* Drop-down Matching
* reusable options
* phase-gate questionsが多い
* lifecycle timing distractors

非常に有用だが、すべてのexam formで出るとは断定しない。

LOW / NOT ESTABLISHED

現時点で公式比率として扱ってはいけない：

* Single Selectが何問
* Multiple Responseが何問
* Matrixが何問
* Dropdownが何問
* scenarioが正確に何%
* 難易度がCCAR-Fより上か下か

これらはconfigurableにする。

⸻

32. 開発時の最終原則

このアプリの目的は、

「用語を暗記してCCAR-Pに合格する」

だけではない。

CCAR-Pで要求される、

「不完全なenterprise scenarioから重要なconstraintを抽出し、複数の妥当な選択肢の中から、business・security・cost・latency・operability・lifecycleを踏まえて最適なarchitecture判断を行う能力」

を訓練すること。

したがって問題生成品質の基準は、

「正解が存在するか」

ではなく、

「正解以外も十分に魅力的だが、scenarioを正確に読めばBEST answerが一意に決まるか」

とする。

この基準を最優先すること。

⸻

33. Claudeへの実装指示

この資料をCCAR-P対策アプリの要件定義・問題生成ロジック改善に使用する場合、以下を行うこと。

1. 現在のSRSをこの資料と比較する。
2. 既存仕様を勝手に破棄しない。
3. Official specificationとReddit-derived observationを区別する。
4. 問題形式としてSingle Select / Multiple Response / Yes-No Matrix / Dropdown Matchingをサポートできるか確認する。
5. Question schemaにbinding_constraintを追加する。
6. 各distractorについてplausibility reasonとrejection reasonを保持する。
7. lifecycle_phaseを必要に応じて保持する。
8. Full Mockを63問120分に対応させる。
9. Domain distributionをofficial blueprintに合わせる。
10. Question-type distributionはconfigurableにする。
11. Definition recall中心の既存問題を検出する。
12. Absurd distractorを検出するvalidation stepを追加する。
13. Scenario difficultyをKnowledge / Constraint Judgment / Architectural Trade-off等に分類する。
14. RAG等にdiagnostic questionsを追加する。
15. Phase-gate questionsを追加する。
16. 解説に「なぜ他の選択肢が一見妥当なのにBESTではないのか」を必ず含める。
17. 既存の公式ソースとの整合性を壊さない。
18. Reddit情報だけを根拠にtechnical factを新規作成しない。
19. 不確実な試験形式情報はhard-codeしない。
20. 実装変更前に、現在のアプリとの差分と変更案を提示する。

最終的な目標は「問題数を増やすこと」ではなく、「CCAR-P本番で要求されるarchitectural judgmentを再現すること」である。
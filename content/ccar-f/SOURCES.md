# CCAR-F ソーススナップショット(`07` Step 0 成果物)

本ファイルは公式 Exam Guide の**転記**(英語原文をそのまま保持)と、`02`/`03`/`06` への反映判断の記録。バンク生成(Step 1 以降)の一次参照先(根拠資料)。**仕様の正本は引き続き `specs/`**(AGENTS.md): 公式と specs の食い違いを見つけたら、本ファイルに追従するのではなく **spec を先に更新**し、その判断を本ファイル §8 / §9 に記録する。

## 0. スナップショット

| 項目 | 値 |
|---|---|
| 文書 | Claude Certified Architect – Foundations Exam Guide |
| Version | **1.0** · Effective July 2026 · Exam code: CCAR-F |
| Document Control | 1.0 Formatting and layout updates (July 2026) / 0.2 Draft revision (June 2026) / 0.1 Initial draft (February 2026) |
| ファイル | `ExamGuide/CCAR-F.pdf` |
| SHA-256 | `9bac07c3e6671e55f6cd0232205340a370e8a13a97e8247237dcb71312bccfc2` |
| 取得・転記日 | 2026-08-23(C0) |
| 転記方法 | `pdftotext -layout` で抽出し、ページヘッダ除去・行結合のみ。語句は改変しない |

改訂トリガー(`07` 原則): (a) Exam Guide の version / errata、(b) フラグで判明した明確な事実誤り、のみ。Guide の新版を検知したら本表の Version / SHA-256 を更新し、差分をこのファイルの末尾 §9 に追記する。

### 参照 docs スナップショット(バンク refs の一次参照先)

| ソース | 参照開始日 | 備考 |
|---|---|---|
| docs.claude.com(Claude API / Agent SDK / Claude Code / MCP) | 2026-08-23 | 各問題の `refs` に URL を記載。ページ改訂で内容が変わった場合は Step 6 で扱う |
| Anthropic Academy(公式コース) | 2026-08-23 | 解説の補助参照 |
| Anthropic engineering ブログ | 2026-08-23 | 解説 refs の一次参照先 |

サードパーティ問題集は参照・転記禁止(`07` 原則)。

## 1. 試験構造(Exam Details at a Glance §3 / Scoring §10 転記)

| 項目 | 公式記述(原文) |
|---|---|
| Number of items | **60** |
| Item format | Multiple-choice **and multiple-response** items; each item states how many responses to select |
| Exam structure | **4 scenarios drawn from a bank of 6** |
| Time limit | 120 minutes |
| Delivery | Proctored: online proctored and/or test center, per program policy |
| Passing score | Scaled score of **720** on a scale of 100–1,000 |
| Exam fee | $125 USD |
| Validity period | 12 months from the date the credential is awarded |
| Result reporting | Pass/fail with scaled score (100–1,000), plus percent-correct by domain on the score report |

§5 原文: "During the exam, 4 scenarios are presented and picked at random from the full set of the 6 scenarios below."

§10 要点: criterion-referenced(相対評価ではない)。cut score 720 は standard-setting study で設定。ドメイン別 % は参考情報で合否判定には使わない。

### 1.1 模試構造の判定(Step 0 手順 4)— **「各シナリオ 15 問」の明記なし → validator の各シナリオ 15 問検証は OFF**

- Guide 全文を検索したが、1 シナリオあたりの設問数を述べる記述は**存在しない**(§3 "4 scenarios drawn from a bank of 6"、§5 "frames a set of questions" のみ。"15" という数値は本文に一度も現れない)
- サンプル問題(§9)は 4 シナリオ × 各 3 問の例示であり、本番の配分を示すものではない
- したがって `03` §1 / `06` §バンク静的検証の条件「Step 0 で『各 15 問』が公式確認できた場合のみ各シナリオ 15 問も検証」は**不成立**。固定フォームはシナリオ内の問題数を固定せず、validator は「全問 scenario_id 非 null / scenario_id ∈ form.scenario_ids / 実使用集合 = form.scenario_ids」までを検証する
- フォーム設計上の指針(非検証): 公式が 4 シナリオ均等とは限らないため、form A/B/C は 4 シナリオ × 12〜18 問の範囲で**ドメイン配分 16-11-12-12-9 を優先**して組む(`07` Step 3b)

### 1.2 ドメイン配分(§4 Blueprint)— `02` の 16-11-12-12-9 を**確認**

| Domain | Content Domain | Weight |
|---|---|---|
| 1 | Agentic Architecture & Orchestration | 27% |
| 2 | Tool Design & MCP Integration | 18% |
| 3 | Claude Code Configuration & Workflows | 20% |
| 4 | Prompt Engineering & Structured Output | 20% |
| 5 | Context Management & Reliability | 15% |

27/18/20/20/15 × 60 = 16.2 / 10.8 / 12 / 12 / 9 → largest-remainder で **16 / 11 / 12 / 12 / 9**(`02` と一致、変更なし)。

### 1.3 `02` との突合結果(公式優先で `02` を更新済み)

| 項目 | `02` v1.1(調査ベース) | 公式 v1.0 | 処置 |
|---|---|---|---|
| 設問形式 | 多肢選択 | multiple-choice **and multiple-response**(各問で選択数を明記) | `02` に追記。バンクの `mcq_multi` が対応(`03`) |
| シナリオ | 6 本から 4 本抽選(一致) | 同左 + **6 本の名称と primary domains が明記** | `02` に 6 本を転記 |
| 各シナリオ 15 問 | 要検証 | **記述なし** | §1.1 のとおり OFF 確定。`02`/`03`/`06`/README から「要検証」を解消 |
| D2 主なトピック | トランスポートのトレードオフ、認証パターン | **範囲外**(Deploying/hosting MCP servers、OAuth/auth protocol details は Out-of-Scope) | `02` の主なトピックを公式タスクステートメントで全面置換 |
| D5 主なトピック | プロンプトキャッシュ(cache_control)、トークン見積り | **範囲外**(Prompt caching implementation details、Token counting algorithms / tokenization specifics は Out-of-Scope。ただし token budgets の判断は In-Scope)。D5 の実体は要約リスク・lost-in-the-middle・エスカレーション・エラー伝播・来歴・信頼度較正 | 同上 |
| D1/D3/D4 主なトピック | 概ね整合 | タスクステートメント 7/6/6 本 | 公式の文言で置換 |
| 推奨経験 | 6 ヶ月以上 | "6+ months of practical experience"(一致) | 変更なし |

## 2. 公式シナリオ(§5 転記・6 本)

固定フォーム(`07` Step 3b)のシナリオ設計はこの 6 本の文脈・primary domains に準拠する。サンプル問題のシナリオ見出しは 1 / 2 / 3 / 5 の 4 本。

### Scenario 1: Customer Support Resolution Agent
You are building a customer support resolution agent using the Claude Agent SDK. The agent handles high-ambiguity requests like returns, billing disputes, and account issues. It has access to your backend systems through custom Model Context Protocol (MCP) tools (get_customer, lookup_order, process_refund, escalate_to_human). Your target is 80%+ first-contact resolution while knowing when to escalate.
*Primary domains: Agentic Architecture & Orchestration, Tool Design & MCP Integration, Context Management & Reliability*
### Scenario 2: Code Generation with Claude Code
You are using Claude Code to accelerate software development. Your team uses it for code generation, refactoring, debugging, and documentation. You need to integrate it into your development workflow with custom slash commands, CLAUDE.md configurations, and understand when to use plan mode vs direct execution.
*Primary domains: Claude Code Configuration & Workflows, Context Management & Reliability*
### Scenario 3: Multi-Agent Research System
You are building a multi-agent research system using the Claude Agent SDK. A coordinator agent delegates to specialized subagents: one searches the web, one analyzes documents, one synthesizes findings, and one generates reports. The system researches topics and produces comprehensive, cited reports.
*Primary domains: Agentic Architecture & Orchestration, Tool Design & MCP Integration, Context Management & Reliability*
### Scenario 4: Developer Productivity with Claude
You are building developer productivity tools using the Claude Agent SDK. The agent helps engineers explore unfamiliar codebases, understand legacy systems, generate boilerplate code, and automate repetitive tasks. It uses the built-in tools (Read, Write, Bash, Grep, Glob) and integrates with Model Context Protocol (MCP) servers.
*Primary domains: Tool Design & MCP Integration, Claude Code Configuration & Workflows, Agentic Architecture & Orchestration*
### Scenario 5: Claude Code for Continuous Integration
You are integrating Claude Code into your Continuous Integration/Continuous Deployment (CI/CD) pipeline. The system runs automated code reviews, generates test cases, and provides feedback on pull requests. You need to design prompts that provide actionable feedback and minimize false positives.
*Primary domains: Claude Code Configuration & Workflows, Prompt Engineering & Structured Output*
### Scenario 6: Structured Data Extraction
You are building a structured data extraction system using Claude. The system extracts information from unstructured documents, validates the output using JavaScript Object Notation (JSON) schemas, and maintains high accuracy. It must handle edge cases gracefully and integrate with downstream systems.
*Primary domains: Prompt Engineering & Structured Output, Context Management & Reliability*

## 3. ドメイン別タスクステートメント(§6 転記・30 本)

`02` §トピックツリーの階層 `exam > domain > task_statement > topic` の **task_statement 層はこの 30 本と 1:1** とする。Step 1(C1)の `syllabus.yaml` はここから topic を分解する。ID 対応: Domain n → `f-dn`、Task Statement n.m → `f-dn-tm`。

| Domain | 本数 | Task Statements |
|---|---|---|
| 1 Agentic Architecture & Orchestration | 7 | 1.1–1.7 |
| 2 Tool Design & MCP Integration | 5 | 2.1–2.5 |
| 3 Claude Code Configuration & Workflows | 6 | 3.1–3.6 |
| 4 Prompt Engineering & Structured Output | 6 | 4.1–4.6 |
| 5 Context Management & Reliability | 6 | 5.1–5.6 |

### Domain 1: Agentic Architecture & Orchestration

#### Task Statement 1.1: Design and implement agentic loops for autonomous task execution
**Knowledge of:**
- The agentic loop lifecycle: sending requests to Claude, inspecting stop_reason ("tool_use" vs "end_turn"), executing requested tools, and returning results for the next iteration
- How tool results are appended to conversation history so the model can reason about the next action
- The distinction between model-driven decision-making (Claude reasons about which tool to call next based on context) and pre-configured decision trees or tool sequences

**Skills in:**
- Implementing agentic loop control flow that continues when stop_reason is "tool_use" and terminates when stop_reason is "end_turn"
- Adding tool results to conversation context between iterations so the model can incorporate new information into its reasoning
- Avoiding anti-patterns such as parsing natural language signals to determine loop termination, setting arbitrary iteration caps as the primary stopping mechanism, or checking for assistant text content as a completion indicator

#### Task Statement 1.2: Orchestrate multi-agent systems with coordinator-subagent patterns
**Knowledge of:**
- Hub-and-spoke architecture where a coordinator agent manages all inter-subagent communication, error handling, and information routing
- How subagents operate with isolated context—they do not inherit the coordinator's conversation history automatically
- The role of the coordinator in task decomposition, delegation, result aggregation, and deciding which subagents to invoke based on query complexity
- Risks of overly narrow task decomposition by the coordinator, leading to incomplete coverage of broad research topics

**Skills in:**
- Designing coordinator agents that analyze query requirements and dynamically select which subagents to invoke rather than always routing through the full pipeline
- Partitioning research scope across subagents to minimize duplication (e.g., assigning distinct subtopics or source types to each agent)
- Implementing iterative refinement loops where the coordinator evaluates synthesis output for gaps, re-delegates to search and analysis subagents with targeted queries, and re-invokes synthesis until coverage is sufficient
- Routing all subagent communication through the coordinator for observability, consistent error handling, and controlled information flow

#### Task Statement 1.3: Configure subagent invocation, context passing, and spawning

> **2026-08-24 現行名称注記:** 以下は Exam Guide v1.0 の原文どおり `Task` と記す。Claude Code v2.1.63 で実行ツール名は `Agent` に変更されたため、学習カードは現行 `Agent` を正答とし、`Task` は旧称として扱う。

**Knowledge of:**
- The Task tool as the mechanism for spawning subagents, and the requirement that allowedTools must include "Task" for a coordinator to invoke subagents
- That subagent context must be explicitly provided in the prompt—subagents do not automatically inherit parent context or share memory between invocations
- The AgentDefinition configuration including descriptions, system prompts, and tool restrictions for each subagent type
- Fork-based session management for exploring divergent approaches from a shared analysis baseline

**Skills in:**
- Including complete findings from prior agents directly in the subagent's prompt (e.g., passing web search results and document analysis outputs to the synthesis subagent)
- Using structured data formats to separate content from metadata (source URLs, document names, page numbers) when passing context between agents to preserve attribution
- Spawning parallel subagents by emitting multiple Task tool calls in a single coordinator response rather than across separate turns
- Designing coordinator prompts that specify research goals and quality criteria rather than step-by-step procedural instructions, to enable subagent adaptability

#### Task Statement 1.4: Implement multi-step workflows with enforcement and handoff patterns
**Knowledge of:**
- The difference between programmatic enforcement (hooks, prerequisite gates) and prompt-based guidance for workflow ordering
- When deterministic compliance is required (e.g., identity verification before financial operations), prompt instructions alone have a non-zero failure rate
- Structured handoff protocols for mid-process escalation that include customer details, root cause analysis, and recommended actions

**Skills in:**
- Implementing programmatic prerequisites that block downstream tool calls until prerequisite steps have completed (e.g., blocking process_refund until get_customer has returned a verified customer ID)
- Decomposing multi-concern customer requests into distinct items, then investigating each in parallel using shared context before synthesizing a unified resolution
- Compiling structured handoff summaries (customer ID, root cause, refund amount, recommended action) when escalating to human agents who lack access to the conversation transcript

#### Task Statement 1.5: Apply Agent SDK hooks for tool call interception and data normalization
**Knowledge of:**
- Hook patterns (e.g., PostToolUse) that intercept tool results for transformation before the model processes them
- Hook patterns that intercept outgoing tool calls to enforce compliance rules (e.g., blocking refunds above a threshold)
- The distinction between using hooks for deterministic guarantees versus relying on prompt instructions for probabilistic compliance

**Skills in:**
- Implementing PostToolUse hooks to normalize heterogeneous data formats (Unix timestamps, ISO 8601, numeric status codes) from different MCP tools before the agent processes them
- Implementing tool call interception hooks that block policy-violating actions (e.g., refunds exceeding $500) and redirect to alternative workflows (e.g., human escalation)
- Choosing hooks over prompt-based enforcement when business rules require guaranteed compliance

#### Task Statement 1.6: Design task decomposition strategies for complex workflows
**Knowledge of:**
- When to use fixed sequential pipelines (prompt chaining) versus dynamic adaptive decomposition based on intermediate findings
- Prompt chaining patterns that break reviews into sequential steps (e.g., analyze each file individually, then run a cross-file integration pass)
- The value of adaptive investigation plans that generate subtasks based on what is discovered at each step

**Skills in:**
- Selecting task decomposition patterns appropriate to the workflow: prompt chaining for predictable multi-aspect reviews, dynamic decomposition for open-ended investigation tasks
- Splitting large code reviews into per-file local analysis passes plus a separate cross-file integration pass to avoid attention dilution
- Decomposing open-ended tasks (e.g., "add comprehensive tests to a legacy codebase") by first mapping structure, identifying high-impact areas, then creating a prioritized plan that adapts as dependencies are discovered

#### Task Statement 1.7: Manage session state, resumption, and forking

> **2026-08-24 実装注記:** Exam Guide の名前付き `--resume` に加え、現行 Agent SDK は result message の `session_id` を後続 query の `resume` オプションへ渡して再開する。カードでは対象を CLI と SDK で明示する。

**Knowledge of:**
- Named session resumption using --resume <session-name> to continue a specific prior conversation
- fork_session for creating independent branches from a shared analysis baseline to explore divergent approaches
- The importance of informing the agent about changes to previously analyzed files when resuming sessions after code modifications
- Why starting a new session with a structured summary is more reliable than resuming with stale tool results

**Skills in:**
- Using --resume with session names to continue named investigation sessions across work sessions
- Using fork_session to create parallel exploration branches (e.g., comparing two testing strategies or refactoring approaches from a shared codebase analysis)
- Choosing between session resumption (when prior context is mostly valid) and starting fresh with injected summaries (when prior tool results are stale)
- Informing a resumed session about specific file changes for targeted re-analysis rather than requiring full re-exploration

### Domain 2: Tool Design & MCP Integration

#### Task Statement 2.1: Design effective tool interfaces with clear descriptions and boundaries
**Knowledge of:**
- Tool descriptions as the primary mechanism LLMs use for tool selection; minimal descriptions lead to unreliable selection among similar tools
- The importance of including input formats, example queries, edge cases, and boundary explanations in tool descriptions
- How ambiguous or overlapping tool descriptions cause misrouting (e.g., analyze_content vs analyze_document with near-identical descriptions)
- The impact of system prompt wording on tool selection: keyword-sensitive instructions can create unintended tool associations

**Skills in:**
- Writing tool descriptions that clearly differentiate each tool's purpose, expected inputs, outputs, and when to use it versus similar alternatives
- Renaming tools and updating descriptions to eliminate functional overlap (e.g., renaming analyze_content to extract_web_results with a web-specific description)
- Splitting generic tools into purpose-specific tools with defined input/output contracts (e.g., splitting a generic analyze_document into extract_data_points, summarize_content, and verify_claim_against_source)
- Reviewing system prompts for keyword-sensitive instructions that might override well-written tool descriptions

#### Task Statement 2.2: Implement structured error responses for MCP tools

> **2026-08-24 現行実装注記:** 以下の `errorCategory` / `isRetryable` は Exam Guide v1.0 の記載を保持した設計概念であり、MCP の標準結果フィールド名としては扱わない。現行 Agent SDK custom tool の失敗結果は TypeScript では `isError`、Python では `is_error` を用いる。in-process MCP server は handler の未捕捉例外も raw message を含む error result に変換するため agent loop は継続し、明示的に catch する利点は行動可能な文脈を付けられる点にある。

**Knowledge of:**
- The MCP isError flag pattern for communicating tool failures back to the agent
- The distinction between transient errors (timeouts, service unavailability), validation errors (invalid input), business errors (policy violations), and permission errors
- Why uniform error responses (generic "Operation failed") prevent the agent from making appropriate recovery decisions
- The difference between retryable and non-retryable errors, and how returning structured metadata prevents wasted retry attempts

**Skills in:**
- Returning structured error metadata including errorCategory (transient/validation/permission), isRetryable boolean, and human-readable descriptions
- Including retriable: false flags and customer-friendly explanations for business rule violations so the agent can communicate appropriately
- Implementing local error recovery within subagents for transient failures, propagating to the coordinator only errors that cannot be resolved locally along with partial results and what was attempted
- Distinguishing between access failures (needing retry decisions) and valid empty results (representing successful queries with no matches)

#### Task Statement 2.3: Distribute tools appropriately across agents and configure tool choice
**Knowledge of:**
- The principle that giving an agent access to too many tools (e.g., 18 instead of 4-5) degrades tool selection reliability by increasing decision complexity
- Why agents with tools outside their specialization tend to misuse them (e.g., a synthesis agent attempting web searches)
- Scoped tool access: giving agents only the tools needed for their role, with limited cross-role tools for specific high-frequency needs
- tool_choice configuration options: "auto", "any", and forced tool selection ({"type": "tool", "name": "..."})

**Skills in:**
- Restricting each subagent's tool set to those relevant to its role, preventing cross-specialization misuse
- Replacing generic tools with constrained alternatives (e.g., replacing fetch_url with load_document that validates document URLs)
- Providing scoped cross-role tools for high-frequency needs (e.g., a verify_fact tool for the synthesis agent) while routing complex cases through the coordinator
- Using tool_choice forced selection to ensure a specific tool is called first (e.g., forcing extract_metadata before enrichment tools), then processing subsequent steps in follow-up turns
- Setting tool_choice: "any" to guarantee the model calls a tool rather than returning conversational text

#### Task Statement 2.4: Integrate MCP servers into Claude Code and agent workflows

> **2026-08-27 現行ロード注記(旧 2026-08-24 注記を訂正):** 接続した MCP tools は利用可能。現行 Claude Code は **tool search が既定で有効**で、MCP ツール定義は**既定で遅延ロード**(必要時に発見・読込)される。「10% 閾値方式」は `ENABLE_TOOL_SEARCH=auto` を明示した閾値モードの挙動で、定義合計が context window の 10% 未満なら先読み、10% 到達で遅延に切り替わる(`auto:N` でカスタム閾値、`false` で全定義先読み)。旧注記は 10% 閾値を既定挙動と記述しており誤り(C3b-A の Codex レビューで検出、code.claude.com/docs/en/mcp で 2026-08-27 確認)。関連改訂: flash f-d2-q021 を retired・f-d2-q028 を新規採番(§9)。

**Knowledge of:**
- MCP server scoping: project-level (.mcp.json) for shared team tooling vs user-level (~/.claude.json) for personal/experimental servers
- Environment variable expansion in .mcp.json (e.g., ${GITHUB_TOKEN}) for credential management without committing secrets
- That tools from all configured MCP servers are discovered at connection time and available simultaneously to the agent
- MCP resources as a mechanism for exposing content catalogs (e.g., issue summaries, documentation hierarchies, database schemas) to reduce exploratory tool calls

**Skills in:**
- Configuring shared MCP servers in project-scoped .mcp.json with environment variable expansion for authentication tokens
- Configuring personal/experimental MCP servers in user-scoped ~/.claude.json
- Enhancing MCP tool descriptions to explain capabilities and outputs in detail, preventing the agent from preferring built-in tools (like Grep) over more capable MCP tools
- Choosing existing community MCP servers over custom implementations for standard integrations (e.g., Jira), reserving custom servers for team-specific workflows
- Exposing content catalogs as MCP resources to give agents visibility into available data without requiring exploratory tool calls

#### Task Statement 2.5: Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively
**Knowledge of:**
- Grep for content search (searching file contents for patterns like function names, error messages, or import statements)
- Glob for file path pattern matching (finding files by name or extension patterns)
- Read/Write for full file operations; Edit for targeted modifications using unique text matching
- When Edit fails due to non-unique text matches, using Read + Write as a fallback for reliable file modifications

**Skills in:**
- Selecting Grep for searching code content across a codebase (e.g., finding all callers of a function, locating error messages)
- Selecting Glob for finding files matching naming patterns (e.g., **/*.test.tsx)
- Using Read to load full file contents followed by Write when Edit cannot find unique anchor text
- Building codebase understanding incrementally: starting with Grep to find entry points, then using Read to follow imports and trace flows, rather than reading all files upfront
- Tracing function usage across wrapper modules by first identifying all exported names, then searching for each name across the codebase

### Domain 3: Claude Code Configuration & Workflows

#### Task Statement 3.1: Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization

> **2026-08-27 現行診断注記(旧 2026-08-24 注記を訂正):** `/context` は現在の context 全体をカテゴリ別に示すため、設定不具合の広い初期切り分けで最初に使う。`/memory` は現在のセッションにロードされた `CLAUDE.md` / rules と auto-memory を詳細表示し、編集導線も提供する。どちらでもロード状況は確認できるが、用途は「広い初期診断」と「memory の詳細確認」で区別する。

**Knowledge of:**
- The CLAUDE.md configuration hierarchy: user-level (~/.claude/CLAUDE.md), project-level (.claude/CLAUDE.md or root CLAUDE.md), and directory-level (subdirectory CLAUDE.md files)
- That user-level settings apply only to that user—instructions in ~/.claude/CLAUDE.md are not shared with teammates via version control
- The @import syntax for referencing external files to keep CLAUDE.md modular (e.g., importing specific standards files relevant to each package)
- .claude/rules/ directory for organizing topic-specific rule files as an alternative to a monolithic CLAUDE.md

**Skills in:**
- Diagnosing configuration hierarchy issues (e.g., a new team member not receiving instructions because they're in user-level rather than project-level configuration)
- Using @import to selectively include relevant standards files in each package's CLAUDE.md based on maintainer domain knowledge
- Splitting large CLAUDE.md files into focused topic-specific files in .claude/rules/ (e.g., testing.md, api-conventions.md, deployment.md)
- Using the /memory command to verify which memory files are loaded and diagnose inconsistent behavior across sessions

#### Task Statement 3.2: Create and configure custom slash commands and skills

> **2026-08-24 現行権限注記:** Exam Guide v1.0 の `allowed-tools` による「restrict tool access」は現行 Claude Code と意味が異なる。現行 skill frontmatter の `allowed-tools` は、その turn で確認なしに使えるツールを事前許可する grant であり、利用可能プールから除外するには `disallowed-tools` を使う。カードは現行挙動を正答とし、Guide の旧表現も区別して学ぶ。

**Knowledge of:**
- Project-scoped commands in .claude/commands/ (shared via version control) vs user-scoped commands in ~/.claude/commands/ (personal)
- Skills in .claude/skills/ with SKILL.md files that support frontmatter configuration including context: fork, allowed-tools, and argument-hint
- The context: fork frontmatter option for running skills in an isolated sub-agent context, preventing skill outputs from polluting the main conversation
- Personal skill customization: creating personal variants in ~/.claude/skills/ with different names to avoid affecting teammates

**Skills in:**
- Creating project-scoped slash commands in .claude/commands/ for team-wide availability via version control
- Using context: fork to isolate skills that produce verbose output (e.g., codebase analysis) or exploratory context (e.g., brainstorming alternatives) from the main session
- Configuring allowed-tools in skill frontmatter to restrict tool access during skill execution (e.g., limiting to file write operations to prevent destructive actions)
- Using argument-hint frontmatter to prompt developers for required parameters when they invoke the skill without arguments
- Choosing between skills (on-demand invocation for task-specific workflows) and CLAUDE.md (always-loaded universal standards)

#### Task Statement 3.3: Apply path-specific rules for conditional convention loading
**Knowledge of:**
- .claude/rules/ files with YAML frontmatter paths fields containing glob patterns for conditional rule activation
- How path-scoped rules load only when editing matching files, reducing irrelevant context and token usage
- The advantage of glob-pattern rules over directory-level CLAUDE.md files for conventions that span multiple directories (e.g., test files spread throughout a codebase)

**Skills in:**
- Creating .claude/rules/ files with YAML frontmatter path scoping (e.g., paths: ["terraform/**/*"]) so rules load only when editing matching files
- Using glob patterns in path-specific rules to apply conventions to files by type regardless of directory location (e.g., **/*.test.tsx for all test files)
- Choosing path-specific rules over subdirectory CLAUDE.md files when conventions must apply to files spread across the codebase

#### Task Statement 3.4: Determine when to use plan mode vs direct execution
**Knowledge of:**
- Plan mode is designed for complex tasks involving large-scale changes, multiple valid approaches, architectural decisions, and multi-file modifications
- Direct execution is appropriate for simple, well-scoped changes (e.g., adding a single validation check to one function)
- Plan mode enables safe codebase exploration and design before committing to changes, preventing costly rework
- The Explore subagent for isolating verbose discovery output and returning summaries to preserve main conversation context

**Skills in:**
- Selecting plan mode for tasks with architectural implications (e.g., microservice restructuring, library migrations affecting 45+ files, choosing between integration approaches with different infrastructure requirements)
- Selecting direct execution for well-understood changes with clear scope (e.g., a single-file bug fix with a clear stack trace, adding a date validation conditional)
- Using the Explore subagent for verbose discovery phases to prevent context window exhaustion during multi-phase tasks
- Combining plan mode for investigation with direct execution for implementation (e.g., planning a library migration, then executing the planned approach)

#### Task Statement 3.5: Apply iterative refinement techniques for progressive improvement
**Knowledge of:**
- Concrete input/output examples as the most effective way to communicate expected transformations when prose descriptions are interpreted inconsistently
- Test-driven iteration: writing test suites first, then iterating by sharing test failures to guide progressive improvement
- The interview pattern: having Claude ask questions to surface considerations the developer may not have anticipated before implementing
- When to provide all issues in a single message (interacting problems) versus fixing them sequentially (independent problems)

**Skills in:**
- Providing 2-3 concrete input/output examples to clarify transformation requirements when natural language descriptions produce inconsistent results
- Writing test suites covering expected behavior, edge cases, and performance requirements before implementation, then iterating by sharing test failures
- Using the interview pattern to surface design considerations (e.g., cache invalidation strategies, failure modes) before implementing solutions in unfamiliar domains
- Providing specific test cases with example input and expected output to fix edge case handling (e.g., null values in migration scripts)
- Addressing multiple interacting issues in a single detailed message when fixes interact, versus sequential iteration for independent issues

#### Task Statement 3.6: Integrate Claude Code into CI/CD pipelines

> **2026-08-24 現行workflow注記:** 現行ドキュメントの標準 `/code-review` workflow は、既存の Claude コメントがある PR を skip する。新しい commit ごとに必ず再レビューする要件では、標準 skill を再利用せず、既存コメントによる skip を実装しない独自 prompt / skill を更新トリガーで実行する。

**Knowledge of:**
- The -p (or --print) flag for running Claude Code in non-interactive mode in automated pipelines
- --output-format json and --json-schema CLI flags for enforcing structured output in CI contexts
- CLAUDE.md as the mechanism for providing project context (testing standards, fixture conventions, review criteria) to CI-invoked Claude Code
- Session context isolation: why the same Claude session that generated code is less effective at reviewing its own changes compared to an independent review instance

**Skills in:**
- Running Claude Code in CI with the -p flag to prevent interactive input hangs
- Using --output-format json with --json-schema to produce machine-parseable structured findings for automated posting as inline PR comments
- Including prior review findings in context when re-running reviews after new commits, instructing Claude to report only new or still-unaddressed issues to avoid duplicate comments
- Providing existing test files in context so test generation avoids suggesting duplicate scenarios already covered by the test suite
- Documenting testing standards, valuable test criteria, and available fixtures in CLAUDE.md to improve test generation quality and reduce low-value test output

### Domain 4: Prompt Engineering & Structured Output

#### Task Statement 4.1: Design prompts with explicit criteria to improve precision and reduce false positives
**Knowledge of:**
- The importance of explicit criteria over vague instructions (e.g., "flag comments only when claimed behavior contradicts actual code behavior" vs "check that comments are accurate")
- How general instructions like "be conservative" or "only report high-confidence findings" fail to improve precision compared to specific categorical criteria
- The impact of false positive rates on developer trust: high false positive categories undermine confidence in accurate categories

**Skills in:**
- Writing specific review criteria that define which issues to report (bugs, security) versus skip (minor style, local patterns) rather than relying on confidence-based filtering
- Temporarily disabling high false-positive categories to restore developer trust while improving prompts for those categories
- Defining explicit severity criteria with concrete code examples for each severity level to achieve consistent classification

#### Task Statement 4.2: Apply few-shot prompting to improve output consistency and quality
**Knowledge of:**
- Few-shot examples as the most effective technique for achieving consistently formatted, actionable output when detailed instructions alone produce inconsistent results
- The role of few-shot examples in demonstrating ambiguous-case handling (e.g., tool selection for ambiguous requests, branch-level test coverage gaps)
- How few-shot examples enable the model to generalize judgment to novel patterns rather than matching only pre-specified cases
- The effectiveness of few-shot examples for reducing hallucination in extraction tasks (e.g., handling informal measurements, varied document structures)

**Skills in:**
- Creating 2-4 targeted few-shot examples for ambiguous scenarios that show reasoning for why one action was chosen over plausible alternatives
- Including few-shot examples that demonstrate specific desired output format (location, issue, severity, suggested fix) to achieve consistency
- Providing few-shot examples distinguishing acceptable code patterns from genuine issues to reduce false positives while enabling generalization
- Using few-shot examples to demonstrate correct handling of varied document structures (inline citations vs bibliographies, methodology sections vs embedded details)
- Adding few-shot examples showing correct extraction from documents with varied formats to address empty/null extraction of required fields

#### Task Statement 4.3: Enforce structured output using tool use and JSON schemas
**Knowledge of:**
- Tool use (tool_use) with JSON schemas as the most reliable approach for guaranteed schema-compliant structured output, eliminating JSON syntax errors
- The distinction between tool_choice: "auto" (model may return text instead of calling a tool), "any" (model must call a tool but can choose which), and forced tool selection (model must call a specific named tool)
- That strict JSON schemas via tool use eliminate syntax errors but do not prevent semantic errors (e.g., line items that don't sum to total, values in wrong fields)
- Schema design considerations: required vs optional fields, enum fields with "other" + detail string patterns for extensible categories

**Skills in:**
- Defining extraction tools with JSON schemas as input parameters and extracting structured data from the tool_use response
- Setting tool_choice: "any" to guarantee structured output when multiple extraction schemas exist and the document type is unknown
- Forcing a specific tool with tool_choice: {"type": "tool", "name": "extract_metadata"} to ensure a particular extraction runs before enrichment steps
- Designing schema fields as optional (nullable) when source documents may not contain the information, preventing the model from fabricating values to satisfy required fields
- Adding enum values like "unclear" for ambiguous cases and "other" + detail fields for extensible categorization
- Including format normalization rules in prompts alongside strict output schemas to handle inconsistent source formatting

#### Task Statement 4.4: Implement validation, retry, and feedback loops for extraction quality
**Knowledge of:**
- Retry-with-error-feedback: appending specific validation errors to the prompt on retry to guide the model toward correction
- The limits of retry: retries are ineffective when the required information is simply absent from the source document (vs format or structural errors)
- Feedback loop design: tracking which code constructs trigger findings (detected_pattern field) to enable systematic analysis of dismissal patterns
- The difference between semantic validation errors (values don't sum, wrong field placement) and schema syntax errors (eliminated by tool use)

**Skills in:**
- Implementing follow-up requests that include the original document, the failed extraction, and specific validation errors for model self-correction
- Identifying when retries will be ineffective (e.g., information exists only in an external document not provided) versus when they will succeed (format mismatches, structural output errors)
- Adding detected_pattern fields to structured findings to enable analysis of false positive patterns when developers dismiss findings
- Designing self-correction validation flows: extracting "calculated_total" alongside "stated_total" to flag discrepancies, adding "conflict_detected" booleans for inconsistent source data

#### Task Statement 4.5: Design efficient batch processing strategies

> **2026-08-24 現行機能注記:** Exam Guide v1.0 の「single request 内で multi-turn tool calling 非対応」は、呼出元が途中で `tool_result` を返す client-side tool 往復として学ぶ。現行 Message Batches API は server tools をサポートし、batch worker 内で server-side agentic loop を実行する。24 時間は完了保証ではなく処理期限で、未完了リクエストは `expired` になり得る。

**Knowledge of:**
- The Message Batches API: 50% cost savings, up to 24-hour processing window, no guaranteed latency SLA
- Batch processing is appropriate for non-blocking, latency-tolerant workloads (overnight reports, weekly audits, nightly test generation) and inappropriate for blocking workflows (pre-merge checks)
- The batch API does not support multi-turn tool calling within a single request (cannot execute tools mid-request and return results)
- custom_id fields for correlating batch request/response pairs

**Skills in:**
- Matching API approach to workflow latency requirements: synchronous API for blocking pre-merge checks, batch API for overnight/weekly analysis
- Calculating batch submission frequency based on SLA constraints (e.g., 4-hour windows to guarantee 30-hour SLA with 24-hour batch processing)
- Handling batch failures: resubmitting only failed documents (identified by custom_id) with appropriate modifications (e.g., chunking documents that exceeded context limits)
- Using prompt refinement on a sample set before batch-processing large volumes to maximize first-pass success rates and reduce iterative resubmission costs

#### Task Statement 4.6: Design multi-instance and multi-pass review architectures
**Knowledge of:**
- Self-review limitations: a model retains reasoning context from generation, making it less likely to question its own decisions in the same session
- Independent review instances (without prior reasoning context) are more effective at catching subtle issues than self-review instructions or extended thinking
- Multi-pass review: splitting large reviews into per-file local analysis passes plus cross-file integration passes to avoid attention dilution and contradictory findings

**Skills in:**
- Using a second independent Claude instance to review generated code without the generator's reasoning context
- Splitting large multi-file reviews into focused per-file passes for local issues plus separate integration passes for cross-file data flow analysis
- Running verification passes where the model self-reports confidence alongside each finding to enable calibrated review routing

### Domain 5: Context Management & Reliability

#### Task Statement 5.1: Manage conversation context to preserve critical information across long interactions
**Knowledge of:**
- Progressive summarization risks: condensing numerical values, percentages, dates, and customer-stated expectations into vague summaries
- The "lost in the middle" effect: models reliably process information at the beginning and end of long inputs but may omit findings from middle sections
- How tool results accumulate in context and consume tokens disproportionately to their relevance (e.g., 40+ fields per order lookup when only 5 are relevant)
- The importance of passing complete conversation history in subsequent API requests to maintain conversational coherence

**Skills in:**
- Extracting transactional facts (amounts, dates, order numbers, statuses) into a persistent "case facts" block included in each prompt, outside summarized history
- Extracting and persisting structured issue data (order IDs, amounts, statuses) into a separate context layer for multi-issue sessions
- Trimming verbose tool outputs to only relevant fields before they accumulate in context (e.g., keeping only return-relevant fields from order lookups)
- Placing key findings summaries at the beginning of aggregated inputs and organizing detailed results with explicit section headers to mitigate position effects
- Requiring subagents to include metadata (dates, source locations, methodological context) in structured outputs to support accurate downstream synthesis
- Modifying upstream agents to return structured data (key facts, citations, relevance scores) instead of verbose content and reasoning chains when downstream agents have limited context budgets

#### Task Statement 5.2: Design effective escalation and ambiguity resolution patterns
**Knowledge of:**
- Appropriate escalation triggers: customer requests for a human, policy exceptions/gaps (not just complex cases), and inability to make meaningful progress
- The distinction between escalating immediately when a customer explicitly demands it versus offering to resolve when the issue is straightforward
- Why sentiment-based escalation and self-reported confidence scores are unreliable proxies for actual case complexity
- How multiple customer matches require clarification (requesting additional identifiers) rather than heuristic selection

**Skills in:**
- Adding explicit escalation criteria with few-shot examples to the system prompt demonstrating when to escalate versus resolve autonomously
- Honoring explicit customer requests for human agents immediately without first attempting investigation
- Acknowledging frustration while offering resolution when the issue is within the agent's capability, escalating only if the customer reiterates their preference
- Escalating when policy is ambiguous or silent on the customer's specific request (e.g., competitor price matching when policy only addresses own-site adjustments)
- Instructing the agent to ask for additional identifiers when tool results return multiple matches, rather than selecting based on heuristics

#### Task Statement 5.3: Implement error propagation strategies across multi-agent systems
**Knowledge of:**
- Structured error context (failure type, attempted query, partial results, alternative approaches) as enabling intelligent coordinator recovery decisions
- The distinction between access failures (timeouts needing retry decisions) and valid empty results (successful queries with no matches)
- Why generic error statuses ("search unavailable") hide valuable context from the coordinator
- Why silently suppressing errors (returning empty results as success) or terminating entire workflows on single failures are both anti-patterns

**Skills in:**
- Returning structured error context including failure type, what was attempted, partial results, and potential alternatives to enable coordinator recovery
- Distinguishing access failures from valid empty results in error reporting so the coordinator can make appropriate decisions
- Having subagents implement local recovery for transient failures and only propagate errors they cannot resolve, including what was attempted and partial results
- Structuring synthesis output with coverage annotations indicating which findings are well-supported versus which topic areas have gaps due to unavailable sources

#### Task Statement 5.4: Manage context effectively in large codebase exploration
**Knowledge of:**
- Context degradation in extended sessions: models start giving inconsistent answers and referencing "typical patterns" rather than specific classes discovered earlier
- The role of scratchpad files for persisting key findings across context boundaries
- Subagent delegation for isolating verbose exploration output while the main agent coordinates high-level understanding
- Structured state persistence for crash recovery: each agent exports state to a known location, and the coordinator loads a manifest on resume

**Skills in:**
- Spawning subagents to investigate specific questions (e.g., "find all test files," "trace refund flow dependencies") while the main agent preserves high-level coordination
- Having agents maintain scratchpad files recording key findings, referencing them for subsequent questions to counteract context degradation
- Summarizing key findings from one exploration phase before spawning sub-agents for the next phase, injecting summaries into initial context
- Designing crash recovery using structured agent state exports (manifests) that the coordinator loads on resume and injects into agent prompts
- Using /compact to reduce context usage during extended exploration sessions when context fills with verbose discovery output

#### Task Statement 5.5: Design human review workflows and confidence calibration
**Knowledge of:**
- The risk that aggregate accuracy metrics (e.g., 97% overall) may mask poor performance on specific document types or fields
- Stratified random sampling for measuring error rates in high-confidence extractions and detecting novel error patterns
- Field-level confidence scores calibrated using labeled validation sets for routing review attention
- The importance of validating accuracy by document type and field segment before automating high-confidence extractions

**Skills in:**
- Implementing stratified random sampling of high-confidence extractions for ongoing error rate measurement and novel pattern detection
- Analyzing accuracy by document type and field to verify consistent performance across all segments before reducing human review
- Having models output field-level confidence scores, then calibrating review thresholds using labeled validation sets
- Routing extractions with low model confidence or ambiguous/contradictory source documents to human review, prioritizing limited reviewer capacity

#### Task Statement 5.6: Preserve information provenance and handle uncertainty in multi-source synthesis
**Knowledge of:**
- How source attribution is lost during summarization steps when findings are compressed without preserving claim-source mappings
- The importance of structured claim-source mappings that the synthesis agent must preserve and merge when combining findings
- How to handle conflicting statistics from credible sources: annotating conflicts with source attribution rather than arbitrarily selecting one value
- Temporal data: requiring publication/collection dates in structured outputs to prevent temporal differences from being misinterpreted as contradictions

**Skills in:**
- Requiring subagents to output structured claim-source mappings (source URLs, document names, relevant excerpts) that downstream agents preserve through synthesis
- Structuring reports with explicit sections distinguishing well-established findings from contested ones, preserving original source characterizations and methodological context
- Completing document analysis with conflicting values included and explicitly annotated, letting the coordinator decide how to reconcile before passing to synthesis
- Requiring subagents to include publication or data collection dates in structured outputs to enable correct temporal interpretation
- Rendering different content types appropriately in synthesis outputs—financial data as tables, news as prose, technical findings as structured lists—rather than converting everything to a uniform format

## 4. 出題範囲の明示(§17 Appendix 転記)

### 4.1 Technologies and Concepts("might appear on the exam")

> **2026-08-24 原文保持注記:** 以下の Appendix は Exam Guide v1.0 の転記を変更せず保持する。現行製品との差分は各 Task Statement 直前の dated 注記を正とする。

- Claude Agent SDK — agent definitions, agentic loops, stop_reason handling, hooks (PostToolUse, tool call interception), subagent spawning via Task tool, allowedTools configuration
- Model Context Protocol (MCP) — MCP servers, MCP tools, MCP resources, isError flag, tool descriptions, tool distribution, .mcp.json configuration, environment variable expansion
- Claude Code — CLAUDE.md configuration hierarchy (user/project/directory), .claude/rules/ with YAML frontmatter path-scoping, .claude/commands/ for slash commands, .claude/skills/ with SKILL.md frontmatter (context: fork, allowed-tools, argument-hint), plan mode, direct execution, /memory command, /compact, --resume, fork_session, Explore subagent
- Claude Code CLI — -p / --print flag for non-interactive mode, --output-format json, --json-schema for structured CI output
- Claude API — tool_use with JSON schemas, tool_choice options ("auto", "any", forced tool selection), stop_reason values ("tool_use", "end_turn"), max_tokens, system prompts
- Message Batches API — 50% cost savings, up to 24-hour processing window, custom_id for request/response correlation, polling for completion, no multi-turn tool calling support
- JSON Schema — required vs optional fields, enum types, nullable fields, "other" + detail string patterns, strict mode for syntax error elimination
- Pydantic — schema validation, semantic validation errors, validation-retry loops
- Built-in tools — Read, Write, Edit, Bash, Grep, Glob — their purposes and selection criteria
- Few-shot prompting — targeted examples for ambiguous scenarios, format demonstration, generalization to novel patterns
- Prompt chaining — sequential task decomposition into focused passes
- Context window management — token budgets, progressive summarization, lost-in-the-middle effects, context extraction, scratchpad files
- Session management — session resumption, fork_session, named sessions, session context isolation
- Confidence scoring — field-level confidence, calibration with labeled validation sets, stratified sampling for error rate measurement

### 4.2 In-Scope Topics("explicitly tested")

- Agentic loop implementation: control flow based on stop_reason, tool result handling, loop termination conditions
- Multi-agent orchestration: coordinator-subagent patterns, task decomposition, parallel subagent execution, iterative refinement loops
- Subagent context management: explicit context passing, structured state persistence, crash recovery using manifests
- Tool interface design: writing effective tool descriptions, splitting vs consolidating tools, tool naming to reduce ambiguity
- MCP tool and resource design: resources for content catalogs, tools for actions, description quality for adoption
- MCP server configuration: project vs user scope, environment variable expansion, multi-server simultaneous access
- Error handling and propagation: structured error responses, transient vs business vs permission errors, local recovery before escalation
- Escalation decision-making: explicit criteria, honoring customer preferences, policy gap identification
- CLAUDE.md configuration: hierarchy (user/project/directory), @import patterns, .claude/rules/ with glob patterns
- Custom commands and skills: project vs user scope, context: fork, allowed-tools, argument-hint frontmatter
- Plan mode vs direct execution: complexity assessment, architectural decisions, single-file changes
- Iterative refinement: input/output examples, test-driven iteration, interview pattern, sequential vs parallel issue resolution
- Structured output via tool_use: schema design, tool_choice configuration, nullable fields to prevent hallucination
- Few-shot prompting: ambiguous scenario targeting, format consistency, false positive reduction
- Batch processing: Message Batches API appropriateness, latency tolerance assessment, failure handling by custom_id
- Context window optimization: trimming verbose tool outputs, structured fact extraction, position-aware input ordering
- Human review workflows: confidence calibration, stratified sampling, accuracy segmentation by document type and field
- Information provenance: claim-source mappings, temporal data handling, conflict annotation, coverage gap reporting

### 4.3 Out-of-Scope Topics("will not appear")— **バンクに出題しない**

- Fine-tuning Claude models or training custom models
- Claude API authentication, billing, or account management
- Detailed implementation of specific programming languages or frameworks (beyond what's needed for tool and schema configuration)
- Deploying or hosting MCP servers (infrastructure, networking, container orchestration)
- Claude's internal architecture, training process, or model weights
- Constitutional AI, RLHF, or safety training methodologies
- Embedding models or vector database implementation details
- Computer use (browser automation, desktop interaction)
- Vision/image analysis capabilities
- Streaming API implementation or server-sent events
- Rate limiting, quotas, or API pricing calculations
- OAuth, API key rotation, or authentication protocol details
- Specific cloud provider configurations (AWS, GCP, Azure)
- Performance benchmarking or model comparison metrics
- Prompt caching implementation details (beyond knowing it exists)
- Token counting algorithms or tokenization specifics

生成時の注意: `02` v1.1 の D2「トランスポート / 認証パターン」、D5「プロンプトキャッシュ(cache_control)実装詳細 / トークン計数アルゴリズム」はこの Out-of-Scope に該当するため、**問題化しない**(知っていることを前提にした文脈としての言及は可)。ただし **`Context window management — token budgets`(§4.1)は出題対象**: コンテキスト予算の判断(冗長なツール出力のトリミング、構造化事実抽出、subagent への予算配慮)は D5 で出題する。範囲外なのは token counting algorithms / tokenization specifics のみ。

## 5. 公式サンプル問題(§9 転記・12 問)

原文: "The following sample questions illustrate the format and difficulty level of the exam. These are drawn from the practice test and include explanations to aid learning."

`07` Step 3b の文体・難易度・解説スタイル(正解の根拠 + 各誤答が劣る理由を全て潰す)の**基準**。問題はすべて 4 択・単一正解で、"most effective" / "most likely root cause" / "best enables" 型。**これらはバンクに転記しない**(Guide の再配布に当たるため。バンクは同型の自作問題のみ)。

### Scenario: Customer Support Resolution Agent

**Question 1:** Production data shows that in 12% of cases, your agent skips get_customer entirely and calls lookup_order using only the customer's stated name, occasionally leading to misidentified accounts and incorrect refunds. What change would most effectively address this reliability issue?
- A. Add a programmatic prerequisite that blocks lookup_order and process_refund calls until get_customer has returned a verified customer ID.
- B. Enhance the system prompt to state that customer verification via get_customer is mandatory before any order operations.
- C. Add few-shot examples showing the agent always calling get_customer first, even when customers volunteer order details.
- D. Implement a routing classifier that analyzes each request and enables only the subset of tools appropriate for that request type.
**Correct Answer:** A. When a specific tool sequence is required for critical business logic (like verifying customer identity before processing refunds), programmatic enforcement provides deterministic guarantees that prompt-based approaches cannot. Options B and C rely on probabilistic LLM compliance, which is insufficient when errors have financial consequences. Option D addresses tool availability rather than tool ordering, which is not the actual problem.

**Question 2:** Production logs show the agent frequently calls get_customer when users ask about orders (e.g., "check my order #12345"), instead of calling lookup_order. Both tools have minimal descriptions ("Retrieves customer information" / "Retrieves order details") and accept similar identifier formats. What's the most effective first step to improve tool selection reliability?
- A. Add few-shot examples to the system prompt demonstrating correct tool selection patterns, with 5-8 examples showing order-related queries routing to lookup_order.
- B. Expand each tool's description to include input formats it handles, example queries, edge cases, and boundaries explaining when to use it versus similar tools.
- C. Implement a routing layer that parses user input before each turn and pre-selects the appropriate tool based on detected keywords and identifier patterns.
- D. Consolidate both tools into a single lookup_entity tool that accepts any identifier and internally determines which backend to query.

**Correct Answer:** B. Tool descriptions are the primary mechanism LLMs use for tool selection. When descriptions are minimal, models lack the context to differentiate between similar tools. Option B directly addresses this root cause with a low-effort, high-leverage fix. Few-shot examples (A) add token overhead without fixing the underlying issue. A routing layer (C) is over-engineered and bypasses the LLM's natural language understanding. Consolidating tools (D) is a valid architectural choice but requires more effort than a "first step" warrants when the immediate problem is inadequate descriptions.

**Question 3:** Your agent achieves 55% first-contact resolution, well below the 80% target. Logs show it escalates straightforward cases (standard damage replacements with photo evidence) while attempting to autonomously handle complex situations requiring policy exceptions. What's the most effective way to improve escalation calibration?
- A. Add explicit escalation criteria to your system prompt with few-shot examples demonstrating when to escalate versus resolve autonomously.
- B. Have the agent self-report a confidence score (1-10) before each response and automatically route requests to humans when confidence falls below a threshold.
- C. Deploy a separate classifier model trained on historical tickets to predict which requests need escalation before the main agent begins processing.
- D. Implement sentiment analysis to detect customer frustration levels and automatically escalate when negative sentiment exceeds a threshold.
**Correct Answer:** A. Adding explicit escalation criteria with few-shot examples directly addresses the root cause: unclear decision boundaries. This is the proportionate first response before adding infrastructure. Option B fails because LLM self-reported confidence is poorly calibrated—the agent is already incorrectly confident on hard cases. Option C is over-engineered, requiring labeled data and ML infrastructure when prompt optimization hasn't been tried. Option D solves a different problem entirely; sentiment doesn't correlate with case complexity, which is the actual issue.

### Scenario: Code Generation with Claude Code

**Question 4:** You want to create a custom /review slash command that runs your team's standard code review checklist. This command should be available to every developer when they clone or pull the repository. Where should you create this command file?
- A. In the .claude/commands/ directory in the project repository
- B. In ~/.claude/commands/ in each developer's home directory
- C. In the CLAUDE.md file at the project root
- D. In a .claude/config.json file with a commands array

**Correct Answer:** A. Project-scoped custom slash commands should be stored in the .claude/commands/ directory within the repository. These commands are version-controlled and automatically available to all developers when they clone or pull the repo. Option B (~/.claude/commands/) is for personal commands that aren't shared via version control. Option C (CLAUDE.md) is for project instructions and context, not command definitions. Option D describes a configuration mechanism that doesn't exist in Claude Code.

**Question 5:** You've been assigned to restructure the team's monolithic application into microservices. This will involve changes across dozens of files and requires decisions about service boundaries and module dependencies. Which approach should you take?
- A. Enter plan mode to explore the codebase, understand dependencies, and design an implementation approach before making changes.
- B. Start with direct execution and make changes incrementally, letting the implementation reveal the natural service boundaries.
- C. Use direct execution with comprehensive upfront instructions detailing exactly how each service should be structured.
- D. Begin in direct execution mode and only switch to plan mode if you encounter unexpected complexity during implementation.
**Correct Answer:** A. Plan mode is designed for complex tasks involving large-scale changes, multiple valid approaches, and architectural decisions—exactly what monolith-to-microservices restructuring requires. It enables safe codebase exploration and design before committing to changes. Option B risks costly rework when dependencies are discovered late. Option C assumes you already know the right structure without exploring the code. Option D ignores that the complexity is already stated in the requirements, not something that might emerge later.

**Question 6:** Your codebase has distinct areas with different coding conventions: React components use functional style with hooks, API handlers use async/await with specific error handling, and database models follow a repository pattern. Test files are spread throughout the codebase alongside the code they test (e.g., Button.test.tsx next to Button.tsx), and you want all tests to follow the same conventions regardless of location. What's the most maintainable way to ensure Claude automatically applies the correct conventions when generating code?
- A. Create rule files in .claude/rules/ with YAML frontmatter specifying glob patterns to conditionally apply conventions based on file paths
- B. Consolidate all conventions in the root CLAUDE.md file under headers for each area, relying on Claude to infer which section applies
- C. Create skills in .claude/skills/ for each code type that include the relevant conventions in their SKILL.md files
- D. Place a separate CLAUDE.md file in each subdirectory containing that area's specific conventions

**Correct Answer:** A. Option A is correct because .claude/rules/ with glob patterns (e.g., **/*.test.tsx) allows conventions to be automatically applied based on file paths regardless of directory location, essential for test files spread throughout the codebase. Option B relies on inference rather than explicit matching, making it unreliable. Option C requires manual skill invocation or relies on Claude choosing to load them, contradicting the need for deterministic "automatic" application based on file paths. Option D can't easily handle files spread across many directories since CLAUDE.md files are directory-bound.

### Scenario: Multi-Agent Research System

**Question 7:** After running the system on the topic "impact of AI on creative industries," you observe that each subagent completes successfully: the web search agent finds relevant articles, the document analysis agent summarizes papers correctly, and the synthesis agent produces coherent output. However, the final reports cover only visual arts, completely missing music, writing, and film production. When you examine the coordinator's logs, you see it decomposed the topic into three subtasks: "AI in digital art creation," "AI in graphic design," and "AI in photography." What is the most likely root cause?
- A. The synthesis agent lacks instructions for identifying coverage gaps in the findings it receives from other agents.
- B. The coordinator agent's task decomposition is too narrow, resulting in subagent assignments that don't cover all relevant domains of the topic.
- C. The web search agent's queries are not comprehensive enough and need to be expanded to cover more creative industry sectors.
- D. The document analysis agent is filtering out sources related to non-visual creative industries due to overly restrictive relevance criteria.
**Correct Answer:** B. The coordinator's logs reveal the root cause directly: it decomposed "creative industries" into only visual arts subtasks (digital art, graphic design, photography), completely omitting music, writing, and film. The subagents executed their assigned tasks correctly—the problem is what they were assigned. Options A, C, and D incorrectly blame downstream agents that are working correctly within their assigned scope.

**Question 8:** The web search subagent times out while researching a complex topic. You need to design how this failure information flows back to the coordinator agent. Which error propagation approach best enables intelligent recovery?
- A. Return structured error context to the coordinator including the failure type, the attempted query, any partial results, and potential alternative approaches.
- B. Implement automatic retry logic with exponential backoff within the subagent, returning a generic "search unavailable" status only after all retries are exhausted.
- C. Catch the timeout within the subagent and return an empty result set marked as successful.
- D. Propagate the timeout exception directly to a top-level handler that terminates the entire research workflow.
**Correct Answer:** A. Structured error context gives the coordinator the information it needs to make intelligent recovery decisions—whether to retry with a modified query, try an alternative approach, or proceed with partial results. Option B's generic status hides valuable context from the coordinator, preventing informed decisions. Option C suppresses the error by marking failure as success, which prevents any recovery and risks incomplete research outputs. Option D terminates the entire workflow unnecessarily when recovery strategies could succeed.

**Question 9:** During testing, you observe that the synthesis agent frequently needs to verify specific claims while combining findings. Currently, when verification is needed, the synthesis agent returns control to the coordinator, which invokes the web search agent, then re-invokes synthesis with results. This adds 2-3 round trips per task and increases latency by 40%. Your evaluation shows that 85% of these verifications are simple fact-checks (dates, names, statistics) while 15% require deeper investigation. What's the most effective approach to reduce overhead while maintaining system reliability?
- A. Give the synthesis agent a scoped verify_fact tool for simple lookups, while complex verifications continue delegating to the web search agent through the coordinator.
- B. Have the synthesis agent accumulate all verification needs and return them as a batch to the coordinator at the end of its pass, which then sends them all to the web search agent at once.
- C. Give the synthesis agent access to all web search tools so it can handle any verification need directly without round-trips through the coordinator.
- D. Have the web search agent proactively cache extra context around each source during initial research, anticipating what the synthesis agent might need to verify.
**Correct Answer:** A. Option A applies the principle of least privilege by giving the synthesis agent only what it needs for the 85% common case (simple fact verification) while preserving the existing coordination pattern for complex cases. Option B's batching approach creates blocking dependencies since synthesis steps may depend on earlier verified facts. Option C over-provisions the synthesis agent, violating separation of concerns. Option D relies on speculative caching that cannot reliably predict what the synthesis agent will need to verify.

### Scenario: Claude Code for Continuous Integration

**Question 10:** Your pipeline script runs claude "Analyze this pull request for security issues" but the job hangs indefinitely. Logs indicate Claude Code is waiting for interactive input. What's the correct approach to run Claude Code in an automated pipeline?
- A. Add the -p flag: claude -p "Analyze this pull request for security issues"
- B. Set the environment variable CLAUDE_HEADLESS=true before running the command
- C. Redirect stdin from /dev/null: claude "Analyze this pull request for security issues" < /dev/null
- D. Add the --batch flag: claude --batch "Analyze this pull request for security issues"
**Correct Answer:** A. The -p (or --print) flag is the documented way to run Claude Code in non-interactive mode. It processes the prompt, outputs the result to stdout, and exits without waiting for user input—exactly what CI/CD pipelines require. The other options reference non-existent features (CLAUDE_HEADLESS environment variable, --batch flag) or use Unix workarounds that don't properly address Claude Code's command syntax.

**Question 11:** Your team wants to reduce API costs for automated analysis. Currently, real-time Claude calls power two workflows: (1) a blocking pre-merge check that must complete before developers can merge, and (2) a technical debt report generated overnight for review the next morning. Your manager proposes switching both to the Message Batches API for its 50% cost savings. How should you evaluate this proposal?
- A. Use batch processing for the technical debt reports only; keep real-time calls for pre-merge checks.
- B. Switch both workflows to batch processing with status polling to check for completion.
- C. Keep real-time calls for both workflows to avoid batch result ordering issues.
- D. Switch both to batch processing with a timeout fallback to real-time if batches take too long.
**Correct Answer:** A. The Message Batches API offers 50% cost savings but has processing times up to 24 hours with no guaranteed latency SLA. This makes it unsuitable for blocking pre-merge checks where developers wait for results, but ideal for overnight batch jobs like technical debt reports. Option B is wrong because relying on "often faster" completion isn't acceptable for blocking workflows. Option C reflects a misconception—batch results can be correlated using custom_id fields. Option D adds unnecessary complexity when the simpler solution is matching each API to its appropriate use case.

**Question 12:** A pull request modifies 14 files across the stock tracking module. Your single-pass review analyzing all files together produces inconsistent results: detailed feedback for some files but superficial comments for others, obvious bugs missed, and contradictory feedback—flagging a pattern as problematic in one file while approving identical code elsewhere in the same PR. How should you restructure the review?
- A. Split into focused passes: analyze each file individually for local issues, then run a separate integration-focused pass examining cross-file data flow.
- B. Require developers to split large PRs into smaller submissions of 3-4 files before the automated review runs.
- C. Switch to a higher-tier model with a larger context window to give all 14 files adequate attention in one pass.
- D. Run three independent review passes on the full PR and only flag issues that appear in at least two of the three runs.
**Correct Answer:** A. Splitting reviews into focused passes directly addresses the root cause: attention dilution when processing many files at once. File-by-file analysis ensures consistent depth, while a separate integration pass catches cross-file issues. Option B shifts burden to developers without improving the system. Option C misunderstands that larger context windows don't solve attention quality issues. Option D would actually suppress detection of real bugs by requiring consensus on issues that may only be caught intermittently.

### 5.1 サンプルから読み取る出題パターン(バンク生成への指針)

| パターン | 例 | 設計への反映 |
|---|---|---|
| 「決定的保証 vs 確率的遵守」 | Q1(プログラム的前提 > プロンプト指示) | 1.4 / 1.5 / 4.1 系の正解は hooks・programmatic enforcement 側 |
| 「根本原因に対する最小・最初の一手」 | Q2(ツール説明の拡充が "first step")、Q3(明示基準 + few-shot) | "over-engineered" な選択肢(分類器・ルーティング層・別モデル)は誤答側に置く |
| 「スコープの正しい置き場所」 | Q4(.claude/commands/)、Q6(.claude/rules/ + glob) | project/user scope、directory-bound CLAUDE.md vs path-scoped rules の対比 |
| 「ログから根本原因を読む」 | Q7(coordinator の分解が狭い) | 下流エージェントに責任転嫁する選択肢を誤答に |
| 「構造化エラー文脈」 | Q8 | generic status / silent success / 全体終了 の 3 アンチパターンを誤答に |
| 「最小権限 + 高頻度ケースのスコープ付きツール」 | Q9(85/15 分割) | 全ツール付与(過剰)/ バッチ化(依存で詰まる)/ 投機的キャッシュ を誤答に |
| 「CLI フラグの正確な知識」 | Q10(-p / --print) | 存在しないフラグ・環境変数を誤答に(具体名で) |
| 「API 種別とレイテンシ要件の対応」 | Q11(Batches = 非ブロッキングのみ) | custom_id・24h・50% の数値知識 |
| 「注意の希釈 → パス分割」 | Q12(per-file + integration pass) | 「大きいコンテキストで解決」「多数決」を誤答に |

## 6. 準備指針(§7 / §8 要約・原文は PDF 参照)

§7 How to Prepare: Agent SDK でエージェント構築(agentic loop・tool calling・error handling・session・subagent)、実プロジェクトで Claude Code 設定(CLAUDE.md 階層・`.claude/rules/`・skills frontmatter・MCP 1 本以上)、MCP ツール設計とテスト(説明差別化・構造化エラー・曖昧要求での選択信頼性)、構造化抽出パイプライン(tool_use + JSON schema・validation-retry・nullable・Batches)、プロンプト技法(few-shot・明示基準・multi-pass review)、コンテキスト管理(構造化事実抽出・scratchpad・subagent 委任)、エスカレーション / human-in-the-loop。

§8 Preparation Exercises(4 本): 1 Multi-Tool Agent with Escalation Logic(D1/D2/D5)、2 Configure Claude Code for a Team Development Workflow(D3)、3 Build a Structured Data Extraction Pipeline(D4/D5)、4 Design and Debug a Multi-Agent Research Pipeline(D1/D2/D5)。

## 7. 受験ポリシー(§11–§15 要点・オーナー向け)

- 登録: Anthropic Partner Academy → Pearson VUE。キャンセル・日程変更は **24 時間前まで**(以後は受験料没収)
- 当日: 有効な政府発行の写真付き ID、登録名と完全一致
- 再受験: 待機期間 1 回目 14 日 / 2 回目 30 日 / 3 回目 90 日。12 ヶ月のローリング期間で最大 4 回
- 有効期限: 取得日から 12 ヶ月
- NDA: 試験内容(問題・選択肢・シナリオ)の開示・複製・配布禁止。本アプリのバンクは自作問題のみで構成し、本番問題を記録しない

## 8. 本ファイルが更新した specs

| spec | 箇所 | 内容 |
|---|---|---|
| `02` | 全体 | 公式 v1.0 で突合済みに書き換え。形式(multiple-response)、6 シナリオ転記、D1–D5 主なトピックを公式タスクステートメントで置換、15 問要検証を解消 |
| `03` | §1 mock_forms validator | 「各シナリオ 15 問」検証 OFF を確定記録 |
| `06` | §バンク静的検証 | 同上 |
| `README` | 未確定事項 | 「4×15 か否か」を解消 |
| `07` | Step 0 手順 2 | 転記先を `SOURCES.md` に訂正(C1 で反映。`syllabus.yaml` はトピックツリー専用) |

## 9. 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-08-23 | 初版(C0)。Exam Guide v1.0 を転記 |
| 2026-08-27 | C3b-A: §2.4 の現行ロード注記を訂正(MCP ツール定義は既定で遅延ロード。10% 閾値は `ENABLE_TOOL_SEARCH=auto` 時のみ)。明確な事実誤り(改訂トリガー b)として flash f-d2-q021 を retired、f-d2-q028 を新規(flagged、Step 4 で active 化)。syllabus.yaml f-d2-t4-02 scope_ja も同時修正 |
| 2026-08-27 | C3b-A Step 4: §3.1 の現行診断注記を訂正(`/context` は広い初期診断、`/memory` はロード済み memory の詳細一覧にも使用)。複数正解化した flash f-d3-q005 を retired、f-d3-q031 を新規(flagged)。関連する f-d3-q006 / f-d3-q101 は解説の事実訂正として rev++ し flagged へ戻した |

## 10. refs ソース台帳(C2・2026-08-24)

カードの `refs` は本台帳の「ref URL」列の URL **のみ**を使用する(`07` Step 2 / C2 プラン)。全 URL は 2026-08-24 に curl で HTTP 200 と本文のトピック整合(タイトル・キーワード)を確認済み。旧 #4(modelcontextprotocol.io/docs/concepts/tools)は許可ソース(Exam Guide / docs.claude.com / Anthropic Academy / Anthropic 公式ブログ)に該当しないため Step 4 レビューで削除し、参照カードは許可ソースへ差し替えた(2026-08-24)。#35〜38 は Step 4 で追加(curl で 200・タイトル整合を確認済み)。docs.claude.com の Claude Code / Agent SDK 系は code.claude.com へ、Platform 系は platform.claude.com へ、MCP 概説は modelcontextprotocol.io へ 301 リダイレクトされる(いずれも公式ドキュメント。「正規 URL」列が最終到達先)。ページ改訂は Step 6 で扱う。

| # | ref URL | 正規 URL(最終到達先) | 主な対応タスクステートメント |
|---|---|---|---|
| 1 | https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview | platform.claude.com/docs/en/agents-and-tools/tool-use/overview | 1.1, 2.3, 4.3 |
| 2 | https://docs.claude.com/en/docs/agents-and-tools/tool-use/implement-tool-use | platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools | 2.1, 4.3 |
| 3 | https://docs.claude.com/en/docs/agents-and-tools/mcp | modelcontextprotocol.io/docs/2026-07-28/getting-started/intro | 2.4 |
| 5 | https://docs.claude.com/en/docs/claude-code/memory | code.claude.com/docs/en/memory | 3.1, 3.3 |
| 6 | https://docs.claude.com/en/docs/claude-code/skills | code.claude.com/docs/en/skills | 3.2 |
| 7 | https://docs.claude.com/en/docs/claude-code/slash-commands | code.claude.com/docs/en/slash-commands | 3.2 |
| 8 | https://docs.claude.com/en/docs/claude-code/mcp | code.claude.com/docs/en/mcp | 2.4 |
| 9 | https://docs.claude.com/en/docs/claude-code/common-workflows | code.claude.com/docs/en/common-workflows | 3.4, 2.5 |
| 10 | https://docs.claude.com/en/docs/claude-code/github-actions | code.claude.com/docs/en/github-actions | 3.6 |
| 11 | https://docs.claude.com/en/docs/claude-code/settings | code.claude.com/docs/en/settings | 3.1, 3.3 |
| 12 | https://docs.claude.com/en/docs/claude-code/cli-reference | code.claude.com/docs/en/cli-reference | 3.6 |
| 13 | https://docs.claude.com/en/docs/claude-code/headless | code.claude.com/docs/en/headless | 3.6 |
| 14 | https://docs.claude.com/en/docs/claude-code/hooks | code.claude.com/docs/en/hooks | 1.5(Claude Code 側 hooks) |
| 15 | https://docs.claude.com/en/docs/claude-code/sub-agents | code.claude.com/docs/en/sub-agents | 1.3, 3.4 |
| 16 | https://docs.claude.com/en/api/agent-sdk/overview | code.claude.com/docs/en/agent-sdk/overview | 1.1, 1.6 |
| 17 | https://docs.claude.com/en/api/agent-sdk/subagents | code.claude.com/docs/en/agent-sdk/subagents | 1.2, 1.3 |
| 18 | https://docs.claude.com/en/api/agent-sdk/sessions | code.claude.com/docs/en/agent-sdk/sessions | 1.7 |
| 19 | https://docs.claude.com/en/api/agent-sdk/custom-tools | code.claude.com/docs/en/agent-sdk/custom-tools | 2.1, 2.2 (`isError` / `is_error` と未捕捉例外の挙動) |
| 20 | https://docs.claude.com/en/api/agent-sdk/hooks | code.claude.com/docs/en/agent-sdk/hooks | 1.5 |
| 21 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview | platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview | 4.1 |
| 22 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/multishot-prompting | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#use-examples-effectively | 4.2 |
| 23 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#be-clear-and-direct | 4.1 |
| 24 | https://docs.claude.com/en/docs/build-with-claude/batch-processing | platform.claude.com/docs/en/build-with-claude/batch-processing | 4.5(50% / 24h expiry / custom_id / server tools loop を本文確認) |
| 25 | https://docs.claude.com/en/docs/build-with-claude/context-windows | platform.claude.com/docs/en/build-with-claude/context-windows | 5.1 |
| 26 | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/long-context-tips | platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#long-context-prompting | 5.1 |
| 27 | https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations | platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations | 4.4, 5.6 |
| 28 | https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/increase-consistency | platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency | 4.2, 4.4 |
| 29 | https://docs.claude.com/en/docs/test-and-evaluate/define-success | platform.claude.com/docs/en/test-and-evaluate/develop-tests | 5.5 |
| 30 | https://www.anthropic.com/engineering/building-effective-agents | (直接) | 1.1, 1.4, 1.6, 5.2 |
| 31 | https://www.anthropic.com/engineering/built-multi-agent-research-system | (直接) | 1.2, 1.3, 5.3, 5.4, 5.6 |
| 32 | https://www.anthropic.com/engineering/claude-code-best-practices | code.claude.com/docs/en/best-practices | 3.5, 2.5, 4.6 |
| 33 | https://www.anthropic.com/engineering/writing-tools-for-agents | (直接) | 2.1, 2.2, 2.3 |
| 34 | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents | (直接) | 5.1, 5.4 |
| 35 | https://docs.claude.com/en/docs/build-with-claude/handling-stop-reasons | platform.claude.com/docs/en/build-with-claude/handling-stop-reasons | 1.1(stop_reason 一覧) |
| 36 | https://docs.claude.com/en/docs/agents-and-tools/tool-use/handle-tool-calls | platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls | 2.2(tool_result / is_error) |
| 37 | https://docs.claude.com/en/docs/agents-and-tools/tool-use/strict-tool-use | platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use | 2.1, 4.3(strict: true) |
| 38 | https://docs.claude.com/en/docs/build-with-claude/structured-outputs | platform.claude.com/docs/en/build-with-claude/structured-outputs | 4.3(スキーマ準拠出力) |
| 39 | https://docs.claude.com/en/docs/claude-code/costs | code.claude.com/docs/en/costs | 5.4(/compact・subagent 委任、2026-08-27 確認) |

# CP2 refs 対応表(topic → 台帳 URL・根拠引用)

`07` Step 2 の生成前に作る作業表(CP2 プラン)。各 topic に台帳(`SOURCES.md` §12)の URL を割り当て、本文の該当箇所を引用で記録する。**strength**: direct = topic の中核主張を本文が明示 / partial = 一部の観点のみ(カードはその観点に絞る)。引用は 2026-09-30 に取得した本文の原文(` / ` は同一ページ内の複数箇所の連結)。全 352 引用を curl で取得した生の本文(platform / code の docs は `.md` 版、その他は HTML のタグ除去)と機械照合済み(空白・引用符・マークアップの差は無視、各断片の 8 割以上の連続語が一致)。カードの refs はこの表のその topic の URL だけを使う。

**根拠不足**: なし。当初根拠不足だった p-d2-t5-02 / p-d3-t7-03 / p-d6-t2-01 はオーナー決定(2026-09-30、B-CP2-1)で syllabus 改訂または論点の絞り込みを行った(各見出しの注記)。

## partial のみの topic の判定(21 件)

| topic | 判定(カードで扱う論点) |
|---|---|
| p-d1-t1-01 | 絞れば可(ルールを条件で定義する分類への LLM 適性・最も単純な解から始める) |
| p-d1-t2-01 | 絞れば可(分類による振り分け・retrieval 結果の差し込み・テンプレートへの入力差し込み) |
| p-d1-t5-03 | 絞れば可(タスク記述が粗いと重複・欠落が出る・文脈を分離できるときだけ分割する) |
| p-d1-t6-01 | 絞れば可(生産性・時間短縮・品質の具体指標で事業上の根拠にする)。blog のみ |
| p-d1-t6-02 | 絞れば可(トークン量ではなく成果あたりコスト・出力の仕上げ工数)。blog / research のみ |
| p-d1-t6-03 | 絞れば可(即時応答が不要なら batch・レイテンシはモデル選択が最も直接的) |
| p-d2-t3-03 | 絞れば可(effort の効果はタスク種別で異なり評価で確かめる) |
| p-d3-t2-01 | 絞れば可(Files はエンドユーザー単位でなく workspace 単位 → ユーザー単位の制御はアプリ側) |
| p-d3-t5-02 | 絞れば可(document / query の input_type・embedding モデルの選択基準) |
| p-d3-t7-03 | 絞れば可(API / MCP / 自律エージェントへの委任の選択・接続先の信頼境界)。A2A プロトコル仕様は扱わない |
| p-d4-t1-03 | 絞れば可(個人情報の扱い・有害出力率・攻撃成功率の指標) |
| p-d4-t4-03 | 絞れば可(モデル変更時にプロンプトを再監査・評価で再確認) |
| p-d5-t3-02 | 絞れば可(LLM-as-judge を人手と較正・リスク別の抽出レビュー・エスカレーション率)。自己申告確信度の論点は根拠なしのため扱わない |
| p-d5-t4-01 | 絞れば可(データ保持の最小化・processor の区別・data residency)。GDPR の条文要件は扱わない |
| p-d6-t1-01 | 絞れば可(現行挙動の棚卸しを最初に行う・所有チームの合意形成)。blog のみ |
| p-d6-t1-03 | 絞れば可(テスト・テレメトリの欠落を着手前に洗い出す・広く展開する前の基盤投資)。blog のみ |
| p-d6-t2-01 | 絞れば可(リスクを読み取れる形・範囲の限定・判断ごとの責任者で示す)。経営層 / 技術者の対比は扱わない。blog のみ |
| p-d6-t2-02 | 絞れば可(性能とコストのトレードオフを評価で示す・パイロットで再試行率を分析) |
| p-d6-t3-03 | 絞れば可(ユーザーフィードバックと transcript レビューの継続・利用者からの継続的なシグナル) |
| p-d6-t4-01 | 絞れば可(CLAUDE.md にアーキテクチャ判断を記録・各段階の成果物を版管理) |
| p-d6-t5-02 | 絞れば可(DRI による所有・判断ごとの責任者を定める移行計画)。blog のみ |

「blog のみ」= refs が claude.com/blog / anthropic.com/research だけの topic。オーナー決定(2026-09-30、B-CP2-1)で claude.com/blog と anthropic.com/research を「Anthropic 公式ブログ」に含める(該当 9 件: p-d1-t6-01, p-d1-t6-02, p-d5-t5-01, p-d5-t5-03, p-d6-t1-01, p-d6-t1-03, p-d6-t2-01, p-d6-t5-01, p-d6-t5-02)。

## p-d1-t1-01 Framing business problems as LLM-suitable tasks

- [partial] https://docs.claude.com/en/docs/about-claude/use-case-guides/ticket-routing — Define whether to use Claude for ticket routing: "Claude excels at understanding and applying underlying rules when classes are defined by conditions rather than examples. / Claude's advanced language understanding allows for accurate classification based on content and context, rather than relying on strict ontological structures."
- [partial] https://www.anthropic.com/engineering/building-effective-agents — When (and when not) to use agents: "we recommend finding the simplest solution possible, and only increasing complexity when needed."

## p-d1-t1-02 Deriving success criteria and constraints from business requirements

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Defining Success Criteria / Common Success Criteria: "Use quantitative metrics or well-defined qualitative scales. Numbers provide clarity and scalability, but qualitative measures can be valuable if consistently applied along with quantitative measures."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Common Success Criteria (Latency / Price): "What is your budget for running the model? Consider factors like the cost for each API call, the size of the model, and the frequency of usage."

## p-d1-t1-03 Starting with the simplest viable solution

- [direct] https://www.anthropic.com/engineering/building-effective-agents — When (and when not) to use agents: "we recommend finding the simplest solution possible, and only increasing complexity when needed."
- [direct] https://www.anthropic.com/engineering/building-effective-agents — Summary: "Success in the LLM space isn't about building the most sophisticated system. It's about building the right system for your needs."

## p-d1-t2-01 Input handling and context assembly

- [partial] https://www.anthropic.com/engineering/building-effective-agents — Workflow: Routing: "Routing easy/common questions to smaller, cost-efficient models like Claude Haiku 4.5 and hard/unusual questions to more capable models like Claude Sonnet 4.5 to optimize for best performance."
- [partial] https://www.anthropic.com/news/contextual-retrieval — RAG: "The most relevant chunks are added to the prompt sent to the generative model"
- [partial] https://docs.claude.com/en/docs/about-claude/use-case-guides/ticket-routing — Define user intent categories / Build a strong prompt: "The prompt template is a Python f-string, allowing the `ticket_contents` to be inserted into the `<request>` tags."

## p-d1-t2-02 Output validation and downstream integration

- [direct] https://docs.claude.com/en/docs/build-with-claude/structured-outputs — Important limitations / validation: "If the response is cut off due to reaching the `max_tokens` limit: / The output may not match your schema because the refusal message takes precedence over schema constraints"
- [partial] https://www.anthropic.com/engineering/building-effective-agents — Agents: "can pause for human feedback at checkpoints or when encountering blockers."

## p-d1-t2-03 Closing the loop with feedback

- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Start from failures / production monitoring: "If you're already in production, look at your bug tracker and support queue. / Production monitoring kicks in post-launch to detect distribution drift and unanticipated real-world failures."
- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Evals flywheel: "development accelerates as failures become test cases, test cases prevent regressions, and metrics replace guesswork."

## p-d1-t3-01 The augmented LLM as the basic building block

- [direct] https://www.anthropic.com/engineering/building-effective-agents — Building block: The augmented LLM: "an LLM enhanced with augmentations such as retrieval, tools, and memory."

## p-d1-t3-02 Workflow patterns

- [direct] https://www.anthropic.com/engineering/building-effective-agents — Workflow: Prompt chaining / Routing / Parallelization / Orchestrator-workers / Evaluator-optimizer: "Routing works well for complex tasks where there are distinct categories that are better handled separately. / Parallelization is effective when the divided subtasks can be parallelized for speed, or when multiple perspectives are needed. / Orchestrator-workers ... well-suited for complex tasks where you can't predict the subtasks needed. / Evaluator-optimizer ... particularly effective when we have clear evaluation criteria, and when iterative refinement provides measurable value."
- [direct] https://www.anthropic.com/engineering/building-effective-agents — Workflow: Prompt chaining: "You can add programmatic checks (see "gate" in the diagram below) on any intermediate steps."

## p-d1-t3-03 Choosing between workflows and autonomous agents

- [direct] https://www.anthropic.com/engineering/building-effective-agents — Workflows vs. agents: "workflows offer predictability and consistency for well-defined tasks, whereas agents are the better option when flexibility is needed. / The autonomous nature of agents means higher costs, and the potential for compounding errors. / We recommend extensive testing in sandboxed environments, along with the appropriate guardrails."
- [direct] https://www.anthropic.com/engineering/building-effective-agents — When (and when not) to use agents: "Agentic systems often trade latency and cost for better task performance."

## p-d1-t4-01 When multi-agent systems pay off

- [direct] https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them — When multi-agent pays off / when not to: "Agents that would need to frequently synchronize understanding should remain together. / Multi-agent systems typically consume 3 to 10 times more tokens than single-agent approaches for equivalent tasks"
- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Multi-agent systems / token usage: "Multi-agent systems use about 15× more tokens than chats. / Some domains that require all agents to share the same context or involve many dependencies between agents are not a good fit for multi-agent systems today."
- [direct] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Orchestrator strategy: "In the orchestrator strategy, the frontier model holds the loop. It decomposes the task, dispatches subtasks to lower-cost worker models, and merges their results."

## p-d1-t4-02 Orchestrator-subagent coordination and context isolation

- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Orchestrator-worker / prompt engineering: "Each subagent needs an objective, an output format, guidance on the tools and sources to use, and clear task boundaries. / Without detailed task descriptions, agents duplicate work, leave gaps, or fail to find necessary information."
- [direct] https://docs.claude.com/en/api/agent-sdk/subagents — What subagents inherit: "The only content you pass from parent to subagent is the Agent tool's prompt string, so include any file paths, error messages, or decisions the subagent needs directly in that prompt."
- [direct] https://docs.claude.com/en/api/agent-sdk/subagents — Benefits of using subagents: "Context isolation: each subagent runs in its own conversation ... only its final message returns to the parent."

## p-d1-t4-03 Failure handling and state in multi-agent orchestration

- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Production reliability: "Letting the agent know when a tool is failing and letting it adapt works surprisingly well. We combine the adaptability of AI agents built on Claude with deterministic safeguards like retry logic and regular checkpoints."
- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Production reliability: "We built systems that can resume from where the agent was when the errors occurred"
- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Production reliability: "One step failing can cause agents to explore entirely different trajectories, leading to unpredictable outcomes."

## p-d1-t5-01 Sequential and parallel decomposition

- [direct] https://www.anthropic.com/engineering/building-effective-agents — Prompt chaining / Parallelization: "This workflow is ideal for situations where the task can be easily and cleanly decomposed into fixed subtasks. / You can add programmatic checks (see "gate" in the diagram below) on any intermediate steps. / Parallelization is effective when the divided subtasks can be parallelized for speed, or when multiple perspectives are needed."
- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices — Chain complex prompts: "Explicit prompt chaining (breaking a task into sequential API calls) is still useful when you need to inspect intermediate outputs or enforce a specific pipeline structure."

## p-d1-t5-02 Static vs. dynamic decomposition

- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Why multi-agent systems work: "You can't hardcode a fixed path for exploring complex topics, as the process is inherently dynamic and path-dependent."
- [direct] https://www.anthropic.com/engineering/building-effective-agents — Workflow: Orchestrator-workers: "well-suited for complex tasks where you can't predict the subtasks needed."

## p-d1-t5-03 Decomposition granularity and integration

- [partial] https://www.anthropic.com/engineering/built-multi-agent-research-system — Orchestrator-worker / prompt engineering: "Each subagent needs an objective, an output format, guidance on the tools and sources to use, and clear task boundaries. / Without detailed task descriptions, agents duplicate work, leave gaps, or fail to find necessary information."
- [partial] https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them — Decomposition strategy: "Work should only be split when context can be truly isolated."

## p-d1-t6-01 Mapping solutions to value pillars

- [partial] https://www.anthropic.com/news/driving-ai-transformation-with-claude — Selecting use cases / Measuring ROI: "Tracking concrete metrics—productivity gains, time savings, quality improvements—turns impressive demos into defensible business cases."

## p-d1-t6-02 Quantifying ROI and total cost of ownership

- [partial] https://claude.com/blog/a-guide-to-cost-visibility-and-control-in-claude — Measuring value / baseline: "It's helpful to measure AI's cost-per-outcome instead of token consumption as the primary metric of value. / it's hard to set a sensible limit before you've seen a month of real usage."
- [partial] https://www.anthropic.com/research/estimating-productivity-gains — Limitations: "This approach doesn't take into account the additional work people need to do to refine Claude's outputs to a finished state"

## p-d1-t6-03 Performance SLAs as design constraints

- [partial] https://docs.claude.com/en/docs/build-with-claude/batch-processing — Message Batches API: "This approach is well-suited to tasks that do not require immediate responses, with most batches finishing in less than 1 hour while reducing costs by 50% and increasing throughput."
- [partial] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-latency — How to reduce latency / Choose the right model: "One of the most direct ways to reduce latency is to select the appropriate model for your use case."

## p-d2-t1-01 Capability, cost, and latency trade-offs across model tiers

- [direct] https://docs.claude.com/en/docs/about-claude/models/choosing-a-model — Option 1: Start efficiency-first / Decide whether to upgrade: "Begin implementation with Claude Haiku 4.5. ... Evaluate if performance meets your requirements. Upgrade only if necessary for specific capability gaps."
- [partial] https://docs.claude.com/en/docs/about-claude/models/overview — Compare models: "Comparative latency: Relative to the current lineup. Actual latency depends on prompt length, output length, and thinking effort."

## p-d2-t1-02 Routing and tiered model strategies

- [direct] https://www.anthropic.com/engineering/building-effective-agents — Workflow: Routing: "Routing easy/common questions to smaller, cost-efficient models like Claude Haiku 4.5 and hard/unusual questions to more capable models like Claude Sonnet 4.5 to optimize for best performance."
- [direct] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Orchestrator strategy: "In the orchestrator strategy, the frontier model holds the loop. It decomposes the task, dispatches subtasks to lower-cost worker models, and merges their results."
- [partial] https://docs.claude.com/en/docs/about-claude/use-case-guides/ticket-routing — Choose the right Claude model: "The choice of model depends on the trade-offs between cost, accuracy, and response time."

## p-d2-t1-03 Feature requirements and model migration

- [direct] https://docs.claude.com/en/docs/about-claude/models/choosing-a-model — Establish key criteria: "Capabilities: What specific features or capabilities will you need the model to have to meet your needs?"
- [direct] https://docs.claude.com/en/docs/about-claude/models/choosing-a-model — Decide whether to upgrade or change models: "Create benchmark tests specific to your use case - having a good evaluation set is the most important step in the process. / Test with your actual prompts and data."

## p-d2-t2-01 System prompt design with roles and explicit criteria

- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/system-prompts — Give Claude a role: "Setting a role in the system prompt focuses Claude's behavior and tone for your use case."
- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct — Be clear and direct / Add context: "If you want "above and beyond" behavior, explicitly request it rather than relying on the model to infer this from vague prompts. / Providing context or motivation behind your instructions, such as explaining to Claude why such behavior is important, can help Claude better understand your goals and deliver more targeted responses."
- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags — Structure prompts with XML tags: "XML tags help Claude parse complex prompts unambiguously, especially when your prompt mixes instructions, context, examples, and variable inputs."

## p-d2-t2-02 Prompt templates separating static instructions from dynamic input

- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags — Structure prompts with XML tags: "Wrapping each type of content in its own tag (for example, `<instructions>`, `<context>`, `<input>`) reduces misinterpretation."
- [partial] https://docs.claude.com/en/docs/about-claude/use-case-guides/ticket-routing — Build a strong prompt: "The prompt template is a Python f-string, allowing the `ticket_contents` to be inserted into the `<request>` tags."

## p-d2-t2-03 Prompt-level guardrails

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations — Basic hallucination minimization strategies: "Allow Claude to say "I don't know": Explicitly give Claude permission to admit uncertainty. This simple technique can drastically reduce false information. / External knowledge restriction: Explicitly instruct Claude to only use information from provided documents and not its general knowledge."

## p-d2-t3-01 Zero-shot vs. few-shot prompting

- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/multishot-prompting — Use examples effectively: "Diverse: Cover edge cases and vary enough that Claude doesn't pick up unintended patterns. / Include 3–5 examples for best results."

## p-d2-t3-02 Chain-of-thought and extended thinking

- [direct] https://docs.claude.com/en/docs/build-with-claude/thinking — Intro: "That up-front thinking arrives in `thinking` content blocks ahead of the response, and Claude draws on it to produce the final answer. / Thinking has a cost: the tokens Claude spends reasoning are billed as output tokens, even when the thinking text isn't returned to you, and they count toward `max_tokens` alongside the response text."
- [direct] https://docs.claude.com/en/docs/build-with-claude/extended-thinking — Budget rules and tuning: "Higher budgets enable more comprehensive reasoning, with diminishing returns that depend on the task, and at the cost of increased latency."

## p-d2-t3-03 Matching techniques to task types

- [partial] https://docs.claude.com/en/docs/build-with-claude/effort — Best practices: "Test your use case: The impact of effort levels varies by task type. Evaluate performance on your specific use cases before deploying."
- [partial] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Eval Design Principles: "Design evals that mirror your real-world task distribution. Don't forget to factor in edge cases!"

## p-d2-t4-01 Context selection and placement

- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/long-context-tips — Long context prompting: "Put longform data at the top: Place your long documents and inputs near the top of your prompt, above your query, instructions, and examples. / Queries at the end can improve response quality by up to 30 percent in tests, especially with complex, multidocument inputs."
- [direct] https://docs.claude.com/en/docs/build-with-claude/context-windows — How the context window works: "more context isn't automatically better. As token count grows, accuracy and recall degrade, a phenomenon known as context rot."
- [partial] https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents — Compaction / tool result clearing: "One of the safest lightest touch forms of compaction is tool result clearing"

## p-d2-t4-02 Long-running context: compaction and external memory

- [direct] https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents — Compaction / Structured note-taking: "Compaction is the practice of taking a conversation nearing the context window limit, summarizing its contents, and reinitiating a new context window with the summary. / Structured note-taking, or agentic memory, is a technique where the agent regularly writes notes persisted to memory outside of the context window."
- [direct] https://docs.claude.com/en/docs/build-with-claude/compaction — Overview: "Compaction replaces the older turns of a conversation with a summary that Claude writes on the server"
- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices — State management best practices: "Use structured formats for state data: When tracking structured information (like test results or task status), use JSON or other structured formats to help Claude understand schema requirements."

## p-d2-t4-03 Managing token usage within the context budget

- [direct] https://docs.claude.com/en/docs/build-with-claude/context-windows — How the context window works: "Everything in the request counts toward the context window: the system prompt, every message in `messages` (including tool results, images, and documents), and your tool definitions. / To estimate a request before you send it, use the token counting API."
- [partial] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-latency — Optimize prompt and output length: "Set appropriate output limits: Use the `max_tokens` parameter to set a hard limit on the maximum length of the generated response."

## p-d2-t5-01 Prompt caching for repeated prefixes

- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-caching — Prefix matching / Static content at beginning: "Place static content (tool definitions, system instructions, context, examples) at the beginning of your prompt. / changing any block at or before the breakpoint produces a different hash on the next request. / This significantly reduces processing time and costs for repetitive tasks or prompts with consistent elements."

## p-d2-t5-02 Reusable prompt components and choosing a reuse mechanism  【オーナー決定で範囲調整】

> オーナー決定(2026-09-30): 旧「Modular and versioned prompts」は許可ソースで版管理を裏付けられないため、syllabus を「再利用可能なプロンプト部品と再利用の仕組みの使い分け」に改訂した。バージョン管理は主題にしない

- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags — Structure prompts with XML tags: "Wrapping each type of content in its own tag (for example, `<instructions>`, `<context>`, `<input>`) reduces misinterpretation. / Use consistent, descriptive tag names across your prompts."
- [partial] https://docs.claude.com/en/docs/build-with-claude/prompt-caching — (p-d2-t5-01 と共有): "Place static content (tool definitions, system instructions, context, examples) at the beginning of your prompt. / changing any block at or before the breakpoint produces a different hash on the next request. / This significantly reduces processing time and costs for repetitive tasks or prompts with consistent elements."
- [partial] https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview — (p-d2-t5-03 と共有): "Every Skill requires a `SKILL.md` file with YAML frontmatter / Claude loads information in stages as needed, rather than consuming context upfront. / Custom Skills are shared workspace-wide: all workspace members can access them."

## p-d2-t5-03 Agent Skills as reusable packaged expertise

- [direct] https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview — How Skills work / Skill structure: "Every Skill requires a `SKILL.md` file with YAML frontmatter / Claude loads information in stages as needed, rather than consuming context upfront. / Custom Skills are shared workspace-wide: all workspace members can access them."
- [direct] https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills — Progressive disclosure: "This metadata is the first level of progressive disclosure: it provides just enough information for Claude to know when each skill should be used without loading all of it into context."

## p-d3-t1-01 Least-privilege tool sets per role

- [direct] https://docs.claude.com/en/api/agent-sdk/subagents — Why use subagents? / Tool restrictions: "Tool restrictions: subagents can be limited to specific tools, reducing the risk of unintended actions. A doc-reviewer subagent might only have access to Read and Grep tools, ensuring it can analyze but never accidentally modify your documentation files."
- [direct] https://docs.claude.com/en/docs/claude-code/sub-agents — Best practices: "Limit tool access: grant only necessary permissions for security and focus"
- [direct] https://docs.claude.com/en/docs/claude-code/sub-agents — Why subagents help: "Enforce constraints by limiting which tools a subagent can use"

## p-d3-t1-02 Tool overload and selection accuracy

- [direct] https://docs.claude.com/en/docs/agents-and-tools/tool-use/tool-search-tool — Overview: "Tool selection accuracy: Claude's ability to pick the right tool degrades once you exceed 30–50 available tools."
- [direct] https://www.anthropic.com/engineering/writing-tools-for-agents — Choosing the right tools for agents: "Too many tools or overlapping tools can also distract agents from pursuing efficient strategies."
- [direct] https://www.anthropic.com/engineering/writing-tools-for-agents — Namespacing your tools: "When tools overlap in function or have a vague purpose, agents can get confused about which ones to use."
- [direct] https://www.anthropic.com/engineering/advanced-tool-use — Tool Search Tool: The challenge: "The most common failures are wrong tool selection and incorrect parameters, especially when tools have similar names like notification-send-user vs. notification-send-channel."
- [direct] https://www.anthropic.com/engineering/writing-tools-for-agents — Choosing the right tools for agents: "Tools can consolidate functionality, handling potentially multiple discrete operations (or API calls) under the hood."

## p-d3-t1-03 Auditing agent and MCP configurations

- [direct] https://docs.claude.com/en/docs/claude-code/costs — Reduce MCP server overhead: "Disable unused servers: Run /mcp to see configured servers and disable any you're not actively using."
- [partial] https://docs.claude.com/en/docs/claude-code/security — MCP security: "The list of allowed MCP servers is configured in your source code, as part of Claude Code settings engineers check into source control."
- [partial] https://docs.claude.com/en/docs/claude-code/security — MCP security: "Anthropic reviews connectors against its listing criteria before adding them to the Anthropic Directory, but does not security-audit or manage any MCP server."

## p-d3-t2-01 Identity propagation and delegated authorization

- [partial] https://docs.claude.com/en/docs/claude-code/monitoring-usage — Identity attribution: "Claude Code doesn't act under a separate service account there; the identity recorded on each event is the developer's own Claude account"
- [partial] https://docs.claude.com/en/docs/build-with-claude/files — Files API warning: "Uploaded files are accessible to your entire workspace, not scoped to an end user, conversation, or session."

## p-d3-t2-02 Credential handling and scoped access

- [direct] https://docs.claude.com/en/docs/agents-and-tools/mcp-connector — Authentication: "API consumers are expected to handle the OAuth flow and obtain the access token prior to making the API call, and to refresh the token as needed."
- [partial] https://docs.claude.com/en/docs/claude-code/mcp — Environment variable expansion in .mcp.json: "Claude Code supports environment variable expansion in .mcp.json files, allowing teams to share configurations while maintaining flexibility for machine-specific paths and sensitive values like API keys."
- [partial] https://docs.claude.com/en/docs/agents-and-tools/remote-mcp-servers — Connecting to remote MCP servers: "Ensure you have the necessary authentication credentials."

## p-d3-t2-03 Untrusted content as an authorization gap

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks — Indirect prompt injection: "An attacker who can influence that content may embed instructions that try to redirect Claude."
- [direct] https://www.anthropic.com/research/prompt-injection-defenses — What is prompt injection?: "These instructions direct the agent to forward emails containing the word "confidential" to an external address before drafting the replies you requested."
- [direct] https://www.anthropic.com/research/prompt-injection-defenses — Why browser use creates unique prompt injection risks: "Second, browser agents can take a lot of different actions / that attackers can exploit if they gain influence over the agent's behavior."
- [partial] https://www.anthropic.com/engineering/claude-code-sandboxing — Introduction: "Filesystem isolation, which ensures that Claude can only access or modify specific directories. This is particularly important in preventing a prompt-injected Claude from modifying sensitive system files."

## p-d3-t3-01 Latency levers and their accuracy cost

- [direct] https://docs.claude.com/en/docs/about-claude/models/choosing-a-model — Establish key criteria: "Effort: Several Claude models support an effort parameter that trades intelligence for latency and cost within a single model. Tuning effort is often a better lever than switching models."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-latency — How to reduce latency: "Minimize the number of tokens in both your input prompt and the expected output, while still maintaining high performance."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-latency — Overview note: "It's always better to first engineer a prompt that works well without model or prompt constraints, and then try latency reduction strategies afterward."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-latency — Stream responses: "Streaming is a feature that allows the model to start sending back its response before the full output is complete. This can significantly improve the perceived responsiveness of your application"
- [partial] https://docs.claude.com/en/docs/build-with-claude/extended-thinking — Overview: "Manual mode remains useful when your workload requires predictable latency or precise control over thinking costs."
- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Parallel tool calling: "These changes cut research time by up to 90% for complex queries"

## p-d3-t3-02 Synchronous vs. asynchronous processing

- [direct] https://docs.claude.com/en/docs/build-with-claude/batch-processing — Overview: "This approach is well-suited to tasks that do not require immediate responses, with most batches finishing in less than 1 hour while reducing costs by 50% and increasing throughput."
- [direct] https://docs.claude.com/en/docs/build-with-claude/batch-processing — How the Message Batches API works: "Batches expire if processing does not complete within 24 hours."
- [direct] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Batch work that can wait: "Route every request no one is waiting on through a batch, and keep the interactive path for the rest."
- [direct] https://www.anthropic.com/news/message-batches-api — Introduction: "This makes processing non-time-sensitive tasks more efficient and cost-effective."

## p-d3-t3-03 Justifying configuration decisions with measurements

- [direct] https://docs.claude.com/en/docs/about-claude/models/choosing-a-model — Decide whether to upgrade or change models: "Create benchmark tests specific to your use case - having a good evaluation set is the most important step in the process."
- [direct] https://docs.claude.com/en/docs/about-claude/models/choosing-a-model — Decide whether to upgrade or change models: "Weigh performance and cost tradeoffs."
- [direct] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Measure on your own workload: "Baseline the model tiers across effort levels, not only the default, and plot score against spend."
- [partial] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Define your success criteria: "95% response time < 200ms"

## p-d3-t4-01 Observability challenges of LLM systems

- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Production reliability and engineering challenges: "Agents make dynamic decisions and are non-deterministic between runs, even with identical prompts. This makes debugging harder."
- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Production reliability and engineering challenges: "Adding full production tracing let us diagnose why agents failed and fix issues systematically."
- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Production reliability and engineering challenges: "we monitor agent decision patterns and interaction structures—all without monitoring the contents of individual conversations, to maintain user privacy."
- [partial] https://docs.claude.com/en/docs/claude-code/monitoring-usage — Privacy (OTEL settings): "Spans redact user prompt text, tool input details, and tool content by default."

## p-d3-t4-02 Selecting monitoring strategies at scale

- [partial] https://www.anthropic.com/engineering/built-multi-agent-research-system — Production reliability and engineering challenges: "Adding full production tracing let us diagnose why agents failed and fix issues systematically."
- [partial] https://www.anthropic.com/engineering/built-multi-agent-research-system — Evaluation: LLM-as-judge: "LLM-as-judge evaluation scales when done well."
- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Understanding agent performance holistically: "A complete picture includes production monitoring, user feedback, A/B testing, manual transcript review, and systematic human evaluation."
- [partial] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Capability vs. regression evals: "After an agent is launched and optimized, capability evals with high pass rates can "graduate" to become a regression suite that is run continuously to catch any drift."
- [partial] https://docs.claude.com/en/docs/claude-code/monitoring-usage — Backend considerations: "Full-featured observability platforms: Advanced querying, visualization, alerting"

## p-d3-t5-01 Chunking strategies

- [direct] https://www.anthropic.com/news/contextual-retrieval — Implementation considerations: "Chunk boundaries: Consider how you split your documents into chunks. The choice of chunk size, chunk boundary, and chunk overlap can affect retrieval performance"
- [direct] https://www.anthropic.com/news/contextual-retrieval — The context conundrum in traditional RAG: "Contextual Retrieval solves this problem by prepending chunk-specific explanatory context to each chunk before embedding"
- [partial] https://anthropic.skilljar.com/claude-with-the-anthropic-api — What You'll Learn: "Build retrieval-augmented generation (RAG) systems with text chunking, embeddings, BM25 search, and contextual retrieval"

## p-d3-t5-02 Indexing, embeddings, and index freshness

- [partial] https://www.anthropic.com/news/contextual-retrieval — Implementation considerations: "Embedding model: Whereas Contextual Retrieval improves performance across all embedding models we tested, some models may benefit more than others. We found Gemini and Voyage embeddings to be particularly effective."
- [partial] https://docs.claude.com/en/docs/build-with-claude/embeddings — Before implementing embeddings: "Dataset size & domain specificity: size of the model training dataset and its relevance to the domain you want to embed."
- [partial] https://docs.claude.com/en/docs/build-with-claude/embeddings — Voyage embeddings example: "Note that input_type="document" and input_type="query" are used for embedding the document and query, respectively."
- [partial] https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents — Just-in-time context: "effectively bypassing the issues of stale indexing and complex syntax trees"

## p-d3-t5-03 RAG vs. placing knowledge in context

- [direct] https://www.anthropic.com/news/contextual-retrieval — A note on simply using a longer prompt: "If your knowledge base is smaller than 200,000 tokens (about 500 pages of material), you can just include the entire knowledge base in the prompt that you give the model, with no need for RAG or similar methods."
- [direct] https://www.anthropic.com/news/contextual-retrieval — A note on simply using a longer prompt: "Developers can now cache frequently used prompts between API calls, reducing latency by > 2x and costs by up to 90%"
- [direct] https://www.anthropic.com/news/contextual-retrieval — A primer on RAG: "For larger knowledge bases that don't fit within the context window, RAG is the typical solution."

## p-d3-t6-01 Semantic, lexical, and hybrid retrieval

- [direct] https://www.anthropic.com/news/contextual-retrieval — A primer on RAG: "While embedding models excel at capturing semantic relationships, they can miss crucial exact matches."
- [direct] https://www.anthropic.com/news/contextual-retrieval — A primer on RAG: "It's particularly effective for queries that include unique identifiers or technical terms."
- [direct] https://www.anthropic.com/news/contextual-retrieval — A primer on RAG: "An embedding model might find content about error codes in general, but could miss the exact "TS-999" match."
- [direct] https://www.anthropic.com/news/contextual-retrieval — Conclusion: "Embeddings+BM25 is better than embeddings on their own"

## p-d3-t6-02 Reranking and query transformation

- [direct] https://www.anthropic.com/news/contextual-retrieval — Further boosting performance with Reranking: "Reranking provides better responses and reduces cost and latency because the model is processing less information."
- [direct] https://www.anthropic.com/news/contextual-retrieval — Further boosting performance with Reranking: "Perform initial retrieval to get the top potentially relevant chunks (we used the top 150)"
- [direct] https://www.anthropic.com/news/contextual-retrieval — Cost and latency considerations: "There is an inherent trade-off between reranking more chunks for better performance vs. reranking fewer for lower latency and cost."
- [direct] https://www.anthropic.com/news/contextual-retrieval — Conclusion: "Passing the top-20 chunks to the model is more effective than just the top-10 or top-5"
- [partial] https://www.anthropic.com/engineering/built-multi-agent-research-system — Research system architecture: "the lead agent decomposes queries into subtasks and describes them to subagents."

## p-d3-t6-03 Structured data and agentic retrieval

- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Overview: "Traditional approaches using Retrieval Augmented Generation (RAG) use static retrieval."
- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Overview: "the subagents act as intelligent filters by iteratively using search tools to gather information"
- [partial] https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents — Just-in-time context: "The model can write targeted queries, store results, and leverage Bash commands like head and tail to analyze large volumes of data without ever loading the full data objects into context."

## p-d3-t7-01 MCP for reusable tool and data integration

- [direct] https://docs.claude.com/en/docs/agents-and-tools/mcp — Introduction: "MCP (Model Context Protocol) is an open-source standard for connecting AI applications to external systems."
- [direct] https://docs.claude.com/en/docs/agents-and-tools/mcp — Introduction: "MCP provides a standardized way to connect AI applications to external systems."
- [direct] https://www.anthropic.com/news/model-context-protocol — Introducing MCP: "It provides a universal, open standard for connecting AI systems with data sources, replacing fragmented integrations with a single protocol."
- [direct] https://anthropic.skilljar.com/introduction-to-model-context-protocol — About this course: "Understand when to use each MCP primitive: tools (model-controlled), resources (app-controlled), and prompts (user-controlled)"
- [partial] https://docs.claude.com/en/docs/claude-code/mcp — Installing MCP servers: "Stdio servers run as local processes on your machine."
- [partial] https://docs.claude.com/en/docs/claude-code/mcp — Installing MCP servers: "HTTP servers are the recommended option for connecting to remote MCP servers."

## p-d3-t7-02 Direct API and CLI integration

- [direct] https://www.anthropic.com/engineering/building-effective-agents — Frameworks: "We suggest that developers start by using LLM APIs directly: many patterns can be implemented in a few lines of code."
- [direct] https://www.anthropic.com/engineering/building-effective-agents — When (and when not) to use agents: "we recommend finding the simplest solution possible, and only increasing complexity when needed."
- [direct] https://docs.claude.com/en/docs/claude-code/costs — Reduce MCP server overhead: "Prefer CLI tools when available: Tools like gh, aws, gcloud, and sentry-cli are still more context-efficient than MCP servers because they don't add any per-tool listing. Claude can run CLI commands directly."
- [partial] https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview — How tool use works: "Client tools (including user-defined tools and tools with Anthropic-defined schemas, such as bash and text_editor) run in your application."

## p-d3-t7-03 Agent-to-agent communication  【オーナー決定で範囲調整】

> オーナー決定(2026-09-30): カードは「直接の API / tool use・MCP・自律エージェントへの委任のどれを選ぶか」と「接続先との信頼境界」に絞る。A2A プロトコルの仕様は扱わない(許可ソースに A2A を直接扱う本文が無いため。anthropic.com/news/agent2agent は 404)

- [partial] https://www.anthropic.com/engineering/building-effective-agents — What are agents? / When to use agents: "Agents, on the other hand, are systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks. / Agents can be used for open-ended problems where it's difficult or impossible to predict the required number of steps, and where you can't hardcode a fixed path."
- [partial] https://www.anthropic.com/engineering/building-effective-agents — Building block: The augmented LLM: "one approach is through our recently released Model Context Protocol, which allows developers to integrate with a growing ecosystem of third-party tools with a simple client implementation."
- [partial] https://docs.claude.com/en/api/agent-sdk/secure-deployment — Security boundaries / (冒頭): "A security boundary separates components with different trust levels. / their behavior can be influenced by the content they process: files, webpages, or user input."
- [partial] https://www.anthropic.com/engineering/built-multi-agent-research-system — Teach the orchestrator how to delegate: "Each subagent needs an objective, an output format, guidance on the tools and sources to use, and clear task boundaries."

## p-d3-t8-01 Monolithic context and its limits

- [direct] https://docs.claude.com/en/docs/agents-and-tools/tool-use/tool-search-tool — Overview: "Loading every tool definition up front causes two problems as a tool library grows"
- [direct] https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents — Context engineering vs prompt engineering: "as the number of tokens in the context window increases, the model's ability to accurately recall information from that context decreases."
- [direct] https://docs.claude.com/en/docs/build-with-claude/context-windows — Context windows: "more context isn't automatically better. As token count grows, accuracy and recall degrade, a phenomenon known as context rot."
- [direct] https://www.anthropic.com/engineering/code-execution-with-mcp — Excessive token consumption from tools: "Most MCP clients load all tool definitions upfront directly into context"
- [direct] https://www.anthropic.com/engineering/advanced-tool-use — Tool Search Tool: The challenge: "At Anthropic, we've seen tool definitions consume 134K tokens before optimization."

## p-d3-t8-02 Progressive discovery mechanisms

- [direct] https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview — How Skills work: "This filesystem-based architecture enables progressive disclosure: Claude loads information in stages as needed, rather than consuming context upfront."
- [direct] https://docs.claude.com/en/docs/agents-and-tools/tool-use/tool-search-tool — Overview: "Instead of loading all tool definitions into the context window up front, Claude searches your tool catalog"
- [direct] https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents — Just-in-time context: "Letting agents navigate and retrieve data autonomously also enables progressive disclosure—in other words, allows agents to incrementally discover relevant context through exploration."
- [direct] https://docs.claude.com/en/docs/claude-code/sub-agents — Overview: "Preserve context by keeping exploration and implementation out of your main conversation"
- [direct] https://docs.claude.com/en/api/agent-sdk/subagents — Why use subagents?: "The parent receives a concise summary, not every file the subagent read."
- [partial] https://anthropic.skilljar.com/introduction-to-agent-skills — About this course: "organizing your skill directory with progressive disclosure to keep context windows efficient"

## p-d3-t8-03 Choosing a context strategy

- [direct] https://docs.claude.com/en/docs/agents-and-tools/tool-use/tool-search-tool — When to use tool search: "Use tool search when any of the following apply: You have 10 or more tools available. Your tool definitions consume more than 10k tokens."
- [direct] https://docs.claude.com/en/docs/agents-and-tools/tool-use/tool-search-tool — When to use tool search: "Standard tool calling, without tool search, is a better fit when you have fewer than 10 tools, every tool is used in every request"
- [direct] https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents — Just-in-time context: "the most effective agents might employ a hybrid strategy, retrieving some data up front for speed, and pursuing further autonomous exploration at its discretion."
- [partial] https://www.anthropic.com/news/contextual-retrieval — A note on simply using a longer prompt: "Sometimes the simplest solution is the best."

## p-d4-t1-01 Task quality metrics

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Define your success criteria / Common success criteria: "Task-specific: F1 score, BLEU score, perplexity"
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Define your success criteria: "Most use cases need multidimensional evaluation along several success criteria."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Common success criteria: "Strong citation accuracy might be critical for medical apps but less so for casual chatbots."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Grade your evaluations: "Exact match: output == golden_answer"

## p-d4-t1-02 Operational metrics: latency, cost, and throughput

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Common success criteria (Latency): "What is the acceptable response time for the model? This depends on your application's real-time requirements and user expectations."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-latency — How to measure latency: "Time to first token (TTFT): This metric measures the time it takes for the model to generate the first token of the response, from when the prompt was sent."
- [partial] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Example: coding agent eval (tracked_metrics): "time_to_first_token - output_tokens_per_sec - time_to_last_token"
- [direct] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Compare models on cost per task: "You pay for completed tasks, though, so compare models on cost per completed task."
- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Why build evals?: "latency, token usage, cost per task, and error rates can be tracked on a static bank of tasks"

## p-d4-t1-03 Safety and security metrics

- [partial] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Common success criteria: "What is a successful metric for how the model handles personal or sensitive information? Can it follow instructions not to use or share certain details?"
- [partial] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Define your success criteria: "99.5% of outputs are non-toxic"
- [partial] https://www.anthropic.com/research/prompt-injection-defenses — Mitigating prompt injections in browser use: "A 1% attack success rate—while a significant improvement—still represents meaningful risk."
- [partial] https://www.anthropic.com/research/prompt-injection-defenses — Claude's progress on browser use robustness: "ASR is computed as a percentage of attacks encountered by each model."
- [partial] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Evaluating conversational agents (Step 3): "Test both the cases where a behavior should occur and where it shouldn't."

## p-d4-t2-01 Building representative evaluation datasets

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Eval design principles: "Be task-specific: Design evals that mirror your real-world task distribution. Don't forget to factor in edge cases!"
- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Step 0 / Step 1: "In reality, 20-50 simple tasks drawn from real failures is a great start."
- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Step 3: Build balanced problem sets: "Try to avoid class-imbalanced evals."
- [direct] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Measure on your own workload: "Pull a few tasks from production logs, weighted like real traffic, and write outcome checks for each"

## p-d4-t2-02 Mixed grading methods

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Grade your evaluations: "Code-based grading: Fastest and most reliable, extremely scalable, but also lacks nuance for more complex judgments that require less rule-based rigidity."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Grade your evaluations: "Human grading: Most flexible and high quality, but slow and expensive. Avoid if possible."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Tips for LLM-based grading: "Have detailed, clear rubrics"
- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Types of graders for agents: "Requires calibration with human graders for accuracy"
- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Step 5: Design graders thoughtfully: "We recommend choosing deterministic graders where possible, LLM graders where necessary or for additional flexibility, and using human graders judiciously for additional validation."

## p-d4-t2-03 Automated evaluation harnesses and regression testing

- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Overview: automated evals: "Can run on every commit"
- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Capability vs. regression evals: "should have a nearly 100% pass rate."
- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Why build evals?: "Absent evals, debugging is reactive: wait for complaints, reproduce manually, fix the bug, and hope nothing else regressed."
- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Why build evals?: "Once evals exist, you get baselines and regression tests for free"

## p-d4-t3-01 Designing A/B tests for LLM changes

- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Understanding agent performance holistically (A/B testing): "Comparing variants with real user traffic Measures actual user outcomes (retention, task completion) Controls for confounds Scalable and systematic Slow; days or weeks to reach significance and requires sufficient traffic"
- [partial] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Example metrics and measurement methods: "A/B testing: Compare performance against a baseline model or earlier version."
- [partial] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Understanding agent performance holistically (automated evals): "Can create false confidence if it doesn't match real usage patterns"

## p-d4-t3-02 Iterative improvement cycles

- [partial] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Overview: "test cases, preliminary prompt, iterative testing and refinement, final validation, ship"
- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview — Before prompt engineering: "Some ways to empirically test against those criteria"
- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Step 6: Check the transcripts: "When a task fails, the transcript tells you whether the agent made a genuine mistake or whether your graders rejected a valid solution."
- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Evaluation: "Start evaluating immediately with small samples."
- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Going from zero to one: "Think of this as a roadmap for eval-driven agent development: define success early, measure it clearly, and iterate continuously."

## p-d4-t4-01 Diagnosing prompt failures

- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct — Be clear and direct: "Golden rule: Show your prompt to a colleague with minimal context on the task and ask them to follow it. If they'd be confused, Claude will be too."
- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct — Use examples effectively: "Diverse: Cover edge cases and vary enough that Claude doesn't pick up unintended patterns."
- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct — Be clear and direct: "Be specific about the desired output format and constraints."
- [partial] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Audit prompts against the current model: "The usual case is over-specific instruction added to compensate for an older model"

## p-d4-t4-02 Diagnosing and mitigating hallucinations

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations — Basic hallucination minimization strategies: "Allow Claude to say "I don't know": Explicitly give Claude permission to admit uncertainty. This simple technique can drastically reduce false information."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations — Basic hallucination minimization strategies: "Use direct quotes for factual grounding: For tasks involving long documents (>20k tokens), ask Claude to extract word-for-word quotes first before performing its task."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations — Basic hallucination minimization strategies: "Verify with citations: Make Claude's response auditable by having it cite quotes and sources for each of its claims."
- [direct] https://www.anthropic.com/news/contextual-retrieval — Overview: "The problem is that traditional RAG solutions remove context when encoding information, which often results in the system failing to retrieve the relevant information from the knowledge base."

## p-d4-t4-03 Model mismatch and change-correlated regressions

- [partial] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Audit prompts against the current model: "Auditing prompts against the model you run now, and again whenever you change models, is a free win."
- [partial] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Why build evals?: "Evals also shape how quickly you can adopt new models."
- [partial] https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct — Overview: "treat it as measured on that model and re-check it against your own evals before applying it to another"
- [partial] https://www.anthropic.com/engineering/built-multi-agent-research-system — Production reliability and engineering challenges: "minor changes cascade into large behavioral changes"

## p-d4-t5-01 Token and cost reduction techniques

- [direct] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Overview: "Free wins cut spend without touching quality: prompt caching, token hygiene, a prompt audit against the model you are running, batch processing at 50% off for work that can wait up to 24 hours"
- [direct] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Overview: "prompt caching was the largest lever by a wide margin"
- [direct] https://docs.claude.com/en/docs/build-with-claude/prompt-caching — Overview: "This significantly reduces processing time and costs for repetitive tasks or prompts with consistent elements."
- [direct] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Combine models: "Multi-model architectures fit workloads whose task complexity varies enough that different steps are best served by different models."
- [partial] https://docs.claude.com/en/docs/claude-code/costs — Reduce MCP server overhead: "Disable unused servers"

## p-d4-t5-02 Latency optimization

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-latency — How to reduce latency: "Stream responses"
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-latency — Choose the right model: "One of the most direct ways to reduce latency is to select the appropriate model for your use case."
- [direct] https://docs.claude.com/en/docs/agents-and-tools/tool-use/programmatic-tool-calling — Overview: "This reduces latency for multi-tool workflows and decreases token consumption by allowing Claude to filter or process data before it reaches the model's context window."
- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Parallel tool calling: "the lead agent spins up 3-5 subagents in parallel rather than serially; (2) the subagents use 3+ tools in parallel."
- [direct] https://www.anthropic.com/news/contextual-retrieval — A note on simply using a longer prompt: "reducing latency by > 2x and costs by up to 90%"

## p-d4-t5-03 Cost-performance trade-off analysis

- [direct] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Measure on your own workload: "A multi-model configuration must beat the single model's whole curve."
- [direct] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Tune effort: "Cost scales with all that activity; accuracy scales only with the part your task needs."
- [direct] https://docs.claude.com/en/docs/about-claude/models/optimizing-for-cost-and-intelligence — Overview: "some levers trade against quality and some don't"
- [direct] https://docs.claude.com/en/docs/about-claude/models/choosing-a-model — Option 2: Start capability-first: "Consider increasing efficiency by lowering effort or downgrading models over time with greater workflow optimization."
- [direct] https://docs.claude.com/en/docs/about-claude/models/choosing-a-model — Option 1: Start efficiency-first: "Upgrade only if necessary for specific capability gaps."

## p-d4-t6-01 Logging for LLM applications

- [direct] https://docs.claude.com/en/docs/claude-code/monitoring-usage — OpenTelemetry configuration: "Enable logging of user prompt content (default: disabled)"
- [direct] https://docs.claude.com/en/docs/claude-code/monitoring-usage — OpenTelemetry configuration: "Spans redact user prompt text, tool input details, and tool content by default."
- [partial] https://docs.claude.com/en/docs/claude-code/monitoring-usage — OpenTelemetry configuration: "Bodies include the entire conversation history."
- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Production reliability and engineering challenges: "Adding full production tracing let us diagnose why agents failed and fix issues systematically."
- [partial] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Types of graders / transcripts: "A transcript (also called a trace or trajectory) is the complete record of a trial, including outputs, tool calls, reasoning, intermediate results, and any other interactions."

## p-d4-t6-02 Tracking production performance

- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Understanding agent performance holistically (production monitoring): "Reveals real user behavior at scale Catches issues that synthetic evals miss"
- [direct] https://docs.claude.com/en/docs/manage-claude/usage-cost-api — Overview: "This API enables you to better monitor, analyze, and optimize your Claude implementations"
- [partial] https://docs.claude.com/en/docs/claude-code/analytics — Overview: "Claude Code provides analytics dashboards to help organizations understand developer usage patterns, track contribution metrics, and measure how Claude Code impacts engineering velocity."
- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Production reliability and engineering challenges: "Adding full production tracing let us diagnose why agents failed and fix issues systematically."
- [partial] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Understanding agent performance holistically (production monitoring): "Reactive; problems reach users before you know about them Signals can be noisy"

## p-d5-t1-01 Input and output screening

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks — Jailbreaks and direct prompt injection > Harmlessness screens: "Use a lightweight model like Claude Haiku 4.5 to pre-screen user input before it reaches your main conversation."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks — Indirect prompt injection > Screen tool outputs before Claude acts on them: "Apply the same lightweight-model screening pattern you use for user input to the content your tools return."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks — Jailbreaks and direct prompt injection > Input validation: "Filter user input for known injection patterns before it reaches Claude."

## p-d5-t1-02 Deterministic controls around agent actions

- [direct] https://docs.claude.com/en/docs/claude-code/sandboxing — Intro / OS-level enforcement: "The operating system enforces the sandbox boundary on the running process, so it holds regardless of what the model chose to run and even if an allowed command does more than its name suggests."
- [direct] https://docs.claude.com/en/docs/claude-code/hooks-guide — Intro: "Hooks are user-defined shell commands. Claude Code runs them at specific points in its lifecycle, which gives you deterministic control: certain actions always happen rather than relying on the LLM to choose to run them."
- [direct] https://docs.claude.com/en/docs/claude-code/hooks — Exit code 2 behavior: "Exit code 2 means a blocking error. On events that can block, exit 2 blocks whether or not you print JSON: even a JSON `permissionDecision` of `"allow"` can't override it."
- [direct] https://docs.claude.com/en/docs/claude-code/permissions — Hooks and permission rules: "Hook decisions don't bypass permission rules. Claude Code evaluates deny and ask rules regardless of what a PreToolUse hook returns: a matching deny rule blocks the call, and a matching ask rule still prompts even when the hook returned `"allow"` or `"ask"`."
- [partial] https://claude.com/blog/ciso-guide-to-agentic-ai — Per-tool action controls: "allow drafting docs but never automatically send them, allow reads and searches but never deletes."

## p-d5-t1-03 Layered defenses against prompt injection

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks — Indirect prompt injection > Limit Claude's access to sensitive data and actions: "Apply the principle of least privilege so that a successful injection can do minimal damage: don't give Claude access to secrets it doesn't need, run tools in sandboxed environments, and scope permissions as narrowly as possible."
- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks — Indirect prompt injection > Put untrusted content only in tool results: "Deliver third-party content to Claude inside `tool_result` blocks, never in `system` prompts or plain user `text` blocks."
- [direct] https://www.anthropic.com/research/trustworthy-agents — Layered Defense Against Prompt Injection: "why no single line of defense is enough to guarantee protection. The more open an agent's environment, the more entry points exist. The more tools it can use, the more an attacker can do once they gain access. This is why we build defenses at several different layers."
- [partial] https://docs.claude.com/en/docs/claude-code/security — Additional safeguards: "Isolated context windows: Web fetch uses a separate context window to avoid injecting potentially malicious prompts"

## p-d5-t2-01 Common LLM failure modes

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations — Intro: "Even the most advanced language models, like Claude, can sometimes generate text that is factually incorrect or inconsistent with the given context. This phenomenon, known as "hallucination," can undermine the reliability of your AI-driven solutions."
- [direct] https://docs.claude.com/en/docs/build-with-claude/context-windows — How the context window works: "As token count grows, accuracy and recall degrade, a phenomenon known as *context rot*."
- [direct] https://docs.claude.com/en/api/messages — temperature parameter: "Note that even with `temperature` of `0.0`, the results will not be fully deterministic."
- [direct] https://www.anthropic.com/research/towards-understanding-sycophancy-in-language-models — Summary: "sycophancy is a general behavior of RLHF models, likely driven in part by human preference judgments favoring sycophantic responses"
- [partial] https://docs.claude.com/en/docs/about-claude/models/overview — Model comparison table: "Reliable knowledge cutoff: The date through which the model's knowledge is most extensive and reliable."

## p-d5-t2-02 Agent-specific risks

- [direct] https://www.anthropic.com/engineering/building-effective-agents — Agents: "The autonomous nature of agents means higher costs, and the potential for compounding errors. We recommend extensive testing in sandboxed environments, along with the appropriate guardrails."
- [direct] https://www.anthropic.com/engineering/built-multi-agent-research-system — Production reliability: "The compound nature of errors in agentic systems means that minor issues for traditional software can derail agents entirely. One step failing can cause agents to explore entirely different trajectories, leading to unpredictable outcomes."
- [direct] https://www.anthropic.com/research/trustworthy-agents — Intro: "Agents act with less human oversight, so there is more room for them to misread users' intent and take actions with unintended consequences."
- [partial] https://docs.claude.com/en/docs/claude-code/best-practices — Run parallel sessions (writer/reviewer): "A fresh context improves code review since Claude won't be biased toward code it just wrote."

## p-d5-t2-03 Risk assessment and mitigation planning

- [direct] https://claude.com/blog/ciso-guide-to-agentic-ai — Four Questions to Assess Agentic AI Risk: "What observability do I have? Can you tell agent actions from user actions? / The four answers to these questions give you a picture of your risk, but the principle of least agency tells you what to do with it"
- [direct] https://claude.com/blog/ciso-guide-to-agentic-ai — Intro: "A CISO's responsibility in the age of agentic AI is not to achieve zero risk. Instead, our jobs are to make agentic risk legible and bounded."
- [partial] https://www.anthropic.com/engineering/building-effective-agents — Agents: "The autonomous nature of agents means higher costs, and the potential for compounding errors."

## p-d5-t3-01 Where to place human review

- [direct] https://claude.com/blog/deploying-ai-from-pilot-to-production — Intro: "A four-tier oversight model (automated, sampled, reviewed, and advisory) that matches human review to the risk of each output, with example tasks and a review cadence for each tier"
- [direct] https://www.anthropic.com/news/our-framework-for-developing-safe-and-trustworthy-agents — Human control with agent autonomy: "humans should retain control over how their goals are pursued, particularly before high-stakes decisions are made."
- [direct] https://claude.com/blog/the-ai-native-sdlc-playbook — Comparison table (AI-native column): "Layers of agentic review with human review reserved for regulated and critical code. Governance is enforced as the AI acts, with hooks as approval gates"

## p-d5-t3-02 Calibrated routing and sampling for review

- [partial] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Grader types / model graders: "LLM-as-judge graders should be closely calibrated with human experts to gain confidence that there is little divergence between the human grading and model grading."
- [partial] https://claude.com/blog/deploying-ai-from-pilot-to-production — Intro: "A four-tier oversight model (automated, sampled, reviewed, and advisory) that matches human review to the risk of each output"
- [partial] https://docs.claude.com/en/docs/about-claude/use-case-guides/customer-support-chat — Escalation efficiency: "This measures Claude's ability to recognize when a query needs human intervention and escalate appropriately. Track the percentage of correctly escalated conversations versus those that should have been escalated but weren't."

## p-d5-t3-03 Designing reviewer workflows

- [direct] https://docs.claude.com/en/docs/build-with-claude/citations — Intro: "Citations return the exact passages that support each claim, so you can verify answers and surface sources to your users."
- [partial] https://docs.claude.com/en/docs/claude-code/code-review — Rating findings: "Click 👍 if the finding was useful or 👎 if it was wrong or noisy. Anthropic collects reaction counts after the PR merges and uses them to tune the reviewer."
- [partial] https://claude.com/blog/how-to-prepare-for-ai-driven-code-modernization-projects — Step on reviewing flagged changes: "Group and analyze the flagged changes over time. When the same kind of flag keeps recurring, fix the cause in the agentic workflow or the certificate rather than reviewing each one."
- [partial] https://claude.com/blog/the-ai-native-sdlc-playbook — Stage gates: "Human attention concentrates at the gates, reviewing what the agent flagged rather than starting each stage from scratch."

## p-d5-t4-01 Personal data protection (GDPR)

- [partial] https://docs.claude.com/en/docs/build-with-claude/api-and-data-retention — How Anthropic approaches data retention: "Only what is technically necessary for the feature to work is retained. Conversation content (your prompts and Claude's outputs) is not retained by default; the exception is Covered Models, which require 30-day retention."
- [partial] https://docs.claude.com/en/docs/build-with-claude/api-and-data-retention — Intro: "This page covers the Claude API (`api.anthropic.com`), Claude Platform on AWS, and Claude in Microsoft Foundry, where Anthropic is the data processor. On Amazon Bedrock and Google Cloud's Agent Platform, the cloud provider is the data processor"
- [partial] https://docs.claude.com/en/docs/build-with-claude/data-residency — Intro: "Data residency controls let you manage where your data is processed and stored. Two independent settings govern this: Inference geo ... Workspace geo"

## p-d5-t4-02 Health data (HIPAA)

- [direct] https://docs.claude.com/en/docs/build-with-claude/api-and-data-retention — HIPAA readiness: "The Claude API supports HIPAA-ready integrations for organizations that handle protected health information (PHI). With a signed BAA and a HIPAA-enabled organization, you can use supported API features to process PHI while supporting your organization's HIPAA compliance."
- [direct] https://docs.claude.com/en/docs/build-with-claude/api-and-data-retention — FAQ: "HIPAA readiness involves a broader set of privacy and security safeguards that protect PHI throughout its lifecycle, including encryption, access controls, and audit logging."
- [partial] https://docs.claude.com/en/docs/build-with-claude/api-and-data-retention — HIPAA error handling: "When a HIPAA-enabled organization sends a request that includes a non-eligible feature, the API returns a `400` error to prevent accidental use of features not covered by your BAA"

## p-d5-t4-03 Government deployments (FedRAMP) and deployment choices

- [direct] https://www.anthropic.com/news/claude-in-amazon-bedrock-fedramp-high — Announcement: "approved for use in FedRAMP High and DoD Impact Level 4 and 5 workloads through Amazon Bedrock in AWS GovCloud (US) regions"
- [direct] https://www.anthropic.com/news/claude-on-google-cloud-fedramp-high — Announcement: "Claude models are now authorized for FedRAMP High and IL-2 workloads through Google Cloud's Vertex AI platform."
- [partial] https://docs.claude.com/en/docs/build-with-claude/data-residency — Inference geo: "`"us"`: Inference runs only in US-based infrastructure."

## p-d5-t5-01 Bias and fairness evaluation

- [direct] https://www.anthropic.com/research/evaluating-and-mitigating-discrimination-in-language-model-decisions — Abstract: "spanning 70 diverse decision scenarios across society, and systematically vary the demographic information in each prompt."
- [direct] https://www.anthropic.com/research/evaluating-and-mitigating-discrimination-in-language-model-decisions — Abstract: "we demonstrate techniques to significantly decrease both positive and negative discrimination through careful prompt engineering"

## p-d5-t5-02 Transparency and explainability

- [direct] https://www.anthropic.com/news/our-framework-for-developing-safe-and-trustworthy-agents — Transparency in agent behavior: "Humans need visibility into agents' problem-solving processes. Without transparency, a human asking an agent to "reduce customer churn" might be baffled when the agent starts contacting the facilities team about office layouts."
- [partial] https://docs.claude.com/en/docs/build-with-claude/citations — Intro: "Citations return the exact passages that support each claim, so you can verify answers and surface sources to your users."
- [partial] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations — Basic strategies: "Verify with citations: Make Claude's response auditable by having it cite quotes and sources for each of its claims."

## p-d5-t5-03 Accountability and responsible use

- [direct] https://claude.com/blog/ciso-guide-to-agentic-ai — The Agentic Identity Spectrum: "the person at the keyboard is accountable for the outcome, the same way they are accountable for anything else done with their credentials."
- [direct] https://claude.com/blog/ciso-guide-to-agentic-ai — Risk acceptance: "Deliberately accepting risk is an act performed by humans with the authority to accept it."
- [partial] https://claude.com/blog/deploying-ai-from-pilot-to-production — Intro: "42% of organizations rely on shared IT and finance accountability, with no single owner responsible for AI costs and outcomes. Without that owner, it becomes difficult to measure success, make tradeoffs, and maintain accountability as an AI program scales."
- [partial] https://www.anthropic.com/research/evaluating-and-mitigating-discrimination-in-language-model-decisions — Abstract: "While we do not endorse or permit the use of language models to make automated decisions for the high-risk use cases we study"

## p-d6-t1-01 Structured discovery and workflow mapping

- [partial] https://claude.com/blog/how-to-prepare-for-ai-driven-code-modernization-projects — Define the target: "Understanding the current system is often a good first step for defining the target. Extracting what the old code actually does and creating an inventory of current behavior makes it easy to decide if parts should be changed or dropped, and so whether the modernization is a transform or a reimagine. This also often reveals unknown business logic and edge cases."
- [partial] https://claude.com/blog/how-to-prepare-for-ai-driven-code-modernization-projects — Step 1: "The main challenge in initiating these projects is usually building the internal consensus and commitment from the teams that own the system, and the teams that depend on it."

## p-d6-t1-02 Eliciting functional and non-functional requirements

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Common success criteria categories: "How well does the model need to perform on the task? / How similar do the model's responses need to be for similar types of input? / This list is non-exhaustive."
- [direct] https://claude.com/blog/deploying-ai-from-pilot-to-production — Intro: "A four-part definition of the job the AI will do (user, task, output, and a measurable quality threshold), and a lightweight total cost of ownership model to build before the pilot"
- [partial] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Evals for product teams: "Defining eval tasks is one of the best ways to stress-test whether the product requirements are concrete enough to start building."

## p-d6-t1-03 Assessing feasibility and data readiness

- [partial] https://claude.com/blog/how-to-prepare-for-ai-driven-code-modernization-projects — Create the certificate: "Older systems often have thin test coverage, flaky tests, and little telemetry. Part of defining the certificate is identifying these gaps."
- [partial] https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start — Organizational layer: "The rollouts that spread fastest had a dedicated infrastructure investment before broad access."

## p-d6-t2-01 Tailoring trade-off communication to audiences  【オーナー決定で範囲調整】

> オーナー決定(2026-09-30): カードは「相手の意思決定に必要な形(リスクを読み取れる形・範囲の限定・判断ごとの責任者)で判断を示す」骨格に絞る。経営層向け / 技術者向けの対比は扱わない(許可ソースに直接の記述が無いため)

- [partial] https://claude.com/blog/deploying-ai-from-pilot-to-production — Intro: "A transition blueprint laying out what to decide, when to decide it, and who needs to own each decision"
- [partial] https://claude.com/blog/ciso-guide-to-agentic-ai — Intro: "our jobs are to make agentic risk legible and bounded. This way, we can deliberately accept what we can manage, so the business moves on our terms instead of around us."

## p-d6-t2-02 Presenting options with evidence

- [partial] https://docs.claude.com/en/docs/about-claude/models/choosing-a-model — Choosing a model: "Weigh performance and cost tradeoffs. / Evaluate if performance meets your requirements."
- [partial] https://claude.com/blog/how-to-prepare-for-ai-driven-code-modernization-projects — Pilot cost measurement: "You can also escalate to a more expensive model when a less expensive one fails to meet the certificate, but analyze retry rates carefully while piloting, since several cheap attempts can cost more than one expensive one."

## p-d6-t3-01 Setting realistic expectations for LLM behavior

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations — Note: "Remember, while these techniques significantly reduce hallucinations, they don't eliminate them entirely. Always validate critical information, especially for high-stakes decisions."
- [partial] https://docs.claude.com/en/api/messages — temperature parameter: "Note that even with `temperature` of `0.0`, the results will not be fully deterministic."
- [partial] https://claude.com/blog/deploying-ai-from-pilot-to-production — Intro: "A four-tier oversight model (automated, sampled, reviewed, and advisory) that matches human review to the risk of each output"

## p-d6-t3-02 Defining and negotiating SLAs

- [direct] https://docs.claude.com/en/docs/test-and-evaluate/define-success — Measurable: "Use quantitative metrics or well-defined qualitative scales. / Operational: Response time (ms), uptime (%) / Less than 0.1% of outputs out of 10,000 trials flagged for toxicity by the content filter."
- [partial] https://docs.claude.com/en/docs/api/service-tiers — Priority Tier: "Priority Tier targets 99.5% uptime with prioritized computational resources. Requests beyond your committed capacity automatically fall back to standard tier."
- [partial] https://docs.claude.com/en/docs/about-claude/models/choosing-a-model — Choosing a model: "Effort: Several Claude models support an effort parameter that trades intelligence for latency and cost within a single model."

## p-d6-t3-03 Running stakeholder feedback loops

- [partial] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Methods by stage: "User feedback and transcript review are ongoing practices to fill the gaps"
- [partial] https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues — Lessons: "Evals and monitoring are important. But these incidents have shown that we also need continuous signal from users when responses from Claude aren't up to the usual standard."
- [partial] https://claude.com/blog/deploying-ai-from-pilot-to-production — Intro: "a review cadence for each tier"

## p-d6-t4-01 Architecture documentation and decision records

- [partial] https://claude.com/blog/the-ai-native-sdlc-playbook — Overview: "Each stage ends by writing one to version control (including intent.md, spec.md, plan.md, the diff and its tests, the PR with its review findings, and the incident record) and the next stage begins by reading it."
- [partial] https://docs.claude.com/en/docs/claude-code/memory — Write and organize CLAUDE.md files: "Create this file and add instructions that apply to anyone working on the project: build and test commands, coding standards, architectural decisions, naming conventions, and common workflows."

## p-d6-t4-02 Implementation guidance and runbooks

- [direct] https://claude.com/blog/how-anthropic-teams-use-claude-code — Debugging / runbooks: "The Security Engineering team has Claude ingest multiple documentation sources to create markdown runbooks and troubleshooting guides. These condensed documents become context for debugging real production issues"
- [direct] https://docs.claude.com/en/docs/claude-code/memory — Write and organize CLAUDE.md files: "add instructions that apply to anyone working on the project: build and test commands, coding standards, architectural decisions, naming conventions, and common workflows."
- [partial] https://claude.com/blog/the-ai-native-sdlc-playbook — Deploy/Maintain: "Deployment and rollback are runbooks a human follows under pressure."
- [partial] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Methods by stage: "Automated evals are especially useful pre-launch and in CI/CD, running on each agent change and model upgrade as the first line of defense against quality problems."

## p-d6-t5-01 Phase gates from discovery to production

- [direct] https://claude.com/blog/deploying-ai-from-pilot-to-production — Intro: "Seven considerations to be settled in chronological order: before the pilot begins, during the pilot phase, and in production"
- [partial] https://claude.com/blog/the-ai-native-sdlc-playbook — Overview: "First, you prompt each step by hand with the end state being a loop in which each accepted artifact fires the next gate."
- [partial] https://claude.com/blog/how-to-prepare-for-ai-driven-code-modernization-projects — Six-step framework: "Set the promotion policy: the path by which certified changes get into production at the rate they / Run the modernization: prove the workflow end to end on a small partition of the codebase, then scale."

## p-d6-t5-02 Handoff to operating teams

- [partial] https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start — Organizational structure: "An emerging role in several organizations is an agent manager: a hybrid PM/engineer function dedicated to managing the Claude Code ecosystem. For organizations without a dedicated team, the minimum viable version is a DRI: one person with ownership over the Claude Code configuration"
- [partial] https://claude.com/blog/deploying-ai-from-pilot-to-production — Intro: "A transition blueprint laying out what to decide, when to decide it, and who needs to own each decision"
- [partial] https://claude.com/blog/the-ai-native-sdlc-playbook — Overview: "The AI-native SDLC promotes automated handover and triggering of subsequent plays, helping to address the manual and clunky nature of handoff between the phases of the traditional SDLC."

## p-d6-t5-03 Sustaining monitoring and iteration after launch

- [direct] https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — Methods by stage: "Production monitoring kicks in post-launch to detect distribution drift and unanticipated real-world failures."
- [direct] https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start — Keeping configuration current: "Teams should expect to do a meaningful configuration review every three to six months, but it's also worth doing one whenever performance feels like it's plateaued after major model releases."
- [partial] https://docs.claude.com/en/docs/about-claude/model-deprecations — Migrating to replacements: "Once a model is deprecated, migrate all usage to a suitable replacement before the retirement date. Requests to models past the retirement date will fail."
- [partial] https://www.anthropic.com/research/measuring-agent-autonomy — Recommendations: "Post-deployment monitoring is essential for understanding how agents are actually used."

## p-d7-t1-01 Team-shared Claude Code configuration

- [direct] https://docs.claude.com/en/docs/claude-code/memory — Write and organize CLAUDE.md files: "These instructions are shared with your team through version control, so focus on project-level standards rather than personal preferences."
- [direct] https://docs.claude.com/en/docs/claude-code/memory — CLAUDE.local.md: "For private per-project preferences that shouldn't be checked into version control, create a `CLAUDE.local.md` at the project root."
- [direct] https://docs.claude.com/en/docs/claude-code/settings — Settings scopes: "Shared project settings (`.claude/settings.json`): settings your team checks into source control."
- [partial] https://docs.claude.com/en/docs/claude-code/security — Team security: "Share approved permission configurations through version control"

## p-d7-t1-02 Shared commands, skills, and MCP servers

- [direct] https://docs.claude.com/en/docs/claude-code/mcp — Project scope: "Project-scoped servers enable team collaboration by storing configurations in a `.mcp.json` file at your project's root directory. ... Check `.mcp.json` into version control so everyone on your team gets the same MCP tools and services."
- [direct] https://docs.claude.com/en/docs/claude-code/skills — Where skills live: "Save it under your home directory to get it in every project, commit it to a repository to share it with everyone who works there, or distribute it through a plugin or managed settings to reach a whole team."
- [direct] https://docs.claude.com/en/docs/claude-code/skills — Custom commands: "Custom commands have been merged into skills. A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way."

## p-d7-t1-03 Organization-wide policies and access control

- [direct] https://docs.claude.com/en/docs/claude-code/managed-settings — Intro: "Managed settings are the settings your organization deploys to every developer's machine. Claude Code applies them above every other level, so no user, project, local, or `--settings` value overrides them"
- [direct] https://docs.claude.com/en/docs/claude-code/admin-setup — Intro: "Claude Code enforces organization policy through managed settings that take precedence over local developer configuration."
- [direct] https://docs.claude.com/en/docs/claude-code/permissions — Precedence: "If a tool is denied at any level, no other level can allow it. For example, a managed settings deny can't be overridden by `--allowedTools`"
- [direct] https://docs.claude.com/en/docs/claude-code/monitoring-usage — Intro: "Track Claude Code usage, costs, and tool activity across your organization by exporting telemetry data through OpenTelemetry (OTel)."

## p-d7-t2-01 AI-assisted development loops

- [direct] https://docs.claude.com/en/docs/claude-code/best-practices — Explore first, then plan, then code: "Planning is most useful when you're uncertain about the approach, when the change modifies multiple files, or when you're unfamiliar with the code being modified. If you could describe the diff in one sentence, skip the plan."
- [direct] https://docs.claude.com/en/docs/claude-code/best-practices — Give Claude a way to verify its work: "Give Claude a check it can run: tests, a build, a screenshot to compare."
- [direct] https://docs.claude.com/en/docs/claude-code/common-workflows — Plan mode: "For changes you want to review before they touch disk, switch to plan mode. Claude reads files and proposes a plan but makes no edits until you approve."

## p-d7-t2-02 Automation in CI/CD

- [direct] https://docs.claude.com/en/docs/claude-code/headless — Intro: "To run Claude Code in non-interactive mode, pass `-p` with your prompt and the CLI options you need"
- [direct] https://docs.claude.com/en/docs/claude-code/best-practices — Run non-interactive mode: "Non-interactive mode is how you integrate Claude into CI pipelines, pre-commit hooks, or any automated workflow."
- [direct] https://docs.claude.com/en/docs/claude-code/github-actions — Intro: "Claude Code GitHub Actions is a GitHub Action that runs Claude Code inside your repository's workflows."
- [direct] https://docs.claude.com/en/docs/claude-code/best-practices — Run parallel sessions: "A fresh context improves code review since Claude won't be biased toward code it just wrote."

## p-d7-t2-03 Adoption and productivity measurement

- [direct] https://docs.claude.com/en/docs/claude-code/analytics — Intro: "Claude Code provides analytics dashboards to help organizations understand developer usage patterns, track contribution metrics, and measure how Claude Code impacts engineering velocity."
- [direct] https://docs.claude.com/en/docs/claude-code/analytics — Metrics: "Use alongside DORA metrics, sprint velocity, or other engineering KPIs to understand changes from adopting Claude Code"
- [direct] https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start — Governance: "we suggest starting with a defined set of approved skills, required code review processes, and limited initial access"

## p-d7-t3-01 AI-assisted debugging

- [direct] https://docs.claude.com/en/docs/claude-code/common-workflows — Fix bugs efficiently: "Tell Claude the command to reproduce the issue and get a stack trace"
- [direct] https://docs.claude.com/en/docs/claude-code/common-workflows — Delegate research to subagents: "Exploring a large codebase fills your context with file reads. Delegate the exploration so only the findings come back."
- [direct] https://claude.com/blog/how-anthropic-teams-use-claude-code — Debugging: "During incidents, the Security Engineering team feeds Claude Code stack traces and documentation to trace control flow through the codebase."

## p-d7-t3-02 Operational incident resolution

- [direct] https://claude.com/blog/how-anthropic-teams-use-claude-code — Debugging / infrastructure: "They fed it dashboard screenshots, and Claude guided them menu-by-menu through Google Cloud's UI until they found pod IP address exhaustion."
- [direct] https://claude.com/blog/how-anthropic-teams-use-claude-code — Runbooks: "The Security Engineering team has Claude ingest multiple documentation sources to create markdown runbooks and troubleshooting guides."
- [direct] https://claude.com/blog/the-ai-native-sdlc-playbook — Maintain (incident loop): "The tier boundaries are enforced from version-controlled config, with permissions and managed settings denying production access. Invocations, findings and triage decisions are logged with a timestamp. A service owner triages and approves findings, resulting changes go through the normal PR review gate, and the runbooks the agent may trigger were approved in advance."
- [partial] https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues — Lessons: "We identified the issue and rolled back the change on September 2. We've added detection tests for unexpected character outputs to our deployment process."

## Step 4 への申し送り(生成セッション・2026-09-30)

本表はここから手で保守する(生成スクリプトは scratchpad 上の一時物で再実行しない)。150 枚は `status: flagged` で `questions/d1〜d7-flash.json` に登録済み(配分 d1 26 / d2 19 / d3 29 / d4 24 / d5 21 / d6 21 / d7 10)。`audit-flash --exam ccar-p --status flagged` と `validate-bank`(重み乖離警告 0)は緑。

- **refs 突合(手順 1)**: 各カードの主張を refs の本文と 1 枚ずつ照合する。生成は topic ごとにこの表の URL の本文を読んで行ったが、カード文面と本文の機械照合はしていない。生成後に本セッションで書き直した 14 枚(ドメイン横断の重複 7 組と F 重複 6 枚の解消)は特に確認する。現在の ID: p-d1-q005 / p-d1-q010(p-d1-t4-02 から p-d1-t3-01 へ移動)/ p-d1-q018 / p-d1-q026、p-d2-q004、p-d3-q026、p-d4-q002(p-d4-t6-02 から p-d4-t1-01 へ移動)/ p-d4-q023、p-d5-q006、p-d6-q015、p-d7-q001 / q002 / q005 / q006。重複を避けるため p-d1-q009 / p-d4-q001 / p-d6-q015 / p-d7-q006 の答えと解説も調整した
- **解説の推論の基準**: 解説のうち「なぜ正しいか」「よくある誤解・劣る代替」を述べる文は、生成ブリーフが求める要素なので、refs の本文の主張から直接言える範囲なら残す。本文に無い新しい事実・推奨(例: p-d5-q006 の最終文「ユーザーの前提を含まない形で問い直す」)は削るか、根拠のある表現に直す。2 周のレビューはこの基準で判定する
- **文体の統一**: p-d5 と p-d6 の explanation_ja(計 40 枚)が「です・ます調」。他ドメインと F バンクの「である調」に揃える(editorial。flagged のうちに直すので rev は 1 のまま)
- **改定の早い値**: p-d5-t4-03 の FedRAMP / DoD IL の認可水準のカードは発表記事の時点の記述。暗記問題として残すかを判断する(`SOURCES.md` §4 の制作方針)
- **推論の削除済み**: p-d3 の 3 枚(t7-03 / t6-03 / t8-03)の解説から、本文に無い推論の文を削除した
- 完了後は active に反転し、`audit-flash --exam ccar-p --counts 26,19,29,24,21,21,10`(`--status active`)と `validate-bank` を再実行する(DoD の重み乖離警告 0 はこの時点で確認)

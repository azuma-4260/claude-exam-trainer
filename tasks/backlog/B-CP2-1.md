---
id: B-CP2-1
origin: CP2
created: 2026-09-30
status: absorbed-by CP2
related_tasks: [CP2, CP1]
related_specs: ["07#原則", "07#ccar-p-フェーズf-合格後v13-で詳細化"]
related_paths: [content/ccar-p/syllabus.yaml, content/ccar-p/SOURCES.md, content/ccar-p/CP2-refs-map.md, specs/07_content-pipeline.md]
related_backlog: [B-CP0-1, B-C5-1]
stop_condition: none
decisions:
  - { at: 2026-09-30, by: CP2, action: escalate, note: "3 topic が許可ソース内で裏付けられず、全 topic 被覆(audit-flash)を満たすカード生成に進めない。syllabus 改訂 / refs 規約 / 許可ソースのいずれかをオーナーが決めるまで CP2 は stopped(dod-unmet)" }
  - { at: 2026-09-30, by: CP2, action: absorb, note: "オーナー決定: p-d2-t5-02 は syllabus を Prompt reuse(再利用可能な部品と caching / Skills の使い分け)に改訂し版管理を主題にしない。p-d3-t7-03 は連携方式の選択と信頼境界に、p-d6-t2-01 は相手の意思決定に必要な形で示す骨格にカードを絞る。claude.com/blog と anthropic.com/research は公式ブログに含める" }
---
# P の 3 topic が 07 の許可ソース内で裏付けられず、CP2 のカード生成に進めない

## 内容

CP2 では、生成の前に 108 topic すべてに、主張を実際に裏付ける台帳 URL を割り当てた(`content/ccar-p/CP2-refs-map.md`)。調査範囲は `07` 原則の 4 ソース(Exam Guide / docs.claude.com / Anthropic Academy / Anthropic 公式ブログ)。その結果、次の 3 topic は topic の中核を裏付ける本文が見つからなかった。

| topic | 見つからなかったもの | 近いもの(中核ではない) |
|---|---|---|
| p-d2-t5-02 Modular and versioned prompts | 共通指示の部品化・プロンプトのバージョン管理 | 「評価を先に作る」「変更ごとに eval を回す」(p-d4-t2-03 の論点) |
| p-d3-t7-03 Agent-to-agent communication | 別システム・別組織のエージェントへの委任(A2A)。anthropic.com/news/agent2agent は 404 | 同一システム内のサブエージェント委任。信頼境界の側面なら Agent SDK の secure-deployment(未採用) |
| p-d6-t2-01 Tailoring trade-off communication to audiences | 相手(経営層 / 技術者)に応じた伝え分け | 意思決定の責任分担・リスクの可視化(claude.com/blog) |

`audit-flash` は syllabus の全 topic にカードがあることを要求する(`scripts/audit-flash.ts` 検査 3)。このため、syllabus を変えずにこの 3 topic だけを飛ばすことはできない。近接 URL を根拠扱いしたカードを作ることは、CP2 プランとオーナー指示(一次ソースは 07 を遵守)で禁止している。

あわせて、次の解釈もオーナー確認が要る。

- 「Anthropic 公式ブログ」に claude.com/blog と anthropic.com/research を含めた(anthropic.com/news の一部が claude.com/blog へ 301 されるため)。refs がこの 2 つだけの topic は 9 件ある(p-d1-t6-01, p-d1-t6-02, p-d5-t5-01, p-d5-t5-03, p-d6-t1-01, p-d6-t1-03, p-d6-t2-01, p-d6-t5-01, p-d6-t5-02)。含めない判断なら、この 9 件も根拠不足になる
- partial のみの 22 topic は、引用が裏付ける論点にカードを絞る前提で「可」と判定した(判定表は `CP2-refs-map.md` 冒頭)

## 再現手順 / 根拠

- `content/ccar-p/CP2-refs-map.md` の【根拠不足】見出し 3 件と注記
- 全 348 引用は、curl で取得した生の本文と機械照合済み(2026-09-30)

## 推奨対応(オーナーが選ぶ)

1. **syllabus 改訂(推奨)**: 3 topic の範囲を許可ソースで支えられる所まで狭めるか、隣の topic に統合する。例: p-d3-t7-03 は「接続先の信頼境界の定義」に絞る。p-d2-t5-02 は p-d2-t5-01 / p-d2-t5-03(caching / Skills)に統合する。p-d6-t2-01 は p-d6-t2-02 に統合する。CP1 でオーナー承認済みの成果物を開き直すため、粒度の再承認が要る
2. **refs 規約の変更**: Exam Guide の目標本文を根拠として認める(B-C5-1 と同じ論点)。`07` 原則の改訂が要る
3. **許可ソースの拡大**: resources.anthropic.com の公式ガイド等を加える。`07` 原則の改訂が要る

決定後は `/task-session resume CP2` で再開する。台帳(`SOURCES.md` §12)と対応表は作成済みなので、次はカード生成(CP2 プラン手順 3)から進める。

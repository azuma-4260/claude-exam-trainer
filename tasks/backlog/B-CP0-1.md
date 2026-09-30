---
id: B-CP0-1
origin: CP0
created: 2026-09-29
status: absorbed-by CP2
related_tasks: [CP2]
related_specs: ["09#phase-7-1019-1128--p-バンクと模試", "08#p-フェーズ-928-1212v13"]
related_paths: [specs/09_task-plan.md, specs/08_roadmap.md]
stop_condition: none
decisions:
  - { at: 2026-09-30, by: CP2, action: absorb, note: "09 CP2 行と 08 P 成否判定の表現を CP0 重なりマップ(content/ccar-p/SOURCES.md §8)基準に書き換えた。優先付けの表現のみで DoD・日程は不変" }
---
# `09` CP2 行と `08` P 成否判定の「F に無い 3 ドメイン」表現を CP0 の重なりマップに揃える

## 内容

CP0 で P の 38 目標と F の task statement を照合した結果(`content/ccar-p/SOURCES.md` §8)、D5 / D6 / D7 はドメインとしては F に無いが、目標単位では D7 は F-D3 とほぼ重なり、D5 の guardrails・HITL も F と重なる。F に対応の無い領域は D6 全体、D5 の規制準拠・倫理、D3 の RAG・retrieval・observability・認証認可、D4 の評価・監視など、ドメインをまたいで分布する。

CP0 では spec 範囲内の `02` / `07` §CCAR-P Step 2 を訂正したが、次の 2 箇所は CP0 の spec 列外のため残っている:

- `specs/09_task-plan.md` Phase 7 の CP2 行: 「F に無い 3 ドメインを優先」
- `specs/08_roadmap.md` P 成否判定: 「P の重み上位ドメインと F に無い 3 ドメインへ集中運用」

## 再現手順 / 根拠

`grep -n "F に無い 3 ドメイン" specs/`。`07` §CCAR-P Step 2(CP0 で訂正済み)と表現が食い違う。

## 推奨対応

CP2 着手時(または次の 09 / 08 改訂時)に、優先根拠を「CP0 重なりマップ(`content/ccar-p/SOURCES.md` §8)で F と重ならない目標」へ書き換える。優先付けの表現のみでスケジュール・DoD の意味は変わらない。

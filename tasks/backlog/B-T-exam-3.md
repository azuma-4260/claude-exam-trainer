---
id: B-T-exam-3
origin: T-exam
created: 2026-09-30
status: open
related_tasks: [CP1, D6-4]
related_specs: ["03#1-問題バンクcontent", "05#s-4-practice", "05#s-7-間違いノート"]
related_paths: [src/lib/bank/runtime.ts, src/lib/mock/dto.ts, src/lib/practice/serve.ts, src/lib/mistakes/derive.ts]
stop_condition: none
---
# スコープ both の Practice / 間違いノートで、F と P に同名シナリオ id があると本文を取り違える

## 内容
シナリオ id(`sc-*`)は exam 内でのみ一意(03 §1 v1.3)。模試はセッションの exam からシナリオを引くので安全だが、
Practice / 間違いノートの DTO はシナリオを bare id で返し、スコープ both では F と P のシナリオを連結して引く
(`scopeBank().scenarios`)。P にシナリオがあり F と同名 id を使うと、クライアント側で片方の本文が表示される。
CP0 の記録では P の Guide にシナリオ構造の記述が無く、現時点で P のシナリオは存在しない。

## 再現手順 / 根拠
- `src/lib/bank/runtime.ts` `scopeBank`(scenarios を exam 横断で連結)
- `src/lib/practice/serve.ts` / `src/lib/mistakes/derive.ts` の `toScenarioDtos(scenarioIds, scenarios)`

## 推奨対応
P のシナリオ有無が T-pmock / CP1 で確定した時点で判断する。P にシナリオを置くなら、(a) validator で F と P のシナリオ id の衝突を禁止する、
または (b) DTO のシナリオ参照を `(exam, scenario_id)` にする。

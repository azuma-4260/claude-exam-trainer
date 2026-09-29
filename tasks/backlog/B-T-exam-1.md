---
id: B-T-exam-1
origin: T-exam
created: 2026-09-30
status: open
related_tasks: [D6-3]
related_specs: ["03#1-問題バンクcontent", "06#バンク静的検証"]
related_paths: [src/lib/bank/load.ts, src/lib/bank/runtime.ts]
related_backlog: [B-S-3-1]
stop_condition: none
---
# BANK_DIR override が ccar-f 専用で、P のフィクスチャバンクを dev で差し込めない

## 内容
D6-1 で実行時バンクを exam ごと(`content/<exam>/`)の和集合にした。従来の `BANK_DIR` override(development 限定)は
単一ディレクトリを指すため、全 exam に効かせると P に F のフィクスチャを読ませてしまう。D6-1 では override を
`ccar-f` にだけ効かせる暫定仕様にした(`bankDir` の分岐)。P の手動検証・実機 DoD でフィクスチャを差し込む手段が無い。

## 再現手順 / 根拠
- `src/lib/bank/load.ts` `bankDir`(`exam === "ccar-f"` のときだけ override)
- `src/lib/bank/runtime.test.ts`「BANK_DIR override は ccar-f にだけ効く」

## 推奨対応
D6-3(バンクの複数試験対応)で override を「exam ディレクトリを並べた親ディレクトリ」(例: `BANK_ROOT=/tmp/fixture-bank` → `<root>/<exam>`)に一般化し、validate-bank / audit と同じ解決規則にそろえる。

# tasks/backlog — タスク外の未解決事項

仕様(スキーマ・集約・昇格)は `specs/10_task-ops.md` §1 が正本。検証は `npm run backlog:check`。

## 起票テンプレート(`B-<発生元ID>-<n>.md`)

```markdown
---
id: B-D1-2-1
origin: D1-2
created: 2026-08-25
status: open
related_tasks: [D1-3]
related_specs: ["03#出題プールの判定順序"]
related_paths: [src/lib/pool.ts]
stop_condition: none
---
# 1 行で要点

## 内容
## 再現手順 / 根拠
## 推奨対応
```

## 昇格チェックリスト(オーナー)

1. `specs/09_task-plan.md` §4 に行を追加(ID・Tr・depends・spec・DoD)
2. §5 を再生成(`X ← A, B` を 1 行追加)
3. `scripts/task/graph.ts` の `expectedNodes` を +1
4. `scripts/task/graph.test.ts` / `check.test.ts` の期待値を更新し `npm test` 緑
5. 項目の `status` を `promoted-to <新ID>` に更新
6. 以上を同一 commit で main に入れる

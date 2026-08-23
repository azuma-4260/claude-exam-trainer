---
name: task-session
description: >
  09 のタスクを 1 つ選び、規約どおりに worktree で実装し、Codex レビュー後に commit せず
  承認を求めて停止する定型セッション。並列 worktree・承認ボトルネック・バックログを
  `task:report` から読み、未解決事項を tasks/backlog に積み上げ、固定テンプレートで報告する。
  引数: `(なし)` = 自動選択 / `<ID>` / `resume <ID>` / `approved` = 承認後の完了記録。
  スラッシュ明示呼び出し専用(自然文では発火しない)。
disable-model-invocation: true
allowed-tools: ["Bash", "Read", "Grep", "Glob", "Edit", "Write", "Agent", "Skill"]
---

# task-session スキル

## 設計思想

- **規約の実行器であって規約ではない**。判定はすべて既存の仕組み(`npm run task:check` / `task:start` / `task:report`、台帳、`tasks/README.md`、`specs/09` `specs/10`)に委ね、このスキルは順番どおりに呼んで結果を報告するだけ。09 を自分で読み直して依存を再導出しない
- **承認前に外部へ出さない**: commit・merge・push・台帳更新は `approved` までしない。承認依頼時の内容と承認後の内容が同じであることを承認ハッシュ(`specs/10` §4)で保証する
- **1 セッション = 1 ID**(paired task は T-x の 1 worktree で T-x と D-y を一緒に)。並列性は別セッションが担う
- **読むだけのものは書かない**: 他 worktree・他ブランチ・共有 checkout は読むだけ。他セッションの起票は書き換えない

## 引数

| 引数 | 動作 |
|---|---|
| (なし) | `task:report` の `candidates[0]` を選ぶ。候補ゼロなら選ばずに報告して停止 |
| `<ID>` | その ID を着手対象にする。`task:check <ID>` が READY でなければ着手しない |
| `resume <ID>` | 既に `task:start` 済みの自分の worktree から再開 |
| `approved` | 承認後の続き(commit → 完了の記録) |

## 手順

### 0. 準備(共有 checkout で)

1. `git rev-parse --abbrev-ref HEAD` が `main` で `git status --porcelain` が空であることを確認。違えば**何も変更せず**「共有 checkout が `<branch>` / dirty(他セッションの作業の可能性)」と報告して停止
2. `git pull --ff-only`
3. `npm run task:report -- --json` を実行し JSON を保存する(fail closed で非 0 なら、その stderr を報告して停止)
4. 対象 ID を決める(引数または `candidates[0]`)。`excluded` に入っている ID が明示指定されたら理由を示して停止(O-\*/M-\* は着手不可、paired の D-y は T-x を指定、lock-conflict は相手の完了待ち、frozen は凍結後)
5. `npm run task:check <ID>` が `READY` でなければ、`candidates` から代替を提案して停止
6. `npm run task:start <ID>`。失敗は自動ロールバック済みなので stderr を報告して停止
7. worktree ルートに `.task-session-state` を書く: `{"id":"<ID>","state":"implementing"}`。以後の作業はすべて `cd .claude/worktrees/<ID>` で行う
8. **paired task**(`specs/10` §3): T-x を着手したら同じ worktree で D-y も実装し、完了記録で両方の台帳を書く。`task:start D-y` はしない

### 1. 並列セッションとバックログの照合(必須)

report の `worktrees[]`(自分以外)と `backlog[]` を読み、着手前に次を決めて最終報告に書く:

- **衝突**: 自分の `nodes[].spec` と相手の `spec` が重なる節、相手の `changedPaths` と自分が触る予定のパスの重複を分けて列挙。重なるときは「相手の merge を待つ / 触らない範囲を限定する / 先に進めて merge 時に解消」のどれかを選び理由を書く
- **同時 1 本**(`migration`、`package-lock.json` 変更): 相手が該当していれば自分の作業がそれに触れないことを確認。自分が `package-lock.json` を変えるなら報告に明記する
- **バックログ**: `status: open` で `related_tasks ∩ {自 ID, 自 depends, paired の相方}` または `related_specs ∩ 自 spec 節` が非空な項目ごとに **absorb(本タスクで解決)/ defer(理由)/ escalate(オーナー判断が要る。停止条件該当など)** を決める。他ブランチ由来(`source.kind` が `worktree` / `branch`)は書き換えず報告のみ。absorb した場合は自分の起票(手順 4)の `related_backlog` で参照する
- **状態不明の worktree**(`session` が null で dirty)は承認待ちとは断定せず「状態不明」として列挙する

### 2. 実装

1. 09 の spec 列に書かれた節を**必ず読む**(`specs/` が唯一の仕様ソース)
2. README 常時遵守 2(状態遷移テスト先行)。T-\* なら red のテストを main に入れないため、paired の D-y 実装まで同じ worktree で行う
3. DoD を満たすまで実装し、検証コマンドを実行する: `npm test` / `npm run typecheck` / `npm run lint`、該当すれば `npm run validate-bank` / `npm run db:check`、最後に `npm run backlog:check`

### 3. 停止条件

- README の停止条件 7 領域(永続データの意味・スキーマ / 状態遷移 / 採点 / SRS / Mock holdout・スコア / 認証認可境界 / 本番データ変更)に当たる未定義の選択 → コードに `TODO(owner)` を残し、`.task-session-state` を `{"id":..,"state":"stopped","reason":"stop-condition: <領域>"}` にして停止
- DoD を満たせない → `reason: "dod-unmet"` で停止(09 §7)
- いずれも commit しない。報告に「何が決まれば再開できるか」を書く

### 4. 積み上げ

本タスクで解決しないと決めたこと(scope 外の不備・defer した項目・レビューで見送った MINOR 等)を `tasks/backlog/B-<ID>-<n>.md` に起票する(テンプレートは `tasks/backlog/README.md`、`stop_condition` を正しく付ける)。`npm run backlog:check` が緑であること。レビューの**前**に行う

### 5. レビューと承認依頼

1. プロジェクトスキル **`codex-review`** を Skill ツールで呼ぶ(引数なし = 未コミット差分。`/codex:review` はユーザー起動専用なので使わない)。スキルが無い / Codex CLI が無い / 認証失敗なら `reason: "codex-unavailable"` で停止し、commit も承認依頼もしない
2. P1(Blocking)を修正し、検証コマンドを再実行
3. **commit しない**。承認ハッシュを計算して `.task-session-state` に書く:

```bash
H=$(git rev-parse HEAD)
HASH=$( { echo "$H"; git diff; git diff --cached; git ls-files --others --exclude-standard | while read -r f; do printf '%s\n' "$f"; cat "$f"; done; } | shasum -a 256 | cut -d' ' -f1 )
printf '{"id":"%s","state":"awaiting-approval","head":"%s","hash":"%s"}\n' "<ID>" "$H" "$HASH" > .task-session-state
```

4. 最終報告(§報告テンプレート)を出して停止。承認はオーナーが `/task-session approved` で与える

### 6. `approved`(承認後)

1. `.task-session-state` を読む。`state` が `committed` なら(`head` が `task/<ID>` の先端と一致することを確認して)手順 4 へ(再開)。**それ以外(`implementing` / `stopped` / ファイル無し)は承認対象が無いので拒否して停止**(「レビューと承認依頼を経ていない」と報告)。`awaiting-approval` なら `id` が worktree の ID と一致し、手順 5-3 と同じ方法で**再計算したハッシュが完全一致**することを確認。不一致なら「承認後に内容が変わった」と報告し、手順 5 からやり直す(commit しない)
2. **commit の前に**共有 checkout が clean な `main` であることを確認する。違えば何もせず「承認済み・未 commit。共有 checkout が空いたら `/task-session approved` を再実行」と報告して停止(承認ハッシュは有効なまま)
3. `/smart-commit` で worktree ブランチに commit(`.task-session-state` は `.gitignore` 済みなので含まれない)し、`.task-session-state` を `{"id":"<ID>","state":"committed","head":"<commit 後の HEAD>"}` に更新する
4. `tasks/README.md` の「完了の記録」2〜7 をそのまま実行する: 共有 checkout が clean な `main` であることを確認 → `git pull --ff-only` → `git merge --no-ff task/<ID>` → `npm test` → `tasks/status/<ID>.yaml` を `state: merged`(paired は T-x と D-y の両方)→ push → `git worktree remove .claude/worktrees/<ID>` → `git branch -d task/<ID>` → CI 緑(D0-3 完了前は `npm test && npm run build` を evidence にしてよい)を確認して **独立 commit** で `state: done` + `evidence`
5. 手順 4 の途中で共有 checkout が使えなくなった(`main` でない / dirty)場合はその時点で停止し、「commit 済み(state: committed)・未マージ。共有 checkout が空いたら `/task-session approved` を再実行」と報告。再実行時は `committed` の `head` が `task/<ID>` の先端と一致することを確認してから手順 4 を続ける

### `resume <ID>`

`task:report` で `<ID>` が IN_PROGRESS、かつ `git rev-parse --show-toplevel` が `.claude/worktrees/<ID>` であるときだけ、`.task-session-state` の `state` に応じて再開する(`implementing` → 手順 1 から、`awaiting-approval` → 承認を待つだけ、`committed` → `/task-session approved` で完了記録を再開、`stopped` → `reason` が解消されたか確認し、`.task-session-state` を `{"id":"<ID>","state":"implementing"}` に戻してから手順 1 から)。worktree が無く ref だけなら「`git worktree add .claude/worktrees/<ID> task/<ID>` で再接続するかはオーナー判断(手動 worktree add は規約で禁止のため自動化しない)」と報告して停止

## 報告テンプレート(最終メッセージはこの形式)

```
## 🧭 task-session: <ID>(<implementing|awaiting-approval|stopped|done>)

### 対象と DoD
- ID / paired 相方 / spec 節
- DoD 検証: npm test ✅ typecheck ✅ lint ✅ backlog:check ✅(該当分のみ)

### 承認依頼(awaiting-approval のとき)
- 差分要約(ファイル数・主な変更)/ Codex レビュー結果(P1 修正済み・残り MINOR)
- 承認するなら `/task-session approved`

### オーナーボトルネック
- report.bottlenecks の各行(ID ← 必要な操作)
- 承認待ち worktree(session=awaiting-approval)/ escalate したバックログ項目

### バックログ判断
- absorb: … / defer: …(理由)/ escalate: …(理由)/ 新規起票: B-<ID>-<n> …

### 並列セッション
- 衝突(spec 節 / パス)と回避方針 / 状態不明の dirty worktree

### 次の候補
- report.candidates の上位 3 件(理由つき)
```

## 注意事項

- `EnterWorktree` と手動 `git worktree add` は使わない。`task:start` 以外で worktree を作らない
- 共有 checkout・他 worktree・他ブランチ・origin には読む以外の操作をしない(`approved` の完了記録を除く)
- `.env.local` / `.vercel/project.json` の値を表示しない
- `specs/` と実装が食い違ったら spec が正。spec を変えたければ停止条件として報告する
- `specs/10_task-ops.md` が本スキルの仕様の正本。食い違いがあれば 10 が優先

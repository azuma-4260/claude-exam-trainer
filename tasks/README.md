# 並行セッション運用(worktree + タスク依存チェック)

複数の Claude Code セッションを git worktree で並行させるための規約。`specs/09_task-plan.md` のタスク ID・依存表が正本で、本書は「誰がどのタスクに着手でき、何をもって完了とするか」の運用だけを定める。

## 着手プロトコル(全セッション必須)

1. セッション冒頭で着手したい ID を宣言し、**main worktree で** `npm run task:check <ID>` を実行する
2. `READY` のときだけ `npm run task:start <ID>` で着手する。`BLOCKED` / `IN_PROGRESS` / `MERGED_PENDING` / `DONE` なら**着手せず**、引数なしの `npm run task:check` が出す READY 一覧から代替を提案して止まる
3. `task:start` は `fetch → main が origin/main と一致 → READY 判定 → .claude/worktrees/<ID> に task/<ID> ブランチで worktree 作成 → .env.local / .vercel/project.json を mode 600 で配布 → npm ci` を行う。**worktree 作成の成功 = 着手権の獲得**(同じ ID の ref が既にあれば git が拒否する)。準備に失敗したら worktree と ref は自動でロールバックされる
4. 以後の作業は作成された worktree で行う(`cd` するか、そのパスで別セッションを開く)
5. `EnterWorktree` や手動の `git worktree add` は使わない。ブランチ名は `task/<ID>` 厳密一致、**複合 ID(`task/T-srs+D1-1`)は禁止**。連続タスクはマージ後に次を `task:start` する
6. **paired task**(09 §7): T-x と対応する実装 D-y は `task/T-x` の worktree で一緒に納品する。paired の D-y は `task:check` が BLOCKED / READY のどちらを出しても**単独では着手しない**。マージ時は `tasks/status/T-x.yaml` と `D-y.yaml` の両方を同じ push で記録する

## 状態の定義

| 状態 | 判定ソース | 意味 |
|---|---|---|
| `DONE` | `origin/main` の `tasks/status/<ID>.yaml` が `state: done` | リリースゲート G を完走。**依存充足に使うのはこれだけ** |
| `MERGED_PENDING` | 同 `state: merged` | main にマージ済みだが CI 緑 / deploy 未確認。着手禁止・依存は未充足 |
| `IN_PROGRESS` | `task/<ID>` ブランチが存在 | 他(または自分)の worktree で進行中。worktree が消えて ref だけ残っていても進行中扱い |
| `BLOCKED` | depends に DONE でないものがある | |
| `MILESTONE_PENDING` | M-* で depends 全 DONE かつ未記録 | オーナーが DoD を確認して記録する |
| `READY` | 上記いずれでもない | 着手可 |

判定は常に **`origin/main`** 上の 09 と台帳を読む(fetch 込み)。ローカルや作業ブランチの状態は見ない。09 の §3+§4(正本)と §5(導出)が 1:1 でない、台帳に未知 ID や壊れたファイルがある、git が失敗する、のいずれでも **fail closed**(非 0 終了、READY を返さない)。

## 完了の記録(二段階)

1. worktree ブランチで G を開始: `/codex:review` → P1 修正 → オーナー承認
2. main worktree で `git pull --ff-only` → `git merge --no-ff task/<ID>` → `npm test` green
3. `tasks/status/<ID>.yaml` を **`state: merged`** で作成し、同じ push に含める
4. `git push` → `git worktree remove .claude/worktrees/<ID>` → `git branch -d task/<ID>`(未マージなら拒否される安全弁)
5. CI 緑(DoD に deploy を含むタスクは deploy 成功も)を確認したら、**独立した 1 コミット**で `state: done` に書き換え、`evidence:` に Actions run URL 等の証跡を書いて push
6. DoD に deploy を含まないタスク(T-*、docs 系)も CI 緑の確認後に `done`。O-* はオーナーが DoD 確認時に直接 `done`
7. **D0-3(CI 導入)より前に `merged` になったタスク**(D0-4 / D0-5 / T-srs 等)は CI 緑を証跡にできないので、main worktree で `npm test && npm run build` green を確認し、それを `evidence` に書いて `done` にしてよい。D0-3 完了後はこの扱いを使わない

台帳ファイルは許可キー `state` / `evidence` / `recorded` のみ。`done` には `evidence` 必須。

### マイルストーン(M-*)

記録主体は**オーナー**。`task:check` が `MILESTONE_PENDING` を出したら 09 §3 の DoD を実際に確認し、証跡(Actions run URL・本番 URL・migration 適用ログ等)を `evidence` に書いて `tasks/status/M*.yaml` を `done` で commit する。Claude Code は代行しない(DoD に本番確認が含まれるため)。

### 非ノード保守(規約文・台帳・運用スクリプトの小修正)

09 のノードにならない保守作業(09/README/tasks/README の規約文の追記、台帳の記録、`scripts/task/` の小修正、新 spec の追加)は、差分をオーナーに提示して承認を得たうえで、clean な `main` checkout から直接 commit・push してよい(実績: dbb63b1 の paired task 追記、D0-6 の 09 登録)。機能実装・テスト・スキーマ変更はこの対象外で、必ず 09 の ID で `task:start` する。

### bootstrap 例外(導入時のみ・再利用禁止)

台帳導入(2026-08-23)前に main に入っていた S-1 / D0-1 / D0-2 は CI 未導入のため、ローカル DoD の再実行結果を証跡として `done` 登録した。O-1〜O-5 はオーナー確認済みの旨を証跡とした。導入作業自体は 09 のノードではないため台帳に記録しない。以後この例外は使わない。

## worktree 固有の注意

- `.env.local` / `.vercel/project.json` の配布元は main worktree ルート。`task:start` がコピーする。値を表示しない
- 各 worktree で `npm ci` が必要(`task:start` が実行する)。node_modules は共有されない
- **同時 1 本のみ**: Drizzle migration を生成するタスク(D0-4、C6 の schema 変更)、`package-lock.json` を変えるタスク。dev branch の Neon DB は全 worktree 共有なので migration 適用も直列。task-check は強制しないので、着手時に `task:check` の IN_PROGRESS 一覧を見て判断する
- 台帳更新は常に main worktree で行い、更新前に `git pull --ff-only`。push 失敗時は再 pull して再試行
- `claude/*` など規約外ブランチを `task:check` が見つけたら警告する。`task/<ID>` に rename するかマージ・削除する

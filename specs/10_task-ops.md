# 10. タスク運用補助(バックログ・レポート・セッション状態)

`09` がタスクの依存と完了条件、`tasks/README.md` が着手・完了の運用手順を定めるのに対し、本書はセッション運用の補助仕様を定める。§1〜5 の 3 仕組み(バックログ・レポート・セッション状態)は D0-6、§6 の Codex CLI 直接連携は D0-7 で実装する。既存の状態機械(`scripts/task/check.ts` / `start.ts` / `ledger.ts`、台帳の state 集合 `merged | done`)は**変更しない**。§1〜5 はそれらの上に乗る読み取り専用の層、またはブランチ内ファイルである。

## 1. バックログ(`tasks/backlog/`)

### 目的

タスク作業中に見つかったが、そのタスクの DoD 外で解決しなかった事項を**耐久的に**残し、後続セッションが着手時に必ず照合できるようにする。09 のノードではない(昇格はオーナー作業、§1.4)。

### 置き場所とライフサイクル

- 起票は **自分の task ブランチ内**の `tasks/backlog/B-<発生元ID>-<n>.md`。main への到達はそのタスクの merge と一緒(独立した main push はしない)
- 他セッションの未マージ起票は `task:report`(§2)が各 worktree / `task/*` ブランチから**読み取り専用**で集約する。他ブランチの項目の status を書き換えることはできない。判断(absorb / defer / escalate)はセッションの最終報告に記録し、absorb した場合は自分の起票の `related_backlog` で参照する
- `<n>` は発生元 ID ごとの連番。発生元 ID の worktree は同時に 1 つしか存在しない(`task:start` の排他)ので衝突しない

### スキーマ(正本。`scripts/backlog/schema.ts` の Zod と 1:1)

front matter(YAML)+ 本文(Markdown: 内容・再現手順・推奨対応)。

| キー | 型 | 必須 | 制約 |
|---|---|---|---|
| `id` | string | ✓ | `B-<origin>-<n>`。ファイル名 `<id>.md` と一致 |
| `origin` | string | ✓ | 09 に存在するタスク ID |
| `created` | string | ✓ | `YYYY-MM-DD`(Asia/Tokyo) |
| `status` | string | ✓ | `open` / `absorbed-by <ID>` / `promoted-to <ID>` / `closed`。埋込 ID は 09 に存在 |
| `related_tasks` | string[] | ✓(空可) | 09 に存在するタスク ID |
| `related_specs` | string[] | ✓(空可) | `<spec番号>#<見出しスラッグ>`(例 `03#出題プールの判定順序`)。文字列形式のみ検証 |
| `related_paths` | string[] | ✓(空可) | リポジトリ相対パス(先頭 `/` と `..` セグメントは不可)。存在確認はしない |
| `related_backlog` | string[] | 任意 | `B-<ID>-<n>` 形式。存在確認はしない(未マージ項目を参照できる) |
| `stop_condition` | string | ✓ | `none` / `schema` / `transition` / `scoring` / `srs` / `mock` / `auth` / `prod-data`(README 停止条件の 7 領域) |
| `decisions` | object[] | 任意 | 各要素 `{at: YYYY-MM-DD, by: <09 ID>, action: absorb|defer|escalate|close, note: string}` |

未知キー、型違反、列挙外の値、ID 不一致はすべて検証失敗(fail closed)。

### 検証 `npm run backlog:check [dir]`

既定で作業ツリーの `tasks/backlog/` を検証し、違反があれば 1 件以上を stderr に出して非 0。`tasks/backlog/README.md` は検証対象外。09 のグラフは作業ツリーの `specs/09_task-plan.md` から `loadGraph` で読む。

### 昇格(オーナー作業)

`open` 項目を 09 のノードにする場合: §4 に行追加 → §5 再生成 → `scripts/task/graph.ts` の `expectedNodes` 更新 → `graph.test.ts` / `check.test.ts` 緑 → 項目の `status` を `promoted-to <新ID>` に更新。これらは同一 commit で行う。

## 2. レポート `npm run task:report -- --json`

読み取り専用。`scripts/task/check.ts` の `takeSnapshot` / `judgeAll` を再利用し、以下を 1 つの JSON で stdout に出す。**どの worktree・ブランチ・ファイルも変更しない**。

### 出力

```jsonc
{
  "generatedAt": "2026-08-24T09:00:00+09:00",
  "today": "2026-08-24",                 // Asia/Tokyo
  "nodes": [{ "id": "D0-4", "status": "READY", "track": "D", "spec": "03 §2, 06 §…",
              "depends": ["D0-1", "O-3"], "blockedBy": [], "worktree": null }],
  "candidates": [{ "id": "D0-4", "rank": 1, "scheduled": "8/24", "reason": "当日" }],
  "excluded": [{ "id": "O-2b", "reason": "owner-track" }],   // owner-track | milestone | paired-dependent | paired-blocked | lock-conflict | frozen
  "bottlenecks": [{ "id": "D0-3", "blockedBy": [{ "id": "O-2b", "status": "BLOCKED" }],
                    "ownerAction": "O-2b: CI 経由 deploy を確認して tasks/status/O-2b.yaml を done で記録" }],
  "worktrees": [{ "id": "T-holdout", "path": "…/.claude/worktrees/T-holdout", "branch": "task/T-holdout",
                  "dirty": true, "changedPaths": ["src/lib/pool.ts"], "commitsAhead": 0,
                  "session": { "state": "implementing" } }],          // session は .task-session-state。無ければ null(状態不明)
  "backlog": [{ "id": "B-D1-1-1", "status": "open", "source": { "kind": "worktree", "ref": "task/D1-1", "path": "…" },
                "related_tasks": ["D1-3"], "related_specs": [], "stop_condition": "none", "title": "…" }],
  "sharedCheckout": { "path": "…", "branch": "main", "dirty": false },
  "warnings": ["task/D1-6 の tasks/backlog/B-D1-6-1.md: status が不正"]
}
```

### 自動選択候補 `candidates`

1. 母集合 = `status === "READY"` のノード
2. 除外(`excluded` に理由付きで列挙): O-\*(`owner-track`)、M-\*(`milestone`)、paired task の実装側 D-y(`paired-dependent`、§3)、paired の T-x で相方 D-y の depends(T-x 自身を除く)に DONE でないものがある(`paired-blocked`: 両方 green で一緒に main に入れる規約を満たせないため)、「同時 1 本」対象で同じ lock の IN_PROGRESS がある(`lock-conflict`、§3)、凍結後(`frozen`: `today >= 2026-09-20`、または O-6 / M5 が DONE)
3. 順位: 09 §6 の表から各 ID の予定日(行の日付。範囲行 `8/29–9/4` は開始日)を引き、**予定日が today より前のもの(期限超過)を古い順** → **当日** → **以降を日付順**。同日内はクリティカルパス優先(直近の未 DONE マイルストーンの depends に含まれるものを先に)。§6 に現れない ID は末尾
4. 日付はすべて Asia/Tokyo。実行環境の `TZ` に依存しない

### 承認ボトルネック `bottlenecks`

`BLOCKED` のうち、`blockedBy` の全要素が {O-\* の任意状態, MILESTONE_PENDING, MERGED_PENDING} のいずれかであるノード。`ownerAction` は blocker ごとに: O-\* → 「<ID> の手作業を完了し台帳 done」、MILESTONE_PENDING → 「DoD 確認と台帳 done」、MERGED_PENDING → 「CI 緑を確認して done」。

### 並列 worktree `worktrees`

`git worktree list --porcelain` の `task/*` ブランチを持つ各 worktree について、`git -C <path> status --porcelain --untracked-files=all`、`git -C <path> diff --name-only`(未追跡含む changedPaths)、`git -C <path> rev-list --count origin/main..HEAD` を取得する。worktree ルートの `.task-session-state`(§4)があれば `session` に載せる。

### バックログ集約 `backlog`

1. `origin/main:tasks/backlog/`(`git show`)
2. 各 `task/*` ブランチ: worktree があればその実ファイル(承認前は commit されないため)、無ければ `git show task/<ID>:tasks/backlog/` にフォールバック
3. 同じ `id` が複数 source にあれば worktree > branch > origin/main の順で 1 件に絞り、`source` にどれを採ったかを書く

### exit code

- 09 の不整合、`origin/main` 上のバックログ破損、git 失敗: **非 0**、JSON を出さない(既存 `task:check` と同じ fail closed)
- 他ブランチ / worktree 由来のバックログ項目の破損、`.task-session-state` の破損: その項目を除外して `warnings[]` に載せ、**exit 0**

## 3. paired task と「同時 1 本」の定数(`scripts/task/pair.ts`)

09 §7 と `tasks/README.md` の規約の機械可読版。テストで 09 の記述・グラフと一致することを固定する。

- `PAIRS`: `T-srs → D1-1`、`T-holdout → D1-2`、`T-write → D1-3`、`T-queue → D1-4`、`T-mock → D3-1`(T-rev は paired ではない)
- `EXCLUSIVE_LOCKS`: `migration` = {`D0-4`, `C6`}(Drizzle migration 生成)。`package-lock.json` を変えるタスクは静的に列挙できないため、セッションが着手時に自己申告で報告する

## 4. `/task-session` セッション状態(`.task-session-state`)

スキル `.agents/skills/task-session/SKILL.md`(正本。`.claude/skills/task-session` はここへの symlink)が、自分の worktree ルートに置く JSON ファイル。`.gitignore` に登録されているので commit されず、承認ハッシュの未追跡ファイル列挙(`--exclude-standard`)にも含まれない。他セッションはこれを `task:report` 経由で読むだけ。

```jsonc
{ "id": "D1-2", "state": "implementing" }
{ "id": "D1-2", "state": "awaiting-approval", "head": "<HEAD SHA>", "hash": "<sha256>" }
{ "id": "D1-2", "state": "committed", "head": "<commit 後の HEAD SHA>" }
{ "id": "D1-2", "state": "stopped", "reason": "codex-unavailable" }
```

遷移: `implementing → awaiting-approval`(Codex レビュー + P1 修正が終わり、commit せずに承認依頼した時点)/ `implementing | awaiting-approval → stopped`(停止条件・DoD 未達・Codex 利用不能)/ `awaiting-approval → committed`(承認後、共有 checkout が使えることを確認してから commit した時点。`head` は commit 後の HEAD)/ `committed → (完了)`(完了記録が終わり worktree が消えるのでファイルも消える。途中で共有 checkout が使えなくなっても `committed` のまま残り、再実行で merge から再開する)。

各 state の必須フィールド: `implementing` = `id`、`awaiting-approval` = `id, head, hash`、`committed` = `id, head`、`stopped` = `id, reason`。`task:report` はこれを検証し、列挙外の state・必須欠落・worktree ID と `id` の不一致は `session: null` + `warnings[]` にする。

### 計画的複数セッション引継ぎ(`implementing` + `next`)

spec が工程の別セッション実施を要求するタスク(`07` Step 4 のセルフレビュー等)は、`state: "implementing"` に `next: "<次工程>"` を付けたままセッションを終了してよい(`stopped/dod-unmet` は reason 解消まで再開不可のため、計画的な工程分割には使わない)。resume は `next` を読んで新鮮なセッションがその工程から継続する(既存の resume 規則「implementing → 手順 1 から」と互換)。

```jsonc
{ "id": "C2", "state": "implementing", "next": "step4-review" }
```

`next` の許可値は当面 `"step4-review"` のみ。許可値以外の `next`、および `implementing` 以外の state に付いた `next` は `task:report` が `warnings[]` に載せ、返却する session から `next` だけを除く(session 自体は有効のまま)。

### 承認ハッシュ

`hash` = 以下を順に連結した sha256(hex):
1. `git rev-parse HEAD`
2. `git diff`(unstaged)
3. `git diff --cached`
4. 未追跡ファイル(`git ls-files --others --exclude-standard` の順)ごとに `パス\n内容`

`approved` 実行時に再計算し、**完全一致**しなければ commit も merge もせずレビューからやり直す。承認したものと異なる内容が main に入ることを防ぐ。

## 5. スキルの承認境界

- `/task-session` は `disable-model-invocation: true` の明示呼び出し専用(Claude Code: `/task-session`、Codex: `$task-session`)。`disable-model-invocation` が効くのは Claude Code だけなので、Codex では暗黙起動しうる。明示呼び出し以外でこの手順に入らないことをスキル本文で要求する
- スキルは **commit・merge・push を承認前に行わない**。承認後(`approved`)の commit・merge・台帳は `tasks/README.md` の「完了の記録」をそのまま実行する(README 実装契約 6 と 09 原則 4/8 を変更しない)
- 必須レビューはプロジェクトスキル `codex-review` で行う(`/codex:review` はユーザー起動専用)。使えなければ `stopped` で報告する。**実装エンジンが Claude / Codex のどちらでもこの経路は変えない**(§6 の Codex CLI 直接実行に統一)。`codex-review` は Claude 固有ツール前提のため `.claude/skills/` に留め置く。Codex 実行時は同スキルがロードされないので、`.claude/skills/codex-review/SKILL.md` を読んでその手順を直接実行する

## 6. Codex CLI の直接利用

Claude Code が自律的に Codex を起動する経路は、PATH 上の `codex` を使う **Codex CLI の直接実行**に統一する。Claude プラグインのキャッシュ配下にある `codex-companion.mjs`、`/codex:rescue`、その他のプラグイン内部 API は使用しない。プラグイン更新によってレビュー手順が壊れることを避け、CLI の公開コマンドだけを実装契約にする。

- 可用性確認は `command -v codex`、`codex --version`、`codex login status` の 3 段階。バイナリの版やインストール先をハードコードしない。テスト時だけ `CODEX_BIN` で偽 CLI を注入してよい
- 未コミット差分は `codex review --uncommitted`、ブランチ差分は `codex review --base <ref>`。レビュー対象と custom prompt は CLI 上で排他的なので、設計観点を与える敵対的レビューは `codex exec --ephemeral --sandbox read-only` で行う
- 非対話タスクは `codex exec` を foreground で実行し、セッションを継続しない用途では `--ephemeral` を付ける。出力の機械検証が必要なら `--output-schema` または `--output-last-message` を使う
- 敵対的レビューループは Git 管理外の隔離 workspace を `-C` で指定し、`--skip-git-repo-check` を付ける。`.env*` / `.vercel/` / `.git/` / `node_modules/` をコピーしない既存の秘密情報対策は維持する
- レビュー用途では `--sandbox read-only` を明示し、`--dangerously-bypass-approvals-and-sandbox`、`danger-full-access`、`--add-dir` は使用しない。Codex 返却後の作業ツリー改変検知も維持する
- CLI 不在・未認証・非 0 終了・timeout・出力形式不正は `codex-unavailable` または既存の Claude フォールバック規則で扱い、無期限の再試行はしない

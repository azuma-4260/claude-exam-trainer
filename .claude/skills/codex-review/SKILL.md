---
name: codex-review
description: >
  Codex(GPT-5.x)による第二者コードレビューを Claude 自身から起動する。プラグインの
  `/codex:review` / `/codex:adversarial-review` はユーザー起動専用(disable-model-invocation)
  なので、同じ companion スクリプトをこのスキル経由で呼ぶ。README の実装契約 6
  (commit 前の Codex レビュー)を Claude が自律的に実行するときに使う。
  「Codex にレビューさせて」「Codex レビュー」「第二者レビュー」「codex:review を実行して」
  等に反応する。引数: `[--base <ref>] [--scope auto|working-tree|branch] [adversarial [focus ...]]`
allowed-tools: Bash, Read, Grep, Glob
---

# Codex レビュー(モデル起動可)

## 目的

`/codex:review`(組み込みレビュー)と `/codex:adversarial-review`(設計・前提への挑戦レビュー)
を、ユーザーのスラッシュ入力なしに Claude から実行する。レビュー専用で、修正は行わない。

## 引数の解釈

スキル引数 `$ARGUMENTS` を次のように読む:

- 先頭または末尾に `adversarial` があれば `adversarial-review` サブコマンド、なければ `review`
- `--base <ref>` / `--scope <auto|working-tree|branch>` はそのまま companion に渡す
- `adversarial` のときだけ、残りの自由文を **位置引数**(フラグの後ろに裸で)として渡す。
  companion に `--prompt` オプションは存在しない(付けると focus 本文に混入する)。
  `review` は focus 自体を受け付けない。観点指定が必要なら必ず adversarial を使う
- `--scope staged` / `--scope unstaged` は非対応
- 引数なし → `review --scope working-tree`(未コミット差分。untracked も含む)

## 手順

1. 対象の有無を確認する。スコープごとに見る場所が違う:
   - `--scope working-tree`(既定): `git status --short --untracked-files=all` が空なら対象なし
   - `--scope auto` / `--scope branch` / `--base <ref>`: 上記に加えて
     `git diff --shortstat <BASE>...HEAD` も確認する。`<BASE>` は **引数の `--base <ref>` を
     そのまま埋め込む**(`--base` 未指定なら `main`)。シェル変数には頼らず文字列として書く。
     **working tree が clean でもブランチにコミット済み差分があれば対象あり**
   - 両方空のときだけ「レビュー対象なし」と報告して終了。迷ったら実行する
2. **常に `--wait`(フォアグラウンド)** で実行する。Bash ツールは `~/.zshrc` の PATH を
   継承しないため、同一コマンド内で codex の場所を PATH に足す。companion のパスは
   バージョンをハードコードせず find で最新を取る。**Bash 呼び出し間でシェル変数は
   持ち越せない**ので、以下の前置き 3 行は companion を呼ぶ全コマンド(setup 含む)に毎回付ける。

   ```bash
   export PATH="$PATH:/Applications/ChatGPT.app/Contents/Resources"
   c=$(find ~/.claude/plugins/cache/openai-codex/codex -path '*/scripts/codex-companion.mjs' 2>/dev/null | sort -V | tail -1)
   [ -n "$c" ] && [ -f "$c" ] || { echo "CODEX_UNAVAILABLE: companion script not found"; exit 1; }
   # 組み込みレビュー(未コミット差分)
   node "$c" review --wait --scope working-tree
   # 例: ブランチ差分
   # node "$c" review --wait --base main
   # 例: 観点付き敵対的レビュー(focus は裸の位置引数)
   # node "$c" adversarial-review --wait --scope working-tree "README の実装契約(厳密 ACK 方式・holdout ゲート)への違反を探せ"
   ```

   timeout は 600000(10 分)を指定する。
3. `CODEX_UNAVAILABLE`、非 0 終了、または出力が `Reviewer failed to output a response` /
   `at capacity` のときは、**同じ前置き 3 行を付けて** `node "$c" setup --json` を実行し、
   `ready` / `nextSteps` をそのまま報告する。capacity エラーは 1 回だけ再試行してよい。
   それ以上は勝手に再試行し続けない。
4. 出力は**要約せず原文のまま**ユーザーに返し、その後にブロッキング判定を 1 行で添える:
   - `review`: `[P1]` 指摘があればブロッキング
   - `adversarial-review`: `Verdict: needs-attention` または severity `critical` / `high` の
     指摘があればブロッキング(P1 というラベルは返ってこない)

## 禁止

- このスキルの中で指摘を修正しない(修正は呼び出し元の判断。実装契約 6 ではブロッキング修正後に commit)
- `/codex:rescue` サブエージェント経由で呼ばない(PATH が通らず失敗する)
- Codex の出力を検証なしに「正」として扱わない。偽陽性の可能性は呼び出し元で判断する

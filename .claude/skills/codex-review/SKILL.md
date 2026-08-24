---
name: codex-review
description: >
  Codex CLI による第二者コードレビューを Claude 自身から起動する。プラグインの
  `/codex:review` / `/codex:adversarial-review` はユーザー起動専用(disable-model-invocation)
  なので、公開された Codex CLI コマンドをこのスキル経由で直接呼ぶ。README の実装契約 6
  (commit 前の Codex レビュー)を Claude が自律的に実行するときに使う。
  「Codex にレビューさせて」「Codex レビュー」「第二者レビュー」「codex:review を実行して」
  等に反応する。引数: `[--base REF] [--scope auto|working-tree|branch] [adversarial [focus ...]]`
allowed-tools: Bash, Read, Grep, Glob
---

# Codex CLI レビュー

## 目的

Codex CLI の組み込みレビューと、設計・前提への挑戦レビューを Claude から直接実行する。
レビュー専用で、修正は行わない。Claude プラグインの内部スクリプト/API には依存しない。

## 引数の解釈

スキル引数 `$ARGUMENTS` を次のように読む:

- 先頭または末尾に `adversarial` があれば `codex exec` による観点付きレビュー、なければ
  `codex review` の組み込みレビュー
- `--base <ref>` / `--scope <auto|working-tree|branch>` を受け付ける。`--base` 未指定時の base は `main`
- `adversarial` のときだけ残りの自由文を focus とする。組み込みレビューでは custom prompt と
  `--uncommitted` / `--base` が排他的なので、観点指定は必ず `adversarial` を使う
- `--scope staged` / `--scope unstaged` は非対応
- 引数なし → 未コミット差分(untracked を含む)

## 手順

1. Codex CLI を解決し、バージョンと認証を確認する。`CODEX_BIN` はテスト注入専用で、通常は
   PATH から解決する。Bash 呼び出し間で変数は持ち越せないので、CLI を呼ぶコマンドごとに
   次の前置きを付ける。

   ```bash
   CODEX_CLI="${CODEX_BIN:-}"
   [ -n "$CODEX_CLI" ] || CODEX_CLI=$(command -v codex 2>/dev/null || true)
   [ -n "$CODEX_CLI" ] && [ -x "$CODEX_CLI" ] || { echo "CODEX_UNAVAILABLE: codex CLI not found"; exit 1; }
   "$CODEX_CLI" --version
   "$CODEX_CLI" login status
   ```

2. 対象を確定する。
   - `working-tree`: `git status --short --untracked-files=all` が空なら対象なし
   - `branch` / `--base`: `git rev-parse --verify "<base>^{commit}"` で base を検証し、
     `git diff --shortstat <base>...HEAD` が空なら対象なし
   - `auto`: working tree に差分があれば `working-tree`、なければ `branch`。両方空なら対象なし
   - working tree と branch の両方を一度にレビューせず、選んだ一方だけを対象にする
3. 通常レビューは foreground で次のいずれかを実行し、Bash timeout は 600000ms とする。

   ```bash
   "$CODEX_CLI" -s read-only review --uncommitted
   "$CODEX_CLI" -s read-only review --base "<base>"
   ```

4. `adversarial` は `mktemp -d` で Git 管理外の一時ディレクトリを作り、focus・対象スコープ・
   関連 spec・出力契約を記載した `PROMPT.md` を置く。次を foreground で実行し、最終出力を
   `result.md` に保存する。Codex には対象に応じて未コミット差分または `<base>...HEAD` を
   読むよう明記し、severity `critical/high/medium/low`、根拠、最後の
   `Verdict: pass|needs-attention` を要求する。

   ```bash
   "$CODEX_CLI" exec --ephemeral --sandbox read-only -C "$(git rev-parse --show-toplevel)" \
     --output-last-message "<temp>/result.md" - < "<temp>/PROMPT.md"
   ```

   終了後は `result.md` を読み、一時ファイルを個別に削除して `rmdir` する。`--add-dir`、
   `danger-full-access`、sandbox bypass、resume は使わない。
5. 非 0 終了・空出力・`at capacity` の場合は同じ前置きで `--version` と `login status` を
   再確認し、診断結果をそのまま報告する。capacity だけは 1 回再試行してよい。それ以上は
   再試行し続けない。
6. 出力は**要約せず原文のまま**ユーザーに返し、その後にブロッキング判定を 1 行で添える:
   - `review`: `[P1]` 指摘があればブロッキング
   - `adversarial`: `Verdict: needs-attention` または severity `critical` / `high` の
     指摘があればブロッキング(P1 というラベルは返ってこない)

## 禁止

- このスキルの中で指摘を修正しない(修正は呼び出し元の判断。実装契約 6 ではブロッキング修正後に commit)
- Claude プラグインの内部スクリプト/API、`/codex:rescue`、Codex の resume を使わない
- Codex の出力を検証なしに「正」として扱わない。偽陽性の可能性は呼び出し元で判断する

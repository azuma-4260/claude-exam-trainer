---
id: B-C3b-B-2
origin: C3b-B
created: 2026-09-02
status: absorbed-by C3b-B
related_tasks: [C6, T-rev]
related_specs: ["07#step-6-継続改訂ループ", "03#rev-のライフサイクル"]
related_paths: [content/ccar-f/questions/d3-flash.json, content/ccar-f/questions/d3-claude-code.json, content/ccar-f/questions/form-a-code-gen.json, content/ccar-f/SOURCES.md]
related_backlog: []
stop_condition: none
---
# `/memory` を「ロード済み一覧」とする active カードの事実誤り(C3b-A の 8/27 訂正が逆だった)

## 内容
C3b-B の Codex レビューで、SOURCES.md §3.1 の 2026-08-27 注記「`/memory` は現在のセッションに
ロードされた CLAUDE.md / rules を詳細表示する」が現行公式 docs と逆であることが判明した
(docs: 「To check which files actually loaded into the current session, run /context」。`/memory` は
memory ファイルの場所一覧・編集・auto memory の toggle 用)。C3b-B では SOURCES.md 注記と
syllabus.yaml f-d3-t1-03 scope_ja、および form B の f-d3-q303 を修正済み。

しかし旧注記に基づいて C3b-A Step 4 で変更された **active カード**が残っている:
- **f-d3-q031**(flash, active): answer_en が「/memory gives the detailed list of loaded CLAUDE.md/rules」
  で**正解自体が誤り** → editorial fix ではないため 03 の rev ルールでは新 ID + retired
- **f-d3-q005**(flash, retired): 「/context の Memory files を見る」が正解で**元々正しかった**カード。
  C3b-A が「複数正解化」と誤判定して retire した
- **f-d3-q006**(flash, active, rev 2)/ **f-d3-q101**(mcq, active, rev 2)/ **form A f-d3-q203**(mcq, active):
  正解は /context のままで正しいが、解説に「/memory で現在ロード済みの CLAUDE.md / rules を詳細確認」
  という誤った記述が残る → editorial fix(rev++)
- form A f-d3-q203 は form A 収載問題なので、修正は 07 Step 6「フォーム収載問題のフラグ」の
  ルール(active 化まで当該フォーム開始不可、実行時差し込み禁止)に従う必要がある

## 再現手順 / 根拠
- https://code.claude.com/docs/en/memory 「View and edit with /memory」「Troubleshoot memory issues」
  (2026-09-02 確認)
- `grep -n "/memory" content/ccar-f/questions/d3-flash.json content/ccar-f/questions/d3-claude-code.json content/ccar-f/questions/form-a-code-gen.json`
- SOURCES.md §9 の 2026-08-27 行(C3b-A Step 4)と 2026-09-02 行(本訂正)

## 推奨対応
(2026-09-02 オーナー指示により C3b-B の worktree で同日修正。q031 retired / q032 新規 / q006・q101・q203 rev++、07 Step 4 の修正ループを適用)

- オーナー判断(escalate): (a) C6 を待たず小さな改訂セッションで直す(Drill で誤った flash が
  出続けるため推奨)か、(b) C6(継続改訂ループ)で扱うか。いずれも 07 Step 4 の「active 化後の
  修正ループ」(flagged に戻す → refs 突合 → 再レビュー 2 周 → active 再反転 → 全件監査 → Codex 再レビュー)を通す
- f-d3-q031 は新 ID で正しい内容(/context と /memory の役割の違い)に作り直して q031 を retired。
  q005 を再 active にするか新 ID で復元するかは 03 の rev ルール(retired は不可逆)に従い新 ID
- form A f-d3-q203 の解説修正は M3(form A 受験)の前後どちらで行うかを 08 のスケジュールと合わせて決める

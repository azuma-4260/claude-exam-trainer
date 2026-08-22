# 07. 問題バンク生成パイプライン(v1.2)

## 原則

- 一次ソース主義: 公式 Exam Guide v1.0 / docs.claude.com / Anthropic Academy / Anthropic 公式ブログのみ。サードパーティ問題集は参照・転記禁止
- ソーススナップショット固定: 参照 docs の版/日付を `content/ccar-f/SOURCES.md` に記録。試験前の改訂トリガーは (a) Exam Guide の version/errata、(b) フラグで判明した明確な事実誤り、のみ
- クリティカルパスはシナリオ MCQ。ただし**フォームより先に Practice 専用プールを成立させる**(8/28 学習開始のため)
- 全問題に refs 必須

## Step 0: 公式 Exam Guide の取得と転記(最初のタスク)

1. オーナーが PDF を取得し `design/refs/` へ
2. ドメイン・タスクステートメント・サンプル問題・サンプルシナリオを `syllabus.yaml` に転記
3. `02` と突合、公式優先で更新
4. 模試構造の確認: 「4 シナリオ × 各 15 問」の明記有無。明記があれば validator の各シナリオ 15 問検証を有効化、なければ件数を固定しない

## Step 1: トピックツリー展開

- タスクステートメント → topic 分解(60〜80 topics、primary/secondary)
- オーナーレビュー(粒度確認)

## Step 2: 最小フラッシュ(各ドメイン 20 × 5 = 100 枚)

- 中核概念のみ。`srs_eligible: true` / `eligible_modes: ["drill"]`
- 表 1 文英語、裏 3 行以内英語 + 日本語解説 2〜4 文

## Step 3a: Practice 専用シナリオ MCQ(8/28 まで・フォーム非収載)

- **15〜20 問**を最優先で完成させる(短いシナリオ 2 本 + 設問)。full form には収載しない
- `eligible_modes: ["practice"]` / `srs_eligible: true`
- これにより 8/28 から Drill + Practice の両輪で学習開始できる

## Step 3b: 固定フォーム用シナリオ MCQ(最大工数)

- シナリオ 6〜8 本(公式サンプル傾向: サポートエージェント / リサーチパイプライン / Agent SDK ツール / データ抽出 / CI/CD / チーム設定)
- **form A → B → C の順に各 60 問**(form 間重複なし、ドメイン配分 16-11-12-12-9)を `mock_forms.yaml` に登録し validator を通す
- フォーム収載問題: `eligible_modes: ["mock", "practice"]` / `srs_eligible: false`(holdout ゲートと提出後解放は `03` 参照)
- 品質ルール: 正解一意(mcq_multi は Select TWO・集合一致・部分点なし)/ 誤答は「一見もっともらしいが特定の理由で劣る」設計で解説が全選択肢を潰す / 暗記型でなく「この要件ならどの構成か」型 / 文体・難易度は公式サンプル準拠

## Step 4: セルフレビューパス(必須・別セッション)

1. refs 突合で事実誤り検出 → 2. 曖昧・複数正解を flagged に → 3. 重複統合 → 4. 修正 + 再レビューの 2 周後に active 化 → 5. オーナー抜き取り(各ドメイン 5 問)

## Step 5: 残フラッシュ + 独立 MCQ

- フラッシュ合計 **150〜220 枚**まで(topic 平均 2〜3 枚)
- 独立 MCQ **60〜100 問**: Practice / ドメイン別ミニ模試用(`eligible_modes: ["practice"]` または ミニ模試用に `["mock", "practice"]`。ミニ模試はフォーム収載問題を常に除外するため、実質このプールから構成される)
- proficiency 下位トピックに difficulty 3 を優先追加。正答率 90% 超トピックには追加しない

## Step 6: 継続改訂ループ

- `/api/export` の未解決フラグ(現行 rev のみ)→ 改訂セッション
- rev ルール厳守: editorial fix のみ rev++、それ以外は新 ID + retired
- 旧 rev フラグは superseded として自動失効(resolved_at 更新は任意の履歴整理)
- **フォーム収載問題のフラグ**: 該当フォームは修正が active 化されるまで開始不可(`01` FR-5 の availability 検証)。実行時の代替差し込み禁止

## CCAR-P フェーズ(F 合格後)

- 同一パイプラインを P の Exam Guide で再実行。F からの流用は必ず新 ID 採番。P 固有 3 ドメイン(計 35%)に集中

## 生成量サマリ(F・v1.2)

| 種別 | 目標 | 期限/優先 | 用途 |
|---|---|---|---|
| 最小フラッシュ | 100 | 8/26 | Drill 開始 |
| Practice 専用シナリオ MCQ | 15〜20 | **8/28** | Practice 開始 |
| フォーム収載シナリオ MCQ | 180(A→B→C 各 60) | A: 9/5 / B: 9/12 / C: 9/18 | 模試 + 提出後 Practice |
| 残フラッシュ | 合計 150〜220 まで | 9/12 | Drill / SRS |
| 独立 MCQ | 60〜100 | 9/12 | Practice / ミニ模試 |

数量より品質。誤学習を起こす問題を 1 問減らす方が 10 問増やすより効く。

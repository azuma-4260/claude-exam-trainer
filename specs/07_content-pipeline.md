# 07. 問題バンク生成パイプライン(v1.3)

**v1.3.1(2026-10-03, T-pmock)**: §CCAR-P の Step 3a 不適用・Step 3b のフォーム構造を確定値に更新。

**v1.3(2026-09-29, S-3)**: CCAR-P フェーズを詳細化(ディレクトリ・Step ごとの差分・生成量サマリ P 版)。以下の Step 0〜6 本文は F で確定した手順で、P は §CCAR-P フェーズの差分を適用して再実行する。

## 原則

- 一次ソース主義: 公式 Exam Guide v1.0 / docs.claude.com / Anthropic Academy / Anthropic 公式ブログのみ。サードパーティ問題集は参照・転記禁止
- ソーススナップショット固定: 参照 docs の版/日付を `content/<exam>/SOURCES.md`(F: `content/ccar-f/`、P: `content/ccar-p/`)に記録。試験前の改訂トリガーは (a) Exam Guide の version/errata、(b) フラグで判明した明確な事実誤り、のみ
- クリティカルパスはシナリオ MCQ。ただし**フォームより先に Practice 専用プールを成立させる**(8/28 学習開始のため)
- 全問題に refs 必須

## Step 0: 公式 Exam Guide の取得と転記(最初のタスク)

1. オーナーが PDF を取得し `ExamGuide/` へ(`ExamGuide/CCAR-F.pdf` 格納済み)
2. ドメイン・タスクステートメント・サンプル問題・サンプルシナリオを `content/ccar-f/SOURCES.md` に転記(`syllabus.yaml` は Step 1 で作るトピックツリー専用。シナリオは `scenarios.yaml`、`03` §1)
3. `02` と突合、公式優先で更新
4. 模試構造の確認: 「4 シナリオ × 各 15 問」の明記有無。明記があれば validator の各シナリオ 15 問検証を有効化、なければ件数を固定しない

## Step 1: トピックツリー展開

- タスクステートメント → topic 分解(60〜80 topics、primary/secondary)
- オーナーレビュー(粒度確認)

## Step 2: 最小フラッシュ(150 枚・weight 比例: d1 40 / d2 27 / d3 30 / d4 30 / d5 23)

- 全 topic に最低 1 枚(したがって全タスクステートメントをカバー)。残りは中核 topic へ厚めに配分(2026-08-24 オーナー決定で 100(20×5)から変更)
- 中核概念のみ。`srs_eligible: true` / `eligible_modes: ["drill"]`
- 表は英語 1〜4 文: 状況設定 0〜3 文 + 最後に問い 1 文。問いは `?` で終わる疑問文、または Describe / Explain / Name / List / Match / Identify / Compare / State / Give で始まり `.` で終わる指示文。各文は文末記号で終わり、最終文以外は `?` で終わらない(問いは 1 つ)。2026-10-01 D6-6 で「表 1 文」から改訂(F の rev 2 で状況設定を足したカードに合わせる。B-CP2-3)
- 裏 3 行以内英語 + 日本語解説 2〜4 文

## Step 3a: Practice 専用シナリオ MCQ(8/28 まで・フォーム非収載)

- **15〜20 問**を最優先で完成させる(短いシナリオ 2 本 + 設問)。full form には収載しない
- `eligible_modes: ["practice"]` / `srs_eligible: true`
- これにより 8/28 から Drill + Practice の両輪で学習開始できる

## Step 3b: 固定フォーム用シナリオ MCQ(最大工数)

- シナリオ 6〜8 本(公式サンプル傾向: サポートエージェント / リサーチパイプライン / Agent SDK ツール / データ抽出 / CI/CD / チーム設定)
- **form A → B → C の順に各 60 問**(form 間重複なし、ドメイン配分 16-11-12-12-9)を `mock_forms.yaml` に登録し validator を通す
- フォーム収載問題: `eligible_modes: ["mock", "practice"]` / `srs_eligible: false`(holdout ゲートと提出後解放は `03` 参照)
- 品質ルール: 正解一意(mcq_multi は Select TWO・集合一致・部分点なし)/ 誤答は「一見もっともらしいが特定の理由で劣る」設計で解説が全選択肢を潰す / 暗記型でなく「この要件ならどの構成か」型 / 文体・難易度は公式サンプル準拠
- **選択肢バランス(2026-09-19 オーナー指摘で追加。Step 3a / Step 5 の MCQ にも適用)**: 正解が形で見分けられてはならない。誤答も正解と同じ粒度(具体的な仕組み + もっともらしい理由)で書き、(a) 各正解の文字数 ≤ 1.25 × 最長誤答、(b) 正解が使う記法クラス(コロン・セミコロン・ダッシュ / カンマ / 括弧)は誤答の 1 つ以上にも現れる、(c) バンク全体で「最長の選択肢が正解」の問題は 45% 以下(4 択の期待値 25%)。`npm run audit:choices`(`scripts/audit-choice-balance.ts`)が CI で fail closed に検査する。形を揃えるだけの書き直しは editorial fix(`03` の rev++)、誤答の意味を変えるなら新 ID

## Step 4: セルフレビューパス(必須・別セッション)

1. refs 突合で事実誤り検出 → 2. 曖昧・複数正解を flagged に → 3. 重複統合 → 4. 修正 + 再レビューの 2 周後に active 化 → 5. オーナー抜き取り(各ドメイン 5 問)

- 生成直後のカードは `status: "flagged"` で登録し、手順 4(修正 + 再レビュー 2 周)の完了時に active へ反転する(2026-08-24 オーナー決定)
- **active 化後の修正ループ**: active 反転後にカードの内容変更(Codex P1 対応・オーナー抜き取りでの不備指摘を含む)が生じた場合、対象カードを `flagged` に戻し、refs 突合 → 再レビュー 2 周 → active 再反転 → 全件監査 → Codex 再レビューを通らない限り再 active 化しない。検証コマンド再実行だけで active のまま deploy に進むことを禁止する(editorial fix のみの場合も同ループ。rev ルールは `03` に従う)

## Step 5: 残フラッシュ + 独立 MCQ

- フラッシュ合計 **150〜220 枚**まで(topic 平均 2〜3 枚)
- 独立 MCQ **60〜100 問**: Practice / ドメイン別ミニ模試用(`eligible_modes: ["practice"]` または ミニ模試用に `["mock", "practice"]`。ミニ模試はフォーム収載問題を常に除外するため、実質このプールから構成される)
- proficiency 下位トピックに difficulty 3 を優先追加。正答率 90% 超トピックには追加しない

## Step 6: 継続改訂ループ

- `/api/export` の未解決フラグ(現行 rev のみ)→ 改訂セッション
- rev ルール厳守: editorial fix のみ rev++、それ以外は新 ID + retired
- 旧 rev フラグは superseded として自動失効(resolved_at 更新は任意の履歴整理)
- **フォーム収載問題のフラグ**: 該当フォームは修正が active 化されるまで開始不可(`01` FR-5 の availability 検証)。実行時の代替差し込み禁止

## CCAR-P フェーズ(F 合格後。v1.3 で詳細化)

同一パイプラインを P の Exam Guide(`ExamGuide/CCAR-P.pdf`)で再実行する。タスク ID・期限は `09` Phase 6〜8 が正本。

- **置き場所**: `content/ccar-p/`(`03` §1)。ID は `p-` 接頭辞。**F からの流用は必ず新 ID 採番**(F の attempt / srs_state と混ざらないため。F のカードは F スコープで引き続き復習できる)
- **Step 0(CP0)**: Guide を `content/ccar-p/SOURCES.md` に転記し、`02` CCAR-P 節を公式優先で突合。模試構造(問題数・ドメイン配分・シナリオ有無・multiple-response の選択数)と In/Out-of-Scope は **Guide の事実として記録するまで**。`03` §mock_forms への仕様化は T-pmock(停止条件: Mock のスコア)
- **Step 1(CP1)**: `content/ccar-p/syllabus.yaml`。task statement 層は Guide と 1:1、topic 数は CP0 で決めた範囲。オーナー粒度レビュー
- **Step 2(CP2)**: 最小フラッシュ 150(ドメイン重み比例)。ドメイン内では CP0 の重なりマップ(`content/ccar-p/SOURCES.md` §8)で F と重ならない目標(「なし」「部分」)を優先し、重なる目標は F カードとの重複を避ける。D5 / D6 / D7 はドメインとしては F に無いが、目標単位では D7 と D5 の一部が F と重なる(CP0)
- **Step 3a は P に適用しない(T-pmock で確定)**: P は独立問題形式(`03` §mock_forms §CCAR-P の構造。オーナー決定 2026-10-03)。Practice 用は Step 5 相当の独立 MCQ(CP3)で成立させる。状況説明は各問の stem に 2〜4 文で書く(受験記。`content/ccar-p/SOURCES.md` §1.1)。P の制作指針の詳細(binding constraint・誤答の作り方・難易度・問題タイプ)は S-4 で本節に追記する
- **Step 3b(CP4-A / CP4-B)**: P の固定フォームは `03` §mock_forms §CCAR-P の構造(63 問・配分 11-8-12-10-9-9-4・全問 scenario_id null・`mcq_single` / `mcq_multi`)に従う(F 固有値を流用しない)。フォーム収載問題の標準値(`eligible_modes: ["mock", "practice"]` / `srs_eligible: false`)と holdout は F と同じ(`03`、フォームは `(exam, form_id)` で識別)
- **Step 4**: F と同じ全工程(flagged で登録 → 2 周 → active、オーナー抜き取り各ドメイン 5 問、active 化後の修正ループ)。選択肢バランス監査も同じ基準で P に適用する
- **Step 5(CP3)**: 独立 MCQ 60〜100(Practice / ドメイン別ミニ模試用、フォーム非収載、全ドメインに収録)
- **Step 6(CP6)**: P の現行 rev 未解決フラグを `/api/export?exam=ccar-p` から取得して改訂

### 生成量サマリ(P・v1.3)

| 種別 | 目標 | 期限 | 用途 |
|---|---|---|---|
| 最小フラッシュ | 150(weight 比例) | 10/23(CP2) | 10/24 P Drill 開始 |
| 独立 MCQ | 60〜100 | 10/30(CP3) | 10/31 P Practice 開始 / ミニ模試 |
| P form A | 63 問(11-8-12-10-9-9-4) | 11/20(CP4-A) | 11/21 第 1 回フル模試 |
| P form B(A と重複なし) | 同上 | 11/27(CP4-B) | 11/28 第 2 回フル模試 |

## 生成量サマリ(F・v1.2。履歴)

| 種別 | 目標 | 期限/優先 | 用途 |
|---|---|---|---|
| 最小フラッシュ | 150(weight 比例) | 8/26 | Drill 開始 |
| Practice 専用シナリオ MCQ | 15〜20 | **8/28** | Practice 開始 |
| フォーム収載シナリオ MCQ | 180(A→B→C 各 60) | A: 9/5 / B: 9/12 / C: 9/18 | 模試 + 提出後 Practice |
| 残フラッシュ | 合計 150〜220 まで | 9/12 | Drill / SRS |
| 独立 MCQ | 60〜100 | 9/12 | Practice / ミニ模試 |

数量より品質。誤学習を起こす問題を 1 問減らす方が 10 問増やすより効く。

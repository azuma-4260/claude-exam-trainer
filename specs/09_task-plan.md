# 09. タスク計画(v1.2.1・依存関係と完了条件)

`08` が「いつ」のカレンダーであるのに対し、本書は「何を・どの順で・何が終われば完了か」を定める実行順の単一ソース。タスク ID は本書で採番し、以後のセッション・commit メッセージ・TODO(owner) で参照する。

前提(2026-08-23 時点): Exam Guide PDF は `ExamGuide/CCAR-F.pdf` に commit 済み。GitHub リポジトリ `azuma-4260/claude-exam-trainer` 作成・remote 設定・main push 済み(**O-1 完了**)。Vercel project・Neon・環境変数も設定済み(**O-2a / O-3 / O-4 完了**、詳細は `06` §環境の実体)。残るオーナー手作業は O-2b(D0-3 後)と O-5。

## 1. 順序を支配する原則

1. **8/27 cutover = スキーマ凍結**: `06` は cutover 後の DROP / 破壊的 ALTER を禁止する。Mock 実装が Phase 2 でも、**5 テーブル(srs_state / attempt / exam_session / exam_session_answer / question_flag)の migration は Phase 0 で全て適用**し、本番 attempt 発生前にスキーマ不備を潰し切る
2. **テスト先行(README 常時遵守 #2)は機能別タスク**: T-srs / T-holdout / T-write / T-queue / T-mock / T-rev を対応実装の直前に書く。`it.todo` や red のテストを main に置かない。**main は常に `npm test` green**
3. **CI とデプロイの直列化**: GitHub Actions で `validate-bank → npm test → npm run build` を 1 ワークフローで実行し、**Vercel の Git 自動 deploy は無効化**。deploy は CI 成功後の後続 job(Vercel CLI + token)からのみ実行する(`06` §バンク静的検証)。CI 失敗の動作確認は**一時ブランチ**で行い、main では行わない
4. **共通リリースゲート G**: 各タスク完了 → `/codex:review`(P1 は修正)→ オーナー承認 → commit → push → CI 成功 → deploy。DoD に「deploy」「本番反映」とあるタスクは G を経由する。G は全タスクの depends に暗黙に含め、表には書かない
5. **holdout ゲートは最初の出題プール実装に含める**: 9/5 に form A がバンクに入った瞬間に Practice へ漏れないよう、`03` §1 の 5 段判定は D1-2 で完全形で実装する(フォーム未存在でも fixture でテスト)
6. **コンテンツの DoD は `07` Step 4 の全工程**: refs 突合 → 曖昧の flagged → 重複統合 → 修正 + 再レビュー 2 周 → active → **オーナー抜き取り(各ドメイン 5 問)** → deploy。C2 / C3a / C5 / C3b-* すべてに適用する。抜き取り時間は各期限の内側に置く
7. **Dev と Content は同じ Claude Code を奪い合う**: §6 の日別配分に従う。Content の C0〜C1 は Dev に依存しないが、deploy は D0-3 に依存する
8. **commit はオーナー承認を経る**(G)。各タスクの DoD は「検証済み差分」までとし、commit 自体は DoD に含めない

## 2. トラック定義

| トラック | 担当 | 内容 |
|---|---|---|
| **O: Owner** | オーナー | 手作業(GitHub/Vercel/Neon/環境変数)、G の承認、抜き取りレビュー、学習、カレンダー確保 |
| **D: Dev** | Claude Code | アプリ実装・CI |
| **T: Test-first** | Claude Code | 実装直前の状態遷移テスト(常時遵守 #2) |
| **C: Content** | Claude Code(別セッション) | バンク生成 `07` Step 0〜6 |
| **M: Milestone** | – | 日付固定イベント |

## 3. マイルストーン

| ID | 日付 | イベント | depends | DoD |
|---|---|---|---|---|
| M0 | 8/24 | Phase 0 完了 | S-1, O-1, O-2a, O-2b, O-3, O-4, D0-1, D0-2, D0-3, D0-4, D0-5, C0, C1 | CI 3 ゲート緑 + CI 経由 deploy 1 回成功、両 branch に migration 適用、本番 URL でログイン可能 |
| **M1** | **8/27** | **Drill 開始 = data-protection cutover** | O-4, D1-1, D1-2, D1-3, D1-4, D1-5, D1-6, C2 | 本番 attempt 1 件保存 → 再読込で復元 → 翌日 due に出現。以後 migration は追加のみ |
| M2 | 8/28 | Practice 開始 | M1, D2-1, C3a | Practice で 1 問回答 → attempt(mode=practice)が本番に保存 |
| M3 | 9/6 | 第 1 回フル模試(form A) | D3-1, D3-2, D3-3, D3-4, C3b-A, O-5 | 提出完了・レポート表示・attempt 60 行生成・form A 問題が Practice に解放 |
| M4 | 9/13 | 第 2 回フル模試(form B) | M3, C3b-B, D4-1, D4-2, D4-3 | 同上。70% 未満なら D1/D3/D4 集中運用(`08`) |
| M5 | 9/20 | 新機能凍結 + 第 3 回フル模試(form C) | M4, C3b-C, C6, D5-1, O-6 | 凍結宣言済、以後 bug fix のみ。初回受験 2 回連続 85% で合格余裕圏 |
| M6 | 9/22 | 弱点ミニ模試 | M5 | mini セッション 1 件 submitted |
| M7 | 9/24 | rehearsal フル(最古 form・任意) | M5 | rehearsal ラベル表示・readiness 判定外 |
| M8 | 9/26 | D-1 総ざらい | M5, O-7 | D-1 モードのキュー提示で間違いノート周回完了 |
| – | 9/27 | 本試験 | | |

D0-6(タスク運用補助ツール)は M0 の depends に含めない: アプリの土台ではなくセッション運用の補助であり、遅延しても M0 の DoD に影響しないため。

## 4. 依存表(単一ソース)

以下が唯一の依存ソース。§5 のグラフは depends 列から導出する(G は暗黙)。spec 列は実装前に必ず読む節。

### Phase 0: 8/23–8/24 — 土台

| ID | Tr | タスク | depends | spec | DoD(観測可能) |
|---|---|---|---|---|---|
| S-1 | D | `02`/`06`/`07` の旧パス記述を `specs/`・`ExamGuide/` に修正。README 表に 09 追加、08 冒頭に 09 参照追記 | – | 02 §主要ソース, 06 §リポジトリ構成, 07 Step 0 | `grep -rn "design/" specs/02_syllabus.md specs/06_tech-stack.md specs/07_content-pipeline.md README.md` が 0 件。差分をオーナーが確認 |
| O-1 | O | GitHub repo 作成 + remote 設定 — **完了(8/23)**: `origin = azuma-4260/claude-exam-trainer` | S-1 | 06 §オーナーの手作業 | `git remote -v` に origin、`git push -u origin main` 成功 ✅ |
| O-2a | O | Vercel project 作成・GitHub 連携、**Git 自動 deploy を無効化**、`VERCEL_TOKEN` 等を GitHub Secrets に登録 — **完了(8/23)**: project `azx3/claude-exam-trainer`、Ignored Build Step = Don't build anything、Secrets 3 件 | O-1 | 06 | Vercel dashboard に project、GitHub Secrets に token ✅ |
| O-2b | O | CI 経由の最初の deploy 成功 | O-2a, D0-3 | 06 | Actions の deploy job 緑、本番 URL で Next.js 初期ページ表示 |
| O-3 | O | Marketplace で Neon 追加 + dev branch 作成 — **完了(8/23)**: `claude-exam-trainer-db`(sin1)、main → Production / dev → Preview+Development | O-2a | 06 §本番/開発 DB の分離 | production / dev の DATABASE_URL が 2 本、Vercel 環境ごとに紐付け ✅ |
| O-4 | O | `APP_PASSCODE` 設定、`SESSION_SECRET` 生成(`vercel env add` 代行可) — **完了(8/23)** | O-3 | 06 §認証 | `vercel env ls` に 4 変数が環境別に存在 ✅ |
| O-5 | O | 9/6・9/13・9/20・9/24 の 120 分枠をカレンダー確保 — **完了(8/23)** | – | 08 | 4 件登録(即日) ✅ |
| D0-1 | D | scaffold: Next.js 16 + TS + Tailwind + shadcn + Vitest + Drizzle + `@neondatabase/serverless` + ts-fsrs **5.4.1 exact**。`.gitignore` 更新。**CLAUDE.md コマンド節更新** | O-1 | 06 §採用スタック, CLAUDE.md | `npm ci && npm test && npm run build` 通過(テスト 1 件以上)。lock の ts-fsrs が 5.4.1 |
| D0-2 | D | Zod バンク schema(discriminated union、`03` §1 の全不変条件、`z.infer` 型) | D0-1 | 03 §1 | 不変条件ごとの valid/invalid Vitest green |
| D0-3 | D | `scripts/validate-bank.ts` + GitHub Actions(validator → test → build → **deploy job**) | D0-2, C1, O-2a | 06 §バンク静的検証, 03 §mock_forms | main で CI 緑。**一時ブランチ**で故意に壊した push → CI 赤 + deploy job skip を確認 |
| D0-4 | D | Drizzle schema 5 テーブル + partial unique index 2 本 + enum/CHECK + migration。dev → production 適用(cutover 前なので reset 自由) | D0-1, O-3 | 03 §2, 06 §本番/開発 DB の分離と data-protection cutover | 両 branch で定義が 03 と一致、`drizzle-kit check` 差分 0 |
| D0-5 | D | 認証: `POST /login`、HMAC 署名 Cookie、`proxy.ts`(optimistic)、write/export ハンドラ内の再検証 | D0-1, O-4 | 06 §リクエスト前段, §認証 | Vitest: 未ログイン 401 / 正パスコードで Cookie / 改竄 Cookie 401。`middleware.ts` 不在 |
| D0-6 | D | タスク運用補助: `/task-session` スキル、`tasks/backlog/`(validator 付き)、`task:report`(読み取り専用)。既存の状態機械(check/start/ledger)は変更しない | D0-1 | 10 | `npm test` 緑(report/backlog/pair テスト含む)、`npm run backlog:check` 緑、`npm run task:check` 引数なし正常終了 |
| C0 | C | Step 0: PDF からドメイン・タスクステートメント・サンプル転記、`02` 突合(公式優先)、**「4 シナリオ × 各 15 問」明記有無を記録** | – | 07 Step 0, 02 | `content/ccar-f/SOURCES.md` 作成、`02` 更新、15 問検証 ON/OFF を `03`/`06` に追記 |
| C1 | C | Step 1: `syllabus.yaml`(60〜80 topics)+ オーナー粒度レビュー | C0 | 07 Step 1, 02 §トピックツリー | topic 数 60〜80、オーナー承認 |

### Phase 1: 8/25–8/28 — 学習開始

| ID | Tr | タスク | depends | spec | DoD |
|---|---|---|---|---|---|
| T-srs | T | SRS 遷移テスト(状態遷移、maximum_interval、lossless round-trip、JST 日付) | D0-1 | 04, 03 §srs_state | 存在し D1-1 で green |
| D1-1 | D | `src/lib/srs/` ts-fsrs ラッパー(`maximum_interval = max(1, days_until_exam-1)`、retention 0.9、Card↔row 変換、`get_retrievability(card, now, false)`) | T-srs | 04 | T-srs green。返却 Card の個別フィールド書換なし |
| T-holdout | T | 出題プール判定テスト(5 段判定、domain mini のフォーム除外、提出後解放) | D0-2, D0-4 | 03 §出題プールの判定順序 | 仮 form + 仮 exam_session fixture で漏れ 0 |
| D1-2 | D | 出題プール判定の実装(フォーム未存在でも完全形) | T-holdout | 03 §1 | T-holdout green |
| T-write | T | 書込プロトコルテスト(同 attempt_id 同 payload→200 再適用なし / 不一致→409 / PK 競合後再取得 / srs_state lazy create / srs_eligible=false → applied_rating=null) | D0-4, D1-1 | 03 §書込プロトコル, 04 §モード行列 | 存在し D1-3 で green |
| D1-3 | D | 学習回答 API(6 段処理順、neon-http non-interactive transaction、ハンドラ内セッション検証) | T-write, D1-2, D0-5 | 03, 06 §接続方式 | T-write green。dev branch 実 DB で SRS 二重適用なし |
| T-queue | T | キュー生成テスト(new pace 式、45 分予算、NEW_RESERVED、priority、pace_warning、D-1 分岐の I/F) | D1-1 | 04 | 存在し D1-4 で green |
| D1-4 | D | キュー生成 + proficiency 集計 | T-queue, D1-2 | 04 | T-queue green |
| D1-5 | D | Quick Drill 画面 + Home(ノルマ/バックログ/カウントダウン/pace 警告)。**ACK 前 Next disabled、失敗時 Retry** | D1-3, D1-4 | 05 S-1, S-3 | スマホ実機: 回答→保存→再読込で復元、機内モードで Retry 表示 |
| D1-6 | D | 悪問フラグ API + 右上メニュー(同 rev 再フラグは update) | D0-4, D0-5 | 03 §question_flag, 01 FR-9 | フラグ後その問題がキューから消える。旧 rev フラグは除外されない(テスト) |
| C2 | C | Step 2: 最小フラッシュ 100(20×5)→ Step 4 全工程(抜き取り含む)→ deploy | C1, D0-3 | 07 Step 2, 4 | 8/26 までに本番 active 100 件 |
| D2-1 | D | Practice 画面(シナリオ折りたたみ、全選択肢解説 + refs、解放バッジ)。保存は D1-3 を共用 | D1-5 | 05 S-4, 04 | **統合テスト**: dev fixture の提出済み session + 解放問題で applied_rating=null(本番 E2E は D3-4) |
| C3a | C | Step 3a: Practice 専用シナリオ MCQ 15〜20 → Step 4 全工程 → deploy | C1, D0-3 | 07 Step 3a | 8/28 までに本番反映 |

### Phase 2: 8/29–9/6 — form A と初回模試

| ID | Tr | タスク | depends | spec | DoD |
|---|---|---|---|---|---|
| T-mock | T | 模試ライフサイクルテスト(開始時全行生成 + rev snapshot / 操作ごと保存 / manual・timeout 提出で attempt 一括 / 再提出 200 / full は abandon 不可・mini は可 / 未回答 is_correct=false) | D0-4 | 03 §exam_session, §Mock の attempt 生成 | 存在し D3-1 で green |
| D3-1 | D | Mock ライフサイクル実装 + 試験中画面(deadline_at - now、グリッド、見直しフラグ)+ 復元 | T-mock, D0-5 | 03, 05 S-5, 01 FR-5 | T-mock green。実機: 閉じて再開、deadline 超過で timeout 提出 |
| D3-2 | D | availability 検証(status≠active / 現行 rev 未解決フラグで開始不可)+ 未実施フォーム自動選択 + rehearsal ラベル | D3-1, D1-6 | 01 FR-5 | テスト: フラグ付き form 選択不可、全 block で開始拒否 |
| D3-3 | D | 模試レポート(素点 + 85% ライン、ドメイン別 + 重み、誤答一覧、rehearsal 注記) | D3-1 | 05 S-6 | 提出直後にレポート遷移、再受験で rehearsal 表示 |
| D3-4 | D | 提出後解放の本番 E2E(form A 提出後に Practice へ出現、未提出 form は出ない、解放問題の applied_rating=null) | D3-1, D1-2, D2-1, C3b-A | 03 §1, 04 | 本番 DB で確認(M3 直後) |
| C3b-A | C | form A 60 問(シナリオ 4 本、16-11-12-12-9)+ `mock_forms.yaml` → validator → Step 4 全工程 → deploy | C3a, C0, D0-3 | 07 Step 3b, 4; 03 §mock_forms | **9/5** 本番反映。遅延時は M3 を 9/8 へ(Flash 増産で代替しない) |

### Phase 3: 9/7–9/13 — バンク拡充と第 2 回模試

| ID | Tr | タスク | depends | spec | DoD |
|---|---|---|---|---|---|
| D4-1 | D | ドメイン別ミニ模試(独立 MCQ プールのみ、10〜15 問、abandon 可) | D3-1, D3-3, C5 | 01 FR-5, 03 §1 | テスト: フォーム収載問題が候補に 0 件、abandon で status=abandoned |
| D4-2 | D | 間違いノート(attempt 導出、3 連続正解卒業、誤答回数順、総ざらい=practice mode) | D2-1, D3-1 | 03 §間違いノート, 05 S-7 | テスト: 誤答→掲載、3 連続正解→消滅、再誤答→復帰。未提出 form 問題が現れない |
| D4-3 | D | Stats 最低限 + `/api/export` + 設定画面(未解決フラグ一覧は現行 rev のみ、ログアウト) | D3-1, D1-6, D0-5 | 05 S-8, S-9; 03 §3 | export JSON に 5 テーブル + 現行 rev フラグのみ。未ログインで 401 |
| C5 | C | Step 5: 残フラッシュ(合計 150〜220)+ 独立 MCQ 60〜100 → Step 4 全工程 → deploy | C2, C3a, D0-3 | 07 Step 5 | 9/12 本番反映、validator 重み乖離警告なし |
| C3b-B | C | form B(A の雛形再利用、A と重複なし)→ validator → Step 4 全工程 → deploy | C3b-A | 07 Step 3b | 9/12 本番反映 |

### Phase 4: 9/14–9/19 — 改訂と増強

| ID | Tr | タスク | depends | spec | DoD |
|---|---|---|---|---|---|
| T-rev | T | rev ライフサイクルテスト(rev++ で旧フラグ superseded、retired は出題除外、exam_session_answer の snapshot rev が deploy 後も不変) | D0-2, D0-4 | 03 §rev のライフサイクル, §question_flag | 存在し C6 前に green |
| C6 | C | Step 6: export の未解決フラグ → 改訂(editorial=rev++ / それ以外=新 ID + retired)→ deploy | D4-3, T-rev, M3, M4 | 07 Step 6, 03 §rev | 現行 rev 未解決フラグ 0 件。retired の DB 履歴行が残存 |
| C3b-C | C | form C + 弱点トピック difficulty 3 追加 → validator → Step 4 全工程 → deploy | C3b-B, M4 | 07 | 9/18 本番反映 |
| D5-1 | D | D-1 モード(9/26 のみ: due 選定停止、「間違いノート → low-stability 順」を予算内提示)+ 9/20〜の推奨行動カード | D1-4, D4-2 | 04 §直前期と D-1, 05 S-1 | テスト: JST 9/26 固定でキューが仕様順、9/25 は通常順 |
| D5-2 | D | (任意)ハーフ模試 / Stats チャート | M4 | 01 FR-5, 05 S-8 | 9/19 までに未着手なら捨てる |
| O-6 | O | 9/20 凍結宣言(以後 bug fix のみ) | C3b-C, D5-1 | 08 | 宣言後の commit が fix のみ |

### Phase 5: 9/20–9/26 — 直前期

| ID | Tr | タスク | depends | spec | DoD |
|---|---|---|---|---|---|
| O-7 | O | 9/26 間違いノート総ざらい(D-1 モード) | M5, D5-1 | 08, 04 §D-1 | 実施 |

## 5. 依存グラフ(§4 の depends 列から機械生成・全 55 ノード)

`X ← A, B` は「X は A と B の完了後に着手可能」。§4 を更新したら本節も再生成する(§4 との 1:1 を検証スクリプトで確認する)。

```
S-1 ← (なし)
O-1 ← S-1
O-2a ← O-1
O-2b ← O-2a, D0-3
O-3 ← O-2a
O-4 ← O-3
O-5 ← (なし)
D0-1 ← O-1
D0-2 ← D0-1
D0-3 ← D0-2, C1, O-2a
D0-4 ← D0-1, O-3
D0-5 ← D0-1, O-4
D0-6 ← D0-1
C0 ← (なし)
C1 ← C0
T-srs ← D0-1
D1-1 ← T-srs
T-holdout ← D0-2, D0-4
D1-2 ← T-holdout
T-write ← D0-4, D1-1
D1-3 ← T-write, D1-2, D0-5
T-queue ← D1-1
D1-4 ← T-queue, D1-2
D1-5 ← D1-3, D1-4
D1-6 ← D0-4, D0-5
C2 ← C1, D0-3
D2-1 ← D1-5
C3a ← C1, D0-3
T-mock ← D0-4
D3-1 ← T-mock, D0-5
D3-2 ← D3-1, D1-6
D3-3 ← D3-1
D3-4 ← D3-1, D1-2, D2-1, C3b-A
C3b-A ← C3a, C0, D0-3
D4-1 ← D3-1, D3-3, C5
D4-2 ← D2-1, D3-1
D4-3 ← D3-1, D1-6, D0-5
C5 ← C2, C3a, D0-3
C3b-B ← C3b-A
T-rev ← D0-2, D0-4
C6 ← D4-3, T-rev, M3, M4
C3b-C ← C3b-B, M4
D5-1 ← D1-4, D4-2
D5-2 ← M4
O-6 ← C3b-C, D5-1
O-7 ← M5, D5-1
M0 ← S-1, O-1, O-2a, O-2b, O-3, O-4, D0-1, D0-2, D0-3, D0-4, D0-5, C0, C1
M1 ← O-4, D1-1, D1-2, D1-3, D1-4, D1-5, D1-6, C2
M2 ← M1, D2-1, C3a
M3 ← D3-1, D3-2, D3-3, D3-4, C3b-A, O-5
M4 ← M3, C3b-B, D4-1, D4-2, D4-3
M5 ← M4, C3b-C, C6, D5-1, O-6
M6 ← M5
M7 ← M5
M8 ← M5, O-7
```

### クリティカルパス(8/27 M1 へ合流する 3 本)

```
Dev    : S-1 → O-1 → D0-1 → D0-4 → T-holdout → D1-2 → D1-3 → D1-5 → M1   (10 段・最長)
           ├ D0-1 → T-srs → D1-1 → T-write → D1-3 / T-queue → D1-4 → D1-5
           ├ D0-1 → D0-5 → D1-3(D0-5 は O-4 待ち)
           └ D0-4 → D1-6 → M1(D0-4 は O-3 待ち)
Owner  : S-1 → O-1 → O-2a → O-3 → O-4 → M1
Content: C0 → C1 → D0-3 → C2 → M1(D0-3 は C1 / D0-2 / O-2a の 3 つ待ち)
```

- **O-3 が D0-4 を、O-4 が D0-5 を、O-2a が D0-3 を止める**ため、O-1〜O-4 は 8/23 中に完了が必要
- M1 以降の主経路: M1 → D2-1 → M2 / T-mock → D3-1 → D3-2・D3-3・D3-4 → M3(C3b-A 9/5)→ D4-* → M4(C3b-B)→ C6・C3b-C・D5-1 → O-6 → M5 → M6・M7・M8

## 6. セッション配分(8/23–9/26)

| 日 | Owner | Dev / Test | Content |
|---|---|---|---|
| 8/23 | ~~O-1~~, ~~O-2a~~, ~~O-3~~, ~~O-4~~, ~~O-5~~(全て済) | S-1, D0-1, D0-2 | C0, C1(+粒度レビュー) |
| 8/24 | O-2b 確認 | D0-4, D0-5, D0-3, D0-6, T-srs, T-holdout → **M0** | C2 生成開始 |
| 8/25 | – | D1-1, D1-2, T-write, T-queue, D1-3 | C2 生成 |
| 8/26 | C2 抜き取り | D1-4, D1-5, D1-6 | C2 レビュー・deploy |
| 8/27 | **学習開始(M1)** | 実機確認、D2-1 | C3a |
| 8/28 | C3a 抜き取り・学習 | D2-1 → **M2** | C3a deploy |
| 8/29–9/4 | 学習 | T-mock, D3-1, D3-2, D3-3 | **C3b-A(最優先)** |
| 9/5 | form A 抜き取り | – | form A deploy |
| 9/6 | **M3** | D3-4(M3 直後) | – |
| 9/7–9/11 | 学習 | D4-2, D4-3, T-rev | C5, C3b-B |
| 9/12 | C5 / form B 抜き取り | D4-1 | deploy |
| 9/13 | **M4** | – | – |
| 9/14–9/17 | 学習 | D5-1, (D5-2) | C6, C3b-C |
| 9/18 | form C 抜き取り | – | form C deploy |
| 9/19 | – | bug fix | – |
| 9/20 | O-6 → **M5** | – | – |
| 9/21–9/26 | M6 / M7 / O-7 → M8 | bug fix のみ | – |

## 7. 運用ルール

- 新しいセッションは「本書のどの ID に着手するか」を冒頭で宣言し、`npm run task:check <ID>` が READY であることを確認して `npm run task:start <ID>` で始める(完了判定・worktree 規約は `tasks/README.md`)
- DoD を満たさない状態で次の ID に進まない。満たせない場合は TODO(owner) を残して停止する(README 停止条件)
- 日付が遅延した場合は `08` のリスク表(form A → 9/8 後ろ倒し等)に従い、本書の depends は変更しない
- **paired task**: テストタスク T-x と直後の実装タスク D-y(T-srs/D1-1、T-holdout/D1-2、T-write/D1-3、T-queue/D1-4、T-mock/D3-1)は、同一 worktree `task/T-x` でテスト先行 → 実装の順に作り、**両方 green の状態で一緒に main に入れる**(§1-2 の red テスト禁止の帰結。T-x 単独では main に入れない)。D-y の `task:start` は行わず、マージ時に両 ID を台帳記録する。T-rev は実装タスクが C6(コンテンツ)なので paired ではない

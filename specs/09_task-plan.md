# 09. タスク計画(v1.3・依存関係と完了条件)

`08` が「いつ」のカレンダーであるのに対し、本書は「何を・どの順で・何が終われば完了か」を定める実行順の単一ソース。タスク ID は本書で採番し、以後のセッション・commit メッセージ・TODO(owner) で参照する。

**v1.3(2026-09-28)**: CCAR-F は 2026-09-27 に合格。F 向けに積んでいた未着手タスクを棚卸し(§8)し、CCAR-P 向けタスクを Phase 6〜8 として追加した。F の完了済みノードと台帳(`tasks/status/`)はそのまま残す。**削除した ID は再利用しない**(§8 に一覧)。

前提(2026-09-28 時点): Phase 0〜2 と Phase 3 の一部は完了済み(台帳参照)。本番 DB には F の学習データがあり、data-protection cutover(`06`)は P フェーズでも継続する(migration は追加のみ、本番データの変更・破壊禁止)。CCAR-P の Exam Guide v1.0 は `ExamGuide/CCAR-P.pdf` に commit 済み(O-P1、9/28。台帳記録はオーナー)。**受験日は 2026-12-12(土)**(9/28 オーナー申告。O-P2 の台帳記録はオーナー)。

## 1. 順序を支配する原則

1. **8/27 cutover = スキーマ凍結**: `06` は cutover 後の DROP / 破壊的 ALTER を禁止する。Mock 実装が Phase 2 でも、**5 テーブル(srs_state / attempt / exam_session / exam_session_answer / question_flag)の migration は Phase 0 で全て適用**し、本番 attempt 発生前にスキーマ不備を潰し切る
2. **テスト先行(README 常時遵守 #2)は機能別タスク**: T-srs / T-holdout / T-write / T-queue / T-mock / T-rev を対応実装の直前に書く。`it.todo` や red のテストを main に置かない。**main は常に `npm test` green**
3. **CI とデプロイの直列化**: GitHub Actions で `validate-bank → audit:choices → backlog:check → npm test → npm run build` を 1 ワークフローで実行し、**Vercel の Git 自動 deploy は無効化**。deploy は CI 成功後の後続 job(Vercel CLI + token)からのみ実行する(`06` §バンク静的検証)。CI 失敗の動作確認は**一時ブランチ**で行い、main では行わない
4. **共通リリースゲート G**: 各タスク完了 → `/codex:review`(P1 は修正)→ オーナー承認 → commit → push → CI 成功 → deploy。DoD に「deploy」「本番反映」とあるタスクは G を経由する。G は全タスクの depends に暗黙に含め、表には書かない
5. **holdout ゲートは最初の出題プール実装に含める**: 9/5 に form A がバンクに入った瞬間に Practice へ漏れないよう、`03` §1 の 5 段判定は D1-2 で完全形で実装する(フォーム未存在でも fixture でテスト)
6. **コンテンツの DoD は `07` Step 4 の全工程**: refs 突合 → 曖昧の flagged → 重複統合 → 修正 + 再レビュー 2 周 → active → **オーナー抜き取り(各ドメイン 5 問)** → deploy。C2 / C3a / C5 / C3b-* すべてに適用する。抜き取り時間は各期限の内側に置く。総収録数がドメイン数×5 に満たないタスクは、対象ドメインを 5 ドメインすべてとし各ドメイン **min(5, 当該ドメイン収録数)** を抜き取る(2026-08-24, C3a)。C3a は全 5 ドメインを各 2 問以上収録すること
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

**P フェーズでの読み替え(v1.3)**: §1 の 1(スキーマ凍結 = migration は追加のみ)・3・4・6・8 はそのまま適用する。1 の日付(8/27)と 5 の form A 日付は F の履歴。P の holdout は 5 と同じく **P の最初の form が入る前**に D6-1 / T-exam で exam 別に成立させる。6 の抜き取りは P のドメイン数(CP0 で確定)で読む。

## 3. マイルストーン

F のマイルストーン(M0〜M3)は履歴として残す。M4〜M8 は F 試験後に意味を失ったため削除(§8)。P のマイルストーン(M9〜M15)は受験日 X = 2026-12-12 から逆算した日付(9/28 時点で 75 日)。

| ID | 日付 | イベント | depends | DoD |
|---|---|---|---|---|
| M0 | 8/24 | Phase 0 完了 | S-1, O-1, O-2a, O-2b, O-3, O-4, D0-1, D0-2, D0-3, D0-4, D0-5, C0, C1 | CI 3 ゲート緑 + CI 経由 deploy 1 回成功、両 branch に migration 適用、本番 URL でログイン可能 |
| **M1** | **8/27** | **Drill 開始 = data-protection cutover** | O-4, D1-1, D1-2, D1-3, D1-4, D1-5, D1-6, C2 | 本番 attempt 1 件保存 → 再読込で復元 → 翌日 due に出現。以後 migration は追加のみ |
| M2 | 8/28 | Practice 開始 | M1, D2-1, C3a | Practice で 1 問回答 → attempt(mode=practice)が本番に保存 |
| M3 | 9/6 | 第 1 回フル模試(form A) | D3-1, D3-2, D3-3, D3-4, C3b-A, O-5 | 提出完了・レポート表示・attempt 60 行生成・form A 問題が Practice に解放 |
| M9 | 10/18 | P 基盤完了(学習スコープ切替可能・F データ保全) | S-3, D6-1, D6-2, D6-3 | 本番で学習スコープを P のみに切替 → Home のカウントダウン・キューが P 基準。F の本番 export(`/api/export?exam=ccar-f`、`03` §3)が切替前後で内容一致(件数だけでなく行の中身も比較) |
| **M10** | **10/24** | **P Drill 開始** | M9, O-P2, CP2 | P 試験日が設定済み。本番で P カードの attempt 1 件保存 → 再読込で復元 → 翌日 due に出現 |
| M11 | 10/31 | P Practice 開始 | M10, CP3 | P の独立 MCQ で Practice 1 問回答 → attempt(mode=practice, exam=ccar-p)が本番に保存 |
| M12 | 11/21(X-21) | P 第 1 回フル模試(P form A) | M11, D6-4, CP4-A, O-P3 | 提出完了・レポート表示・attempt が form の問題数ぶん生成 |
| M13 | 11/28(X-14) | P 第 2 回フル模試(P form B) | M12, CP4-B, D4-1, D6-5 | 同上。readiness は初回受験のみで判定(F と同じ 85% 基準) |
| M14 | 12/5(X-7) | P 新機能凍結 | M13, CP6, D5-1, O-P4 | 凍結宣言済、以後 bug fix のみ |
| M15 | 12/11(X-1) | P D-1 総ざらい | M14, O-P5 | D-1 モードのキュー提示で P の間違いノート周回完了 |
| – | **12/12** | **CCAR-P 本試験** | | |

D0-6(タスク運用補助ツール)と D0-7(Codex CLI 直接連携)は M0 の depends に含めない: アプリの土台ではなくセッション運用の補助であり、遅延しても M0 の DoD に影響しないため。同じ理由で S-2・D4-4・T-rev(単体)は P マイルストーンの depends に含めない(T-rev は CP6 経由で M14 に効く)。

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
| D0-7 | D | Codex 呼び出しを Claude プラグインの companion 経由から Codex CLI 直接実行へ移行 | D0-6 | 10 §6, README 実装契約 6 | `.claude/skills/` に `codex-companion.mjs` 参照 0 件。未コミット差分レビューと隔離 workspace の敵対的レビューを Codex CLI で各 1 回疎通。`npm test` / `npm run backlog:check` / `npm run task:check` 緑 |
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
| C2 | C | Step 2: 最小フラッシュ 150(weight 比例)→ Step 4 全工程(抜き取り含む)→ deploy | C1, D0-3 | 07 Step 2, 4 | 8/26 までに本番 active 150 件 |
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

v1.3: D4-1 は P でも使う(P は全問独立形式のため、ドメイン別ミニ模試の価値が F より高い)。P の exam 絞り込みを前提にするため depends に D6-1 を追加した。

| ID | Tr | タスク | depends | spec | DoD |
|---|---|---|---|---|---|
| D4-1 | D | ドメイン別ミニ模試(独立 MCQ プールのみ、10〜15 問、abandon 可、**現在の exam のドメインのみ**) | D3-1, D3-3, C5, D6-1 | 01 FR-5, 03 §1 | テスト: フォーム収載問題が候補に 0 件、abandon で status=abandoned、他 exam の問題が候補に 0 件 |
| D4-2 | D | 間違いノート(attempt 導出、3 連続正解卒業、誤答回数順、総ざらい=practice mode) | D2-1, D3-1 | 03 §間違いノート, 05 S-7 | テスト: 誤答→掲載、3 連続正解→消滅、再誤答→復帰。未提出 form 問題が現れない |
| D4-3 | D | Stats 最低限 + `/api/export` + 設定画面(未解決フラグ一覧は現行 rev のみ、ログアウト) | D3-1, D1-6, D0-5 | 05 S-8, S-9; 03 §3 | export JSON に 5 テーブル + 現行 rev フラグのみ。未ログインで 401 |
| D4-4 | D | フラッシュ評価の Next 時保存(評価は Next まで変更可、Next で送信 → ACK で自動的に次問へ) | D1-5, D4-2 | 05 S-3, 03 §書込プロトコル, 04 §モード行列 | machine.test: rated で再評価可 / COMMIT で saving / SAVE_OK で自動 advance / rated 中 FLAGGED で rejected。実機: 解説閲覧後に評価変更 → Next で保存された applied_rating が変更後の値 |
| C5 | C | Step 5: 残フラッシュ(合計 150〜220)+ 独立 MCQ 60〜100 → Step 4 全工程 → deploy | C2, C3a, D0-3 | 07 Step 5 | 9/12 本番反映、validator 重み乖離警告なし |
| C3b-B | C | form B(A の雛形再利用、A と重複なし)→ validator → Step 4 全工程 → deploy | C3b-A | 07 Step 3b | 9/12 本番反映 |

### Phase 4: 9/14–9/19 — 改訂と増強

v1.3: T-rev は P の改訂ループ CP6 の前提として残す。D5-1 は試験日を exam 別に読む形で P の D-1 に使う。C6・C3b-C・D5-2・O-6 は削除(§8)。

| ID | Tr | タスク | depends | spec | DoD |
|---|---|---|---|---|---|
| T-rev | T | rev ライフサイクルテスト(rev++ で旧フラグ superseded、retired は出題除外、exam_session_answer の snapshot rev が deploy 後も不変) | D0-2, D0-4 | 03 §rev のライフサイクル, §question_flag | 存在し CP6 前に green |
| D5-1 | D | D-1 モード(**単独スコープで、その exam の試験日前日**のみ。スコープ F+P では発動しない(`04`): due 選定停止、「間違いノート → low-stability 順」を予算内提示)+ 凍結日〜の推奨行動カード | D1-4, D4-2, D6-1 | 04 §直前期と D-1, 05 S-1 | テスト: JST で P 試験日前日に固定するとキューが仕様順、前々日は通常順。スコープ F+P では P 前日でも通常順。F の試験前日(9/26)には反応しない |

### Phase 5: 9/20–9/26 — 直前期

| ID | Tr | タスク | depends | spec | DoD |
|---|---|---|---|---|---|
| D5-3 | D | **bug fix**: Mock 開始画面・レポートを `(tabs)` route group に移しタブナビを表示。試験中画面は全画面のまま `/mock` へ戻るボタン(未 ACK 保存中はネイティブ disabled) | D3-2, D3-3 | 05 §全体構造, S-5, S-6 | `/mock`・`/mock/report/[id]` でタブナビから Home / Study / Stats へ遷移できる。`/mock/session` にタブは出ず、保存中はクリック・キーボードとも `/mock` へ遷移しない。`npm run typecheck && npm test && npm run build` 緑 |

### Phase 6: 9/28–10/18 — 棚卸しと P の土台

S-3 と CP0 は P 固有の**意味**(試験切替後の F データの扱い、P の模試構造・採点)を決めるため、停止条件(README)に当たる選択はオーナー承認まで TODO(owner) で止める。

**用語(S-3 で確定、2026-09-29)**: 「現在の exam」は単一の exam ではなく**学習スコープ**(`ccar-f` / `ccar-p` / `both`、`01` FR-10・`03` §study_setting)を指す。本書の「現在の exam のみ」は「学習スコープ内の exam のみ」と読む。

| ID | Tr | タスク | depends | spec | DoD |
|---|---|---|---|---|---|
| S-2 | D | F→P 棚卸し: 09 を v1.3 に再編(F 未着手タスクの残置・削除、P タスク追加)、バックログ triage、`task:report` の凍結判定を P 用に移行 | – | 09, 10 §1–2 | `npm test`・`npm run backlog:check`・`npm run task:check` 緑。差分をオーナーが確認 |
| O-P1 | O | CCAR-P 公式 Exam Guide PDF を取得し `ExamGuide/CCAR-P.pdf` に置く — **完了(9/28、commit 3666299)** | – | 02 §CCAR-P | PDF が main に commit 済み |
| O-P2 | O | CCAR-P の受験日を決めて予約し、本書 §3(M9〜M15 の日付)と §6 を実日付で埋める — **受験日 2026-12-12 確定(9/28)、§3 / §6 反映済み** | – | 08 | 予約済み。09 §3 / §6 に日付が入る |
| O-P3 | O | P フル模試 2 回分(120 分)の枠をカレンダー確保(11/21・11/28) | O-P2 | 08 | 2 件登録 |
| S-3 | D | P フェーズの spec 改訂: README 確定事項(「9/27 まで F 固定」の解除)、`01` FR-10(試験切替)、`03`(exam 別の出題プール・フォーム・間違いノート・export)、`04`(試験日の exam 別化、切替後の F カードを queue に出すか)、`05`(試験切替 UI)、`06`(F 本番データの保全)、`07` / `08` の P 版 | S-2 | README, 01 FR-10, 03, 04, 05, 06, 07, 08 | 各 spec に P の仕様が入り(P 模試の構造値は対象外。CP0 の記録をもとに T-pmock で仕様化する)、停止条件に当たる選択はオーナー承認済み(TODO(owner) 0 件) |
| CP0 | C | P の Step 0: Guide 転記(`content/ccar-p/SOURCES.md`)、`02` CCAR-P 節の突合(公式優先)、**模試構造(問題数・ドメイン配分・シナリオ有無・multiple-response の選択数)**・In/Out-of-Scope の記録、F バンクと重なる領域のマップ | O-P1 | 07 Step 0, 02 §CCAR-P | `SOURCES.md` 作成、`02` 更新。P の模試構造は Guide の事実として `SOURCES.md` に記録するまで(`03` §mock_forms への仕様化は採点・スコアに関わる停止条件なので、T-pmock の冒頭でオーナー承認を経て行う) |
| CP1 | C | P の Step 1: `content/ccar-p/syllabus.yaml`(task statement 層は Guide と 1:1)+ オーナー粒度レビュー | CP0 | 07 Step 1, 02 §トピックツリー | topic 数が CP0 で決めた範囲内、オーナー承認 |
| T-exam | T | 学習スコープの状態遷移テスト: exam 別試験日 → `maximum_interval`(試験日通過後は上限なし)、キュー・出題プール・proficiency・間違いノートがスコープ内 exam のみ、スコープ F+P のキュー合成(予算共有・due 古い順・new は exam 別ペースの合計で、F の未導入カードが P の新規枠を消費しない・spent は全 exam で数える)と D-1 非発動、P form の holdout が F の提出状態と独立(**F+P で同名 form の片方だけ提出済み**のケースを含み、holdout 集合と remaining_new が `(exam, form_id)` で正しい)、進行中セッションがスコープ切替後も再開・提出できる、試験日未設定 exam を含むスコープは拒否、スコープ切替が他テーブルを変えない | S-3 | 03 §出題プールの判定順序, 04 | 存在し D6-1 で green |
| D6-1 | D | 多試験コア: 学習スコープの保持(`study_setting`、追加のみ migration)、`CCAR_F_EXAM_DATE_JST` 固定の解消(exam 別試験日・過去試験は上限なし)、holdout 中間集計の `(exam, form_id)` 化、queue / pool / proficiency / 間違いノート / Stats のスコープ絞り込み、`/api/export?exam=` | T-exam | 03, 04, 06 | T-exam green。本番 F データの export が deploy 前後で一致 |
| D6-2 | D | 学習スコープ切替 UI(Home ヘッダ・S-9 設定。F のみ / P のみ / F+P、`both` では exam ラベル) | D6-1 | 05 | 実機: P のみに切替 → カウントダウン・キュー・Stats が P 基準、F+P で両方の due が出る、F のみに戻すと F の履歴と復習が使える |
| D6-3 | D | バンクの複数試験対応: `bankDir` / load・`validate-bank`・audit 系スクリプトを `content/ccar-p/` に対応、CI で両 exam を検証 | S-3 | 03 §1, 06 §バンク静的検証 | 空(または fixture)の P バンクで CI 緑、F の検証結果が不変 |
| D6-6 | D | flash 表の形式規則を「状況設定 0〜3 文 + 問い 1 文」に改め(spec 先行)、`audit:flash` 検査 4 を全 exam 共通で合わせる(B-CP2-3 から昇格) | D6-3 | 07 Step 2 | F / P とも `npm run audit:flash`(active)が OK。違反系のテストが存在し green |

### Phase 7: 10/19–11/28 — P バンクと模試

| ID | Tr | タスク | depends | spec | DoD |
|---|---|---|---|---|---|
| CP2 | C | P 最小フラッシュ 150(weight 比例、ドメイン内では CP0 重なりマップ(`content/ccar-p/SOURCES.md` §8)で F と重ならない目標を優先。F からの流用は新 ID 採番)→ Step 4 全工程 → deploy | CP1, D6-1, D6-3 | 07 Step 2, 4, CCAR-P フェーズ | **10/23** までに本番 active 150 件、validator 重み乖離警告なし |
| CP3 | C | P 独立 MCQ 60〜100(Practice / ドメイン別ミニ模試用、フォーム非収載)→ Step 4 全工程 → deploy | CP1, D6-1, D6-3 | 07 Step 5 | **10/30** 本番反映、全ドメインに収録 |
| T-pmock | T | P 模試テスト: CP0 の模試構造でのフォーム schema・開始時全行生成・提出時 attempt 一括・レポートのドメイン別集計(P のドメイン数・重み) | CP0, S-3 | 03 §mock_forms, §exam_session, §Mock の attempt 生成 | 冒頭で CP0 の記録から `03` §mock_forms に P の構造(問題数・ドメイン配分・選択数)を追記しオーナー承認(停止条件: Mock のスコア)。テストが存在し D6-4 で green |
| D6-4 | D | P 模試対応: `mock_forms` の P 構造、開始・提出・レポート・rehearsal 判定を exam 別に | T-pmock, D6-1, D6-3 | 03, 05 S-5, S-6 | T-pmock green。F form の開始可否・レポートが不変 |
| CP4-A | C | P form A(問題数・配分は CP0)+ `mock_forms.yaml` → validator → Step 4 全工程 → deploy | CP3, D6-4 | 07 Step 3b, 4; 03 §mock_forms | **11/20** 本番反映。遅延時は M12 を後ろ倒し(フラッシュ増産で代替しない) |
| CP4-B | C | P form B(A と重複なし)→ validator → Step 4 全工程 → deploy | CP4-A | 07 Step 3b | **11/27** 本番反映 |
| D6-5 | D | P form A 提出後解放の本番 E2E(`verify:release` の P 対応。B-D3-4-1 の「解放問題への Practice 回答で applied_rating=null」の正の証拠もここで取る) | M12 | 03 §1, 04 | 本番 export で確認(M12 直後) |

### Phase 8: 11/22–12/11 — P 直前期

| ID | Tr | タスク | depends | spec | DoD |
|---|---|---|---|---|---|
| CP6 | C | P の Step 6: export の未解決フラグ → 改訂(editorial=rev++ / それ以外=新 ID + retired)→ deploy | T-rev, D4-3, M12 | 07 Step 6, 03 §rev | P の現行 rev 未解決フラグ 0 件。retired の DB 履歴行が残存 |
| O-P4 | O | 12/5 P 凍結宣言(以後 bug fix のみ) | CP6, D5-1 | 08 | 宣言後の commit が fix のみ |
| O-P5 | O | 12/11 P 間違いノート総ざらい(D-1 モード) | M14, D5-1 | 08, 04 §D-1 | 実施 |

## 5. 依存グラフ(§4 の depends 列から機械生成・全 77 ノード)

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
D0-7 ← D0-6
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
D4-1 ← D3-1, D3-3, C5, D6-1
D4-2 ← D2-1, D3-1
D4-3 ← D3-1, D1-6, D0-5
D4-4 ← D1-5, D4-2
C5 ← C2, C3a, D0-3
C3b-B ← C3b-A
T-rev ← D0-2, D0-4
D5-1 ← D1-4, D4-2, D6-1
D5-3 ← D3-2, D3-3
S-2 ← (なし)
O-P1 ← (なし)
O-P2 ← (なし)
O-P3 ← O-P2
S-3 ← S-2
CP0 ← O-P1
CP1 ← CP0
T-exam ← S-3
D6-1 ← T-exam
D6-2 ← D6-1
D6-3 ← S-3
D6-6 ← D6-3
CP2 ← CP1, D6-1, D6-3
CP3 ← CP1, D6-1, D6-3
T-pmock ← CP0, S-3
D6-4 ← T-pmock, D6-1, D6-3
CP4-A ← CP3, D6-4
CP4-B ← CP4-A
D6-5 ← M12
CP6 ← T-rev, D4-3, M12
O-P4 ← CP6, D5-1
O-P5 ← M14, D5-1
M0 ← S-1, O-1, O-2a, O-2b, O-3, O-4, D0-1, D0-2, D0-3, D0-4, D0-5, C0, C1
M1 ← O-4, D1-1, D1-2, D1-3, D1-4, D1-5, D1-6, C2
M2 ← M1, D2-1, C3a
M3 ← D3-1, D3-2, D3-3, D3-4, C3b-A, O-5
M9 ← S-3, D6-1, D6-2, D6-3
M10 ← M9, O-P2, CP2
M11 ← M10, CP3
M12 ← M11, D6-4, CP4-A, O-P3
M13 ← M12, CP4-B, D4-1, D6-5
M14 ← M13, CP6, D5-1, O-P4
M15 ← M14, O-P5
```

### クリティカルパス(P)

```
Dev    : S-2 → S-3 → T-exam → D6-1 → D6-2 → M9 → M10
           ├ D6-1 + D6-3 → CP2 / CP3(試験別の絞り込みとバンク読込の両方がバンク投入の関門)
           └ D6-1 → D6-4(+ T-pmock ← CP0)→ CP4-A → M12
Content: CP0 → CP1 → CP2 → M10 / CP3 → CP4-A → M12 → CP6 → O-P4 → M14
Owner  : O-P1 / O-P2 は完了済み(9/28)。以後は S-3 / CP0 / CP1 の承認と抜き取りが Owner 側の律速
```

- **P コンテンツの本番投入は D6-1 待ち**: D6-1 前に P バンクを読み込むと、F 前提のキュー・出題プールに P の問題が混ざるため(停止条件: 出題プール・SRS)。CP2 は D6-1(10/11 予定)完了後の 10/12 から着手する
- M12 以降の主経路: M12 → D6-5・CP6 → M13(CP4-B・D4-1)→ O-P4 → M14 → O-P5 → M15

## 6. セッション配分(P フェーズ・9/28–12/11)

受験日 X = 2026-12-12(土)。`task:report` は 1 列目の日付(範囲は開始日)を予定日として読む。F の配分表(8/23–9/26)は §8 に履歴として残す。

| 日 | Owner | Dev / Test | Content |
|---|---|---|---|
| 9/28–10/4 | O-P3, 棚卸し(S-2)の承認 | S-2 → S-3 | CP0 |
| 10/5–10/11 | P の Guide を通読、S-3 の停止条件判断 | T-exam → D6-1, D6-3 | CP0, CP1(+粒度レビュー) |
| 10/12–10/18 | CP1 承認 | D6-2 → **M9**, D4-4 | CP2 |
| 10/19–10/25 | CP2 抜き取り → **P Drill 開始(M10 10/24)** | T-pmock → D6-4 | CP2 deploy, CP3 |
| 10/26–11/1 | CP3 抜き取り → **M11(10/31)** | D4-1, T-rev | CP3 deploy, CP4-A 着手 |
| 11/2–11/15 | 学習 | D5-1 | **CP4-A(最優先)** |
| 11/16–11/20 | CP4-A 抜き取り | bug fix | CP4-A deploy(11/20) |
| 11/21 | **M12(P form A)** | – | – |
| 11/22–11/27 | CP4-B 抜き取り | D6-5(11/22) | CP4-B deploy(11/27), CP6 |
| 11/28 | **M13(P form B)** | – | – |
| 11/29–12/4 | 学習 | bug fix | CP6 deploy |
| 12/5 | O-P4 → **M14** | – | – |
| 12/6–12/10 | 学習 | bug fix のみ | – |
| 12/11 | O-P5 → **M15** | – | – |

遅延時: CP4-A が 11/20 に間に合わなければ M12 を 11/23 に後ろ倒し(フラッシュ増産で代替しない)。M13 が 12/1 を越える場合は CP4-B と M13 を落として M12 → CP6 → M14 に詰める(依存表を先に更新する)。

## 7. 運用ルール

- 新しいセッションは「本書のどの ID に着手するか」を冒頭で宣言し、`npm run task:check <ID>` が READY であることを確認して `npm run task:start <ID>` で始める(完了判定・worktree 規約は `tasks/README.md`)
- DoD を満たさない状態で次の ID に進まない。満たせない場合は TODO(owner) を残して停止する(README 停止条件)
- 日付が遅延した場合は `08` のリスク表(form A → 後ろ倒し等)に従い、本書の depends は変更しない
- **paired task**: テストタスク T-x と直後の実装タスク D-y(T-srs/D1-1、T-holdout/D1-2、T-write/D1-3、T-queue/D1-4、T-mock/D3-1、T-exam/D6-1、T-pmock/D6-4)は、同一 worktree `task/T-x` でテスト先行 → 実装の順に作り、**両方 green の状態で一緒に main に入れる**(§1-2 の red テスト禁止の帰結。T-x 単独では main に入れない)。D-y の `task:start` は行わず、マージ時に両 ID を台帳記録する。T-rev は実装タスクが CP6(コンテンツ)なので paired ではない
- **凍結**: `task:report` は O-P4 または M14 が DONE になったら全候補を `frozen` で除外する(F の 9/20 凍結は F 試験の終了とともに失効)

## 8. F→P 棚卸し記録(v1.3・2026-09-28)

### 残したタスク(未着手・P で使う)

| ID | 残す理由 | v1.3 での変更 |
|---|---|---|
| D4-1 | P は全問独立形式で、ドメイン別ミニ模試がそのまま使える | depends に D6-1 を追加、DoD に exam 絞り込みを追加 |
| D4-4 | フラッシュ評価の UX 改善で、exam に依存しない | なし |
| T-rev | P の改訂ループ(CP6)の前提 | DoD の参照先を C6 → CP6 |
| D5-1 | P の試験前日にも同じ D-1 モードを使う | 試験日を exam 別に読む(depends に D6-1)、DoD を P 試験日基準に |
| M3 | 9/6 の form A 模試は実施済み(D3-4 の証跡)。depends は全 DONE | なし。オーナーが DoD を確認して台帳に `done` を記録する |

### 削除したタスク(ID は再利用しない)

| ID | 内容 | 削除理由 |
|---|---|---|
| C6 | F の Step 6 改訂ループ | F バンクは合格後に改訂しても得がない。P 版は CP6 |
| C3b-C | F form C | F 試験の終了で不要 |
| D5-2 | (任意)ハーフ模試 / Stats チャート | F 期限付きの任意枠。必要ならバックログから新 ID で起こす |
| O-6 | F の 9/20 凍結宣言 | F 試験の終了で失効。P 版は O-P4 |
| O-7 | F の 9/26 総ざらい | 同上。P 版は O-P5 |
| M4〜M8 | F 第 2〜3 回模試・凍結・弱点ミニ・rehearsal・D-1 | F 試験の終了で失効(実施済みのものがあっても台帳には記録しない) |

### F のセッション配分(履歴・8/23–9/26)

| 日 | Owner | Dev / Test | Content |
|---|---|---|---|
| 8/23–8/24 | O-1〜O-5、O-2b | S-1, D0-1〜D0-7, T-srs, T-holdout → M0 | C0, C1, C2 開始 |
| 8/25–8/28 | C2 / C3a 抜き取り、学習開始(M1) | D1-1〜D1-6, T-write, T-queue, D2-1 → M2 | C2, C3a |
| 8/29–9/6 | M3 | T-mock, D3-1〜D3-4 | C3b-A |
| 9/7–9/26 | 学習・模試 | D4-2, D4-3, D5-3 | C5, C3b-B |

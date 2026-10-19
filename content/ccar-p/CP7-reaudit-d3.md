# CP7 再監査: p-d3(Integration)

対象: `content/ccar-p/questions/d3-flash.json` / `d3-mcq.json`。新規・修正はすべて `status: flagged`(rev 1 の新 ID、または既存 ID の rev++)。

## 1. flash

判定は 3 枚 replace(29 枚の約 1 割)、26 枚 keep。

| 旧 ID | 判定 | 理由 | 新 Drill MCQ | 補充 flash |
|---|---|---|---|---|
| p-d3-q016 | replace | 答えが「Customization」の 1 語。用語の想起のみ | p-d3-q601 | p-d3-q030(t5-02。学習データの規模と適合度の見方) |
| p-d3-q019 | replace | ハイブリッド検索の手順(統合→重複排除→上位 K)の列挙の想起 | p-d3-q602 | p-d3-q031(t6-01。BM25 のみで言い換えを取りこぼす状況) |
| p-d3-q022 | replace | 静的 RAG とエージェント型検索の定義の想起 | p-d3-q603 | p-d3-q032(t6-03。巨大データをクエリと head/tail で分析) |
| 他 26 枚 | keep | 状況への適用が要る | - | - |

件数: 旧 live 29 → 新 live 29(retired 3 / 追加 3)。全 topic に live flash 1 枚以上(p-d3 の topic 被覆エラーなし)。

### B-CP2-2 突合(F バンクとの重なり・変わりやすい機能)
- p-d3-q001 と f-d1-q045(subagent の tools 省略時の継承): 観点が違う(P は不要な書込ツールを外す判断)。処置なし。
- p-d3-q026 / q028 と f-d2-q028 / q205(Claude Code の MCP ツール定義の遅延ロード): F は Claude Code の既定動作、P は API のツール数増加と Tool Search の使い分けで観点が違う。処置なし。
- p-d3-q004(Files API は workspace 単位)、q005(authorization_token は呼び出し側の責任)、q008(effort)、q012(テレメトリの既定): 時点で変わりうる仕様。docs の改訂を確認できていないため **defer**。
- そのほかの p-d3 flash に F との強い重なりは見つからなかった(content/ccar-f/questions の grep: BM25 / rerank / Contextual Retrieval / Files API / embedding はヒット 0)。

## 2. 独立 MCQ(q501〜q513 の既存 13 問)

| 旧 ID | 処置 | 変更点 | 新 ID | ID 判定の根拠 |
|---|---|---|---|---|
| q501 | rev 2 | 構造化解説を追加、解説から誤答説明を移動。difficulty 2 のまま | - | 選択肢・正解の意味は不変 |
| q502 | rev 2 | 構造化解説を追加。difficulty 3→2。解説に「権限伝播は原則からの推論」と明記 | - | 意味不変 |
| q503 | rev 2 | 構造化解説を追加。difficulty 3→2。refs に mitigate-jailbreaks と research/prompt-injection-defenses を追加 | - | 意味不変(ref の差し替えのみ) |
| q504 | 新 ID + retired | 誤答 3 つとも弱い(A は「総生成時間が短くなる」という誤前提、B は出力が途中で切れる自滅型、C は即時応答にバッチという非現実的な選択)。誤答を作り直し、stem に「プロンプトは短い」を追加 | q516 | 誤答の差し替えと stem の前提変更 |
| q505 | rev 2 | 構造化解説を追加。difficulty 2 のまま。誤答 D の退け理由を「1 時間は目安で完了は保証されず、24 時間で期限切れ」へ。誤答 C の退け理由を同期料金・バッチとの併用可へ | - | 選択肢の意味は不変(退け理由の表現のみ) |
| q506 | 新 ID + retired | 誤答 B(200 万件を毎日全件人が読む)・D(「sorry」の文字列検索)がありえない誤答。A の「any quality regression」の断定も除去し、B を事前評価セットの夜間再実行、D をユーザー評価の週次レビューに差し替え | q514 | 誤答の差し替え |
| q507 | rev 2 | 構造化解説を追加。difficulty 3→2 | - | 意味不変 |
| q508 | rev 2 | 構造化解説を追加。difficulty 3→2。解説の「省略してはならない」を docs の記述に合わせ、「例が示されている」に弱めた | - | 表現のみ |
| q509 | rev 2 | 構造化解説を追加。difficulty 2→1(固有識別子→語彙検索という知識の適用) | - | 意味不変 |
| q510 | rev 2 | 構造化解説を追加。difficulty 3→2。正解の選択肢と解説から「15 to 20」「150→20」などの数値を除去(時点・実験依存) | - | 数値の除去で概念は不変 |
| q511 | rev 2 | 構造化解説を追加。difficulty 2 のまま | - | 意味不変 |
| q512 | 新 ID + retired | 誤答 D(説明文を長くして挙動を揃える)がありえない誤答。D を「API ゲートウェイ + OpenAPI(各アプリの手書き連携は残る)」に差し替え、正解の位置を A→D に変更。refs に news/model-context-protocol を追加 | q515 | 誤答の差し替え |
| q513 | rev 2 | 構造化解説を追加。difficulty 3→2 | - | 意味不変 |

新規の Select TWO は 6 のとおり。`lifecycle_phase` は D3 に phase-gate 問題がないため設定していない。

### difficulty の最終分布(live 15 問): 1 が 1 問 / 2 が 11 問 / 3 が 3 問(q514、q515、q518)
正解ラベル(単一 13 問): A 3 / B 4 / C 3 / D 3、multi は B+E と A+C。

## 3. バックログ対応

- **B-CP3-1(推論依存)**
  - 解消: q503(直接 ref を 2 件追加)、q511(既存 ref の「LLM API を直接使う」「client tools はアプリ内で実行」で直接裏付けられる)、q512 → q515(news/model-context-protocol の「断片化した統合を単一のプロトコルに置き換える」を追加)。
  - 部分解消: q508(解説を docs の記述に合わせた。「索引を作り直す」は帰結の推論)。
  - **defer**: q502。ユーザー単位の権限伝播を直接述べる台帳内の ref がなく、解説に推論と明記するにとどめた。
- **B-CP3-2(時点で変わる仕様)**: d3 は列挙 ID に含まれない。CP3 配分表に挙がっていた数値依存のうち q510(数値を除去)と q505(退け理由を保証がないという原則に変更)は解消。q507 と q513 は選択肢に数値がなく処置なし。
- **B-CP2-2**: 1 の末尾のとおり。F と強く重なる d3 カードはなく、変わりやすい q004 / q005 / q008 / q012 は defer。

## 4. 新規 Select TWO

- **p-d3-q517**(governance / security、t1-03 と t2-02、difficulty 2): binding constraint は「ディレクトリ掲載は監査の代わりにならないため、承認済みサーバーの管理とトークンの保管をチーム自身の強制できる仕組みで統制する必要がある」。正解は B(ソース管理された承認リスト + チームの検証)と E(環境変数展開による秘密の分離)。
- **p-d3-q518**(障害診断 + 評価設計、t4-01 と t4-02、difficulty 3): binding constraint は「会話内容を保存できないため、内容ではなく構造のトレースで失敗原因を診断し、更新のたびに回帰を継続的に検知する必要がある」。正解は A(構造のトレース)と C(高合格率の能力評価を回帰スイートとして継続実行)。診断と回帰検知で理由が独立している。

## 5. 最終状態の件数
- flash live: 29(retired 3 を除く。全 32 行)
- 独立 MCQ live(retired 除く、flagged 含む): 15(q501〜q518 の 18 行から retired 3 を除く。うち rev 2 の既存 10 問 / 新規 5 問)
- Drill 短問 MCQ: 3(q601〜q603)
- mcq_multi: 2(q517、q518)

## 検証
- `npx tsx scripts/validate-bank.ts`: OK(ccar-p questions 297)
- `audit-flash`(`--status flagged --batch-ids` で新規 3 枚): p-d3 のエラーなし。なお `npm run audit:flash -- --exam ccar-p`(`--status active` 固定)は、新規 flagged の q030〜q032 が「status flagged(期待 active)」になるが想定どおり。他ドメインの topic 被覆エラーは対象外。
- `audit-choice-balance --exam ccar-p --status flagged --file d3-mcq.json`: OK(warnings 0)
- `audit-practice-mcq`: q514〜q518・q601〜q603 のバッチ検査で p-d3 の ID に関するエラーなし(件数エラーは `--counts` の仮値によるもの)。既存 10 問を batch に含めると rev 2 で「新規バッチは rev 1」と出るが想定どおり。

## Step 4 1周目の修正

| 旧 ID | 処置 | 内容 | 新 ID / rev |
|---|---|---|---|
| q516 | 新 ID + retired | 正解が一意でなかった(誤答 D の「最小モデルへ即切替」は reduce-latency の docs が最初に挙げるモデル選択とぶつかる)。stem に「承認済みモデルは変更不可(再審査が間に合わない)」を明記し、対立軸を「同一モデルでの effort・出力長調整 vs 別モデルへ切替」にした。D を断定語に頼らない現実的な誤答(より小さく速いモデルへ切替)に作り直し、解説に「モデル選択も docs の手段だが stem の制約により除外」と追記。正解は B のまま | q519(flagged, rev 1) |
| q502 | editorial | 解説の「confused deputy」を「一般に呼ばれる呼称であり公式 docs の用語ではない」と付記(推論であることは維持) | rev 3 |
| q505 | editorial | stem に「月内に失敗分を再投入する余裕が小さい」を追加し、誤答 D(1 時間を固定の依存とみなす)を強めた。正解・誤答の意味は不変 | rev 3 |
| q510 | editorial | 誤答 A の not_best_ja から正解の手段を示唆する文(軽量なリランキング)を除き、stem の事実(レイテンシの余裕は 1 ステップ分)に結びつけ直した | rev 3 |
| q518 | editorial | 誤答 B と D の退け理由が同一だったため書き分け。B は保存禁止の規則違反、D は実行ごとに結果が変わり再現を保証できない点と回帰検知にならない点 | rev 2 |

- 全カード flagged を維持。q519 の正解は B(q516 と同じ位置)。
- 件数: 独立 MCQ live は 15 のまま(q516 retired / q519 追加)。
- 検証: `validate-bank` OK / `audit-choice-balance` OK(warnings 0)/ `audit-practice-mcq --counts 14,12,15,13,12,12,12` OK(warnings 0)。

## Step 4 2周目の修正

- p-d3-q510(rev 3 から 4、flagged のまま、editorial): 解説の「reranking で絞った上位を渡す構成のほうが、少数だけを渡すより検索失敗率が下がる」は contextual-retrieval 原文(同じ上位 20 件を渡す条件で reranking の有無を比較)と比較対象がずれていた。「reranking を加えた構成は、加えない構成より検索失敗率が下がると報告されている」に直した。選択肢・正解は不変。
- 検証: `validate-bank` OK / `audit-choice-balance` OK(warnings 0)/ `audit-practice-mcq --counts 14,12,15,13,12,12,12` OK(warnings 0)。

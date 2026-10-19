# CP7 再監査レポート: p-d4(Evaluation, Testing & Optimization)

対象: `content/ccar-p/questions/d4-flash.json` / `d4-mcq.json`。編集はこの 2 ファイルと本レポートのみ。refs は台帳(SOURCES.md §12 / §13.2)記載の URL だけを使用。

## 1. flash 表

24 枚すべてを読み、「定義の想起だけ」と明確に言えるものだけを replace とした(上限 1 割 = 2 枚)。残りは状況への適用または理由の説明を求めるため keep。

| 旧 ID | 判定 | 理由 | 新 Drill MCQ ID | 補充 flash ID |
|---|---|---|---|---|
| p-d4-q003 | replace | 「ストリーミング時に関係するレイテンシ指標は?」= TTFT の用語を答えるだけ | p-d4-q601 | p-d4-q025(t1-02: 夜間バッチでは何の運用目標が重要か) |
| p-d4-q022 | replace | 「テレメトリの既定は?」= 既定値・環境変数の暗記 | p-d4-q602 | p-d4-q026(t6-01: 会話本文を読めない制約下で何を監視するか) |
| 上記以外 22 枚 | keep | 状況への適用か理由の説明を求める(q009 の「ほぼ 100%」や q014 の黄金ルールは想起寄りだが、曖昧なので残す) | - | - |

- 件数: 旧 live 24 → 新 live 24(retired 2、追加 2。ID は q001〜q026、全 16 topic に live が最低 1 枚)
- 新 flash は stem「状況 + 問い 1 文」、answer_en 2 行、explanation_ja 3 文。status flagged / rev 1。
- B-CP2-2 の突合: `content/ccar-f/questions` を grep(TTFT・A/B・OTEL・Usage and Cost・prompt caching・cost per completed task・regression・class imbalance など)したが、d4 の flash と強く重なる F カードは見つからなかった(F の Batches API 系 f-d4-q023〜q027・q038・q039 は、p-d4 では q517 の誤答 C に出るだけで論点が別)。重なりによる処置はなし。
- 変わりやすい機能への依存(defer): p-d4-q017(max_tokens とモデルから見える予算)、p-d4-q019(プログラマティックなツール呼出し)、p-d4-q016(新モデルの指示への文字どおりの従い方)、p-d4-q020 / q021(effort の測定値)は、docs の改訂で前提が古くなりうる。確証が持てる誤りはないため処置せず defer(Exam Guide / docs 改訂時に再点検)。p-d4-q022 は replace により退役。

## 2. MCQ 表(独立 MCQ q501〜q511)

構造化解説フィールド(`binding_constraint_ja`、正解でない選択肢すべての `plausible_ja` / `not_best_ja`)は全 live 問に付与。explanation_ja は「正解がなぜ binding constraint を満たすか + 一般原則」に絞った。

| 旧 ID | 処置 | 変更点 | 新 ID | ID 判定の根拠 |
|---|---|---|---|---|
| q501 | 新 ID + retired | difficulty 2 → 2。誤答 C「抽出プロンプトの perplexity」はありえない誤答(品質指標として選ばない)なので、運用指標(throughput / p95)に差し替え。誤答 D の「前回水準が目標」を明確化。正解を D → B に移動 | q512 | 誤答の差し替え・正解ラベルの入れ替え |
| q502 | 新 ID + retired | difficulty 3 → 2。誤答 A の「always means a safer system」は断定語だけで消せるので、「拒否率だけを 99% 以上の単独目標」に差し替え。誤答 B・C は事後・少数レビューの形に整理。正解 B → D | q513 | 誤答の差し替え(禁止パターン: 断定語) |
| q503 | rev++(rev 2) | difficulty 2 → 2。構造化解説を埋め戻し。解説を define-success の引用に結び付けた | - | 追加のみ。選択肢・正解は不変 |
| q504 | rev++(rev 2) | difficulty 3 → 3(複数の制約を同時に満たす採点設計)。構造化解説を埋め戻し。解説を evals の推奨(deterministic / LLM / human)に絞った | - | 追加のみ |
| q505 | rev++(rev 2) | difficulty 3 → 2(制約判断: 変える要素を 1 つに絞る)。構造化解説を埋め戻し | - | 追加と difficulty の付け直しのみ |
| q506 | rev++(rev 2) | difficulty 3 → 2(失敗の原因を分析してから変更する制約判断)。構造化解説を埋め戻し | - | 追加と difficulty の付け直しのみ |
| q507 | 新 ID + retired | 誤答 D「temperature 0」は新しいモデルで設定できない場合があり時点依存(B-CP3-2 に準ずる)なので、「指示に注意喚起を足す」に差し替え。誤答 C の「低スコアでも回答を見せる」(ばかげた表現)を「自己申告の信頼度を併記」に作り直し。正解 B のまま | q514 | 誤答の差し替え(禁止パターン + 時点依存) |
| q508 | rev++(rev 2) | difficulty 2 → 2。構造化解説を埋め戻し。解説から、postmortem の記述として確証の持てない「関連付けが遅れた」の主張を削除し、一般原則に置き換えた | - | 追加と解説表現の修正のみ |
| q509 | rev++(rev 2) | difficulty 3 → 2(失敗コストを含めて比較する制約判断)。構造化解説を埋め戻し。refs に optimizing-for-cost-and-intelligence(台帳 #31)を追加し、解説を "compare models on cost per completed task" の直接引用に変更 | - | 追加・ref 差し替え・difficulty のみ。選択肢と正解は不変 |
| q510 | 新 ID + retired | 誤答 B「全員が検索できる生ログを無期限」と C「ユーザー内容を一切ログに残さない」は現実に選ばない選択肢なので作り直し。正解を「全リクエストの構造的メタデータ + 報告されたセッションに限り本文を統制付きで開く」に変更し、multi-agent research system と postmortem の記述で直接裏付けた(B-CP3-1)。難易度 3。正解 D → D | q515 | 正解の内容・誤答の差し替え |
| q511 | 新 ID + retired | 誤答 B「1 応答ごとに page」は never 的な断定(「no poor answer is ever missed」)で、実運用で選ばないため、暫定の手動エスカレーションに差し替え。正解 C → B に移動。解説は postmortem の sticky routing(全体 0.0004% だが一部は深刻)で直接裏付け | q516 | 誤答の差し替え・正解ラベルの入れ替え |

選択肢の本文は変えていないもの(q503・q504・q505・q506・q508・q509)は rev++ のみで、ユーザーの過去の attempt との整合は保たれる。

### 追加した独立 MCQ(新 ID の q512〜q516 は上表)と Select TWO

| ID | 種別 | topic | 備考 |
|---|---|---|---|
| p-d4-q517 | mcq_multi(5 択) | p-d4-t5-02 | Select TWO(下記 4) |
| p-d4-q518 | mcq_multi(5 択) | p-d4-t4-03 | Select TWO、lifecycle_phase = iteration(下記 4) |

### Drill 短問 MCQ(q601〜)

| ID | topic | 内容 |
|---|---|---|
| p-d4-q601 | p-d4-t1-02 | ストリーミングの応答開始の速さを表す指標 = TTFT(旧 flash q003 の置換) |
| p-d4-q602 | p-d4-t6-01 | Claude Code テレメトリの既定ではプロンプト本文は出力されない(旧 flash q022 の置換) |

mcq_single・4 択・difficulty 1・`eligible_modes: ["drill"]`・status flagged・rev 1。

## 3. バックログ対応

- **B-CP2-2**: d4 の flash に F と強く重なる近接カードは見つからず(上記)。変わりやすい機能への依存は defer(q016 / q017 / q019 / q020 / q021)。解消条件のうち「F 近接」はこのドメインで解消。
- **B-CP3-1**(推論依存): p-d4-q510 は q515 に置換し、正解の核心を multi-agent research system(「会話の内容を監視せずに決定パターンと相互作用の構造を監視」)と postmortem(「エンジニアのアクセスは統制され、フィードバックとして報告されたやり取りが入口」)の原文で直接裏付けた。p-d4-q511 は q516 に置換し、postmortem の sticky routing の記述で「全体の数字は一部の深刻な劣化を隠す」ことを直接裏付けた(スライス単位の設計は原則からの適用と明記)。p-d4-q509 は optimizing-for-cost-and-intelligence の "compare models on cost per completed task" で直接裏付けた。**解消**。
- **B-CP3-2**(時点依存の退け理由): d4 には該当として挙がっていないが、q507 の誤答 D(temperature 0)が新しいモデルで設定できない場合がある点で同類だったため、q514 で原則ベースの誤答に差し替えた。**解消**。
- defer なし(独立 MCQ)。

## 4. 新規 Select TWO

- **p-d4-q517**(t5-02、difficulty 2): 品質の低下を許容できない制約の下で待ちを縮める。binding constraint は「モデルの能力を下げず、出力開始までの待ちとツール呼出しの直列という待ちの構造を変える必要がある」。正解 B(ストリーミング)と E(独立した 3 つの検索をまとめて実行)は別々の待ちに効く。誤答は小型モデル(品質未検証)、バッチ(対話には不向き)、effort 引き下げ(品質低下)。
- **p-d4-q518**(t4-03、difficulty 3、lifecycle_phase = iteration): 運用 4 か月後のモデル移行判断。binding constraint は「説明できない品質の回帰を避けるため、既存の評価でモデルの挙動差を測ることと、旧モデル向けプロンプトの適合を確認することが必要」。正解 B(プロンプト監査)と D(同じ採点で新旧を比較)は別の原因を潰す。誤答はトークン単価の比較、全トラフィックの即時切替、公開ベンチマークへの置換。

## 5. 最終状態の件数

- flash live(retired 除く): 24(全 16 topic に最低 1 枚。総数 26)
- 独立 MCQ live(retired 除く、flagged 含む): 13(rev++ 6 + 新 ID 5 + Select TWO 2。retired は q501 / q502 / q507 / q510 / q511 の 5 件)
- Drill 短問 MCQ: 2
- mcq_multi: 2
- 独立 MCQ の正解ラベル(mcq_single 11 問): A 2 / B 3 / C 3 / D 3 程度に分散(最頻 35% 以下)

## 検証

- `npx tsx scripts/validate-bank.ts`: ccar-p OK(p-d7 の件数 warning は他ドメイン分)
- `npm run audit:flash -- --exam ccar-p`: d4 の指摘は新規 flash q025 / q026 の「status flagged(期待 active)」のみ。flagged で登録する新規カードの既定の挙動で、内容規則違反ではない
- `audit-choice-balance --exam ccar-p --file d4-mcq.json --status flagged`: OK(MCQ 15、warnings 0)

## Step 4 1周目の修正

editorial fix(意味不変)のため rev+1、status は flagged のまま。

- **p-d4-q518**(rev 2): 解説の "Auditing prompts against the model you run now, and again whenever you change models, is a free win" は evals ドキュメントに無いため引用を削除し、「旧モデル向けに足した指示が新モデルでは過剰に働くことがあるため、モデル変更時にプロンプトを見直して評価を再実行する(一般原則)」に置換。"Evals also shape how quickly you can adopt new models" は原文にあるため維持。
- **p-d4-q516**(rev 2): 「0.0004% 未満でも sticky routing で一部が深刻」は Vertex AI の数字との混同だったため 0.0004% の言及を削除し、「全体の割合が小さくても sticky routing により一部のユーザーが繰り返し影響を受けた(例: Claude Code ユーザーの約 30% が少なくとも 1 回)。全体の数字は一部の深刻な劣化を隠す」に修正。
- **p-d4-q602**(Drill): 変更なし(flagged のまま)。誤答 A〜C が実在しない挙動で、D は既定値の暗記(変わりやすい機能)。defer(B-CP2-2 の volatile 扱い)か新 ID 差し替えかはオーナー判断。

## 8. p-d4-q602 の処置(Step 4 完了時・オーナー決定 2026-10-19)

p-d4-q602 は誤答 A〜C が実在しない挙動で、正解は OTEL_LOG_USER_PROMPTS の既定値の暗記(変わりやすい機能)だった。オーナー決定で retired(status のみ変更)。d4 の Drill は q601 の 1 問になる。

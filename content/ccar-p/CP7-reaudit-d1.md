# CP7 再監査報告: p-d1(Solution Design & Architecture)

対象: `content/ccar-p/questions/d1-flash.json` / `d1-mcq.json`。検証は `validate-bank`(OK)、`audit:flash`(新規 3 枚を batch 指定で OK、全 topic 被覆 OK)、`audit-choice-balance`(flagged 17 問 OK、最長=正解 1 問)。

## 1. flash 表

26 枚を全件確認した。大半は stem が状況つきで、定義の想起だけのカードは 3 枚(約 11%)に絞った。

| 旧 ID | 判定 | 理由 | 新 Drill MCQ | 補充 flash |
|---|---|---|---|---|
| p-d1-q005 | replace | RAG で実行時にどの chunk を足すかを答える純粋な想起(状況への適用が不要) | p-d1-q602 | p-d1-q028(t2-01。chunk が文脈を失う問題と Contextual Retrieval) |
| p-d1-q010 | replace | augmented LLM の構成要素(retrieval / tools / memory)を列挙するだけ | p-d1-q601 | p-d1-q027(t3-01。クエリとツール呼出しを固定する設計が未使用にする能力) |
| p-d1-q015 | replace | 自律 agent の安全策(サンドボックスでのテスト + ガードレール)の列挙の想起 | p-d1-q603 | p-d1-q029(t3-03。各ステップで ground truth を得る) |
| 上記以外の 23 枚 | keep | 状況つきで、適用または判断が要る(曖昧なものは残した) | - | - |

- 旧 flash が 3 枚 retired(status のみ変更)になった。
- live 数は 26 から 26(26 − 3 + 3)。
- 全 18 topic に live の flash が 1 枚以上ある。p-d1-t2-01 は旧 q005 のみだったが、q028 で補った。
- 新 flash(q027〜q029)は status flagged、rev 1、difficulty 2。形式は audit-flash を通過した。

### B-CP2-2 の突合(F の `f-d1-q034/035`、`f-d5-q011/012` と照合)

| 対象 | 判定 | 処置 |
|---|---|---|
| p-d1-q022(静的 vs 動的分解) | f-d1-q035(動的分解を選ぶ場面)と事実の核が近い。独立 MCQ の p-d1-q509 とも同じ概念 | defer。p-d1-t5-02 の唯一の flash であり、差し替えるなら新 ID + retired の内容変更になる。F との混同の兆候(学習ログ)があるまで処置しない |
| p-d1-q020(rainbow deployments) | F に該当カードなし(grep で確認) | 処置なし(解消) |
| p-d1-q023(分割の基準) | F の f-d1-q034/035 と観点が違い、重なりは弱い | 処置なし |
| p-d1-q016 / q006(docs 現行仕様に寄る機能) | モデル戦略(optimizing-for-cost)と構造化出力の stop_reason に依存 | defer。docs 改訂を確認できていない |

## 2. 独立 MCQ 表(q501〜q512)

構造化解説フィールドは 12 問すべてに埋め戻した。ただし q502 と q512 は retired にしたため、新 ID 側に付けた。正解でない選択肢すべてに plausible_ja / not_best_ja を書き、explanation_ja は「正解がなぜ binding constraint を満たすか + 一般原則」に絞った。

| 旧 ID | 処置 | 変更点 | 新 ID | ID 判定の根拠 |
|---|---|---|---|---|
| q501 | rev++(2) flagged | 構造化解説を追加。難易度 2 のまま | - | 選択肢の意味は不変 |
| q502 | 新 ID + retired | 難易度 2 のまま。誤答 D の「計測を launch まで省く」はありえない誤答に近いため、「パイロット利用者の苦情で品質を判断する」に作り直し。正解を A に移動。A の本文も短縮 | q513 | 誤答の差し替えは選択肢の意味が変わる |
| q503 | rev++(2) flagged | 構造化解説を追加。refs に building-effective-agents を追加(B-CP3-1) | - | 選択肢の意味は不変 |
| q504 | rev++(2) flagged | 構造化解説を追加。`lifecycle_phase: iteration`(本番運用 3 か月後)。D の英文を短縮(意味は同じ、バランス調整) | - | 表現のみ |
| q505 | rev++(2) flagged | 構造化解説を追加 | - | 選択肢の意味は不変 |
| q506 | rev++(2) flagged | 構造化解説を追加 | - | 選択肢の意味は不変 |
| q507 | rev++(3→2) flagged | 構造化解説を追加。条件が複数あっても単一の概念の適用なので 2 に下げた。A の英文を延ばした(バランス調整、意味は同じ) | - | 表現のみ |
| q508 | rev++(3→2) flagged | 構造化解説を追加。難易度を 3 から 2 に下げた(1 つの概念の判断) | - | 選択肢の意味は不変 |
| q509 | rev++(2) flagged | 構造化解説を追加。A は、監査の再現性が最優先なら正しい、という plausible_ja を明記 | - | 選択肢の意味は不変 |
| q510 | rev++(2) flagged | 構造化解説を追加。refs に driving-ai-transformation を追加 | - | 選択肢の意味は不変 |
| q511 | rev++(2) flagged | 構造化解説を追加。`lifecycle_phase: discovery`(展開前の ROI 見積もり)。refs に cost-visibility と estimating-productivity-gains を追加(B-CP3-1)。A の末尾の「and maintenance」を削除(バランス調整。レビュー工数を含む総コストという意味は残した) | - | 表現と refs のみ |
| q512 | 新 ID + retired | 誤答が「SLA を平均に読み替える」「遅い要求を再試行する」「拡張推論で待ちを延ばす」で、ありえない誤答の禁止パターンに近い。誤答を「夜間バッチ」(stem の「数分前の取引」で退ける)、「拡張推論」、「共通 prefix のキャッシュ」に作り直し、stem に事実を追加。難易度は 2 | q514 | 誤答の差し替えと stem の前提変更 |

q513 と q514 は status flagged、rev 1。

## 3. バックログ対応

- **B-CP2-2**: 上記のとおり。q020 は F との重なりがないことを確認した。q022 とモデル戦略・構造化出力の 2 枚は defer。
- **B-CP3-1(推論依存)**
  - q503: refs に building-effective-agents を追加し、プログラムによるゲートで検証して人にも回す点を直接の裏付けにした。schema が算術関係を表せない点は推論として残した。
  - q511: refs に cost-visibility と estimating-productivity-gains を追加し、レビュー工数を含める点を裏付けた。
  - q508: 解説で、ツール失敗の通知とチェックポイントは ref に直接ある、失敗分だけの再実行は適用、と区別した。
  - 上の 3 問は「ref で直接支える部分」と「適用・推論の部分」を explanation_ja で分けて書いた。推論部分が完全には消えていないため、部分解消として扱う。
  - q505 は推論が残る(どのデータにどの拡張を当てるかの対応付け)。defer。
- **B-CP3-2**: p-d1 の該当は q508 だけ(F の f-d5-q012 と概念が近い)。正解の形を分けていることを再確認し、処置なし。ほかに、時点で変わる製品仕様を誤答の退け理由に使っている問題は p-d1 に無かった。q514 は製品仕様に頼らず、stem の事実と原則で誤答を退けている。

## 4. 新規 Select TWO

| ID | binding constraint | 2 つの正解 |
|---|---|---|
| p-d1-q515(難易度 3、t3-03 + t3-02) | 9 割は手順と承認順序をコードで固定して監査可能にする。事前に列挙できない 1 割だけを別経路で扱う。この 2 つの性質の異なる要件が混在する | B(コードで定義した workflow)と E(分類して例外を人のチェックポイントつきで調べさせる) |
| p-d1-q516(難易度 2、t4-02 + t5-03) | 調査の重複は指示の曖昧さ、lead の文脈の圧迫は成果物の受け渡し方式が原因で、別々の対処が要る | A(目的・形式・ツール・境界を指示する)と C(外部保存 + 軽量な参照) |

どちらも eligible_modes は ["mock","practice"]、5 択、status flagged、rev 1。誤答 3 つすべてに plausible_ja / not_best_ja を書いた。

## 5. 最終状態の件数

- flash live(retired 除く): 26(retired は 3)
- 独立 MCQ live: 14(q501、q503〜q511、q513〜q516。retired は q502 と q512 の 2)
- Drill 短問 MCQ: 3(q601〜q603)
- mcq_multi: 2(q515、q516)
- 正解ラベル(独立 mcq_single の live 12 問): A 3 / B 3 / C 3 / D 3
- 参考: `audit-practice-mcq` では p-d1 の独立 MCQ live 14 件が「期待 0」と出る。`--counts 0,...` を渡したことによる想定内の差異で、p-d1 の ID・帯に関するエラーは無い。

## 6. Step 4 1周目の修正

レビュー指摘 4 件に対応した。status は全カード flagged のまま(retired にした旧カードを除く)。

| 旧 ID | 指摘 | 処置 | 新 ID |
|---|---|---|---|
| p-d1-q503 | 誤答 A〜C が断定句だけで消去できる | 誤答を「検査が部分的」な現実的な型に作り直した(A: 形式の検査 + 月次の抽出監査 / B: 別の Claude 呼出しによる再確認 + JSON 解析のみ / C: スキーマ + 必須項目の確認だけ)。意味が変わるため新 ID、旧は retired。構造化解説を新カードに付与 | p-d1-q517(rev 1、正解 D) |
| p-d1-q514 | 誤答 D の not_best_ja が stem の事実に結びつかない | stem に「プロンプトの大半は顧客ごとに異なる口座履歴で、共通なのは短い指示文だけ」を追加し、D の not_best_ja をそれに結びつけた。C の not_best_ja に拡張推論の仕組み(応答前の思考トークン)を入れ、refs に extended-thinking を追加。新 ID、旧は retired | p-d1-q518(rev 1、正解 A) |
| p-d1-q515 | 誤答 D の基準 "flawless" が非現実的 | "acceptable against the rubric" に変更(意味不変の editorial fix) | p-d1-q515(rev 1 → 2) |
| p-d1-q602(Drill) | 誤答 B/C/D がありえない | stem に具体的な質問(Acme Corp の 2025 年 Q2 の営業利益率)を加え、誤答を現実の候補(キーワード一致のみ / 質問と無関係に最大の chunk / 全 chunk の事前要約)に変更。新 ID、旧は retired | p-d1-q604(rev 1、正解 A) |

### 最終件数

- flash live: 26(変更なし。retired は 3)
- 独立 MCQ live: 14(q501、q504〜q511、q513、q515〜q518。retired は q502、q503、q512、q514 の 4)
- Drill 短問 MCQ live: 3(q601、q603、q604。retired は q602)
- 正解ラベル(独立 mcq_single の live 12 問): A 3 / B 3 / C 3 / D 3(q517 は D、q518 は A で、置き換え前と同じ)
- 検証: validate-bank OK、audit-choice-balance OK(最長=正解 2、警告 0)、audit-practice-mcq OK(警告 0)

## 7. Step 4 2周目の修正

| ID | 指摘 | 処置 | rev |
|---|---|---|---|
| p-d1-q517 | A の not_best_ja と binding_constraint_ja が stem に無い前提(支払いは取り消せない、refusal / max_tokens)に依存 | stem に "Payments cannot be recalled once sent." を追加。binding_constraint_ja から stem に無い refusal / max_tokens を外し、「取り消せない」「スキーマ準拠でも合計の整合は保証されない」に絞った。refusal / max_tokens は docs 事実として C の not_best_ja と explanation_ja に残した | 1 → 2 |
| p-d1-q604(Drill) | 誤答 D の解説が「限られたプロンプトに収まらない」と矛盾(短い要約なら収まる) | 解説を「短い要約では個別の数値(営業利益率)が失われ、質問に答えられない」に絞った | 1 → 2 |

editorial 変更のため ID は据え置き、status は flagged のまま。

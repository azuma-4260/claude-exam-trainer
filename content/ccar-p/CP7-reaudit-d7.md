# CP7 再監査報告: p-d7

## 1. flash

| 旧 ID | 判定 | 理由 | 新 Drill MCQ | 補充 flash |
|---|---|---|---|---|
| p-d7-q008 | replace | 「エラーが断続的か常時か」を答えるだけの定義想起 | p-d7-q601 | p-d7-q011(t3-01。ログを claude -p にパイプして原因説明を得る適用型) |
| q001〜q007, q009, q010 | keep | 状況への適用を要する(曖昧なものは残した) | - | - |

- live: 10 → 10(q008 retired、q011 追加)。全 8 topic に live の flash が残る
- 補充 flash を F の Explore subagent 系(f-d3-q019/020/038)と重ねないため、subagent 委譲でなくパイプ利用を選んだ(根拠: common-workflows「Pipe Claude into scripts」を取得して確認)
- B-CP2-2 突合: d7 の flash に F と強く重なる近接カード、時点で変わる機能への依存は確認できなかった。F にある .mcp.json 系(f-d2-q019/035)・managed 系とは観点が異なる(p-d7-q002 は claude -p でのプロンプト不在、q003 は deny の上書き不可)。処置なし

## 2. 独立 MCQ

| 旧 ID | 処置 | 変更点 | 新 ID | ID 判定の根拠 |
|---|---|---|---|---|
| q501 | rev++(2) | 構造化解説を埋め戻し。difficulty 3→2(単一知識で解ける) | - | 選択肢の意味は不変 |
| q502 | rev++(2) | 同上。difficulty 2 のまま。解説の「推論」注記を削除 | - | 同上 |
| q503 | rev++(2) | 同上。difficulty 3 のまま | - | 同上 |
| q504 | rev++(2) | 同上。difficulty 2 のまま | - | 同上 |
| q505 | 新 ID + retired | 誤答 A「every task, including one-line fixes」が断定語で消せるため、対象限定の plan mode 案に差し替え。正解を C→D に | q511 | 誤答の意味が変わる |
| q506 | rev++(2) | 構造化解説を埋め戻し。difficulty 3 のまま | - | 選択肢の意味は不変 |
| q507 | rev++(2) | 同上。difficulty 2 のまま | - | 同上 |
| q508 | 新 ID + retired | 誤答 D「regardless of cause」の書き直し案はありえない誤答。再現がない初動なら妥当な「症状のみ + 非決定要素の走査」案に差し替え。正解を B→C に | q512 | 誤答の意味が変わる |
| q509 | rev++(2) | 構造化解説を埋め戻し。difficulty 3→2 | - | 選択肢の意味は不変 |
| q510 | 新 ID + retired | 誤答 A「権限確認を外した復旧」・B が危険でありえない。stem に「不可逆な DB 移行で rollback 不可」「全本番変更にピアレビュー」を追加。正解を ref(playbook の段階的対応・PR 経由)で直接裏付けられる内容に変更。難易度 3、正解 D→B | q513 | stem の前提・正解の意味が変わる |
| (追加) | 追加 Select TWO | 5 択・正解 A,D | q514 | 下記 4 |
| (追加) | 追加 Select TWO | 5 択・正解 A,B | q515 | 下記 4 |

- 正解ラベル(単一問): A3 / B3 / C2 / D2
- audit:choices(ccar-p、d7、status flagged)は OK(q514 でカンマの偏りが出たため文言を修正済み)

## 3. バックログ対応

- B-CP3-1: p-d7-q510 を q513 に置換し、ref(the-ai-native-sdlc-playbook)で直接裏付けられる内容にしたため解消。p-d7 の他の問題は「推論」を前提にしない。
- B-CP3-2: d7 に該当する問題はなし(対象は d1/d2/d5)。
- B-CP2-2: d7 の flash に該当なし(上記)。defer なし。
- 補足: q513 の「PR 経由の段階的対応」は playbook の記述(agent 向けの tier)を診断中のエンジニア運用に当てはめた類推を含む。解説にその旨が読み取れる書き方にしたが、気になれば defer 候補。

## 4. 新規 Select TWO

- p-d7-q514(t1-03、難易度 2): 上書きできない強制(managed settings の deny)と機械可読な証跡(OTel イベント)の 2 要件
- p-d7-q515(t2-02、難易度 3): 無人かつ外部由来のコードを扱う CI で、権限の読み取り限定(--allowedTools)と作者から独立したレビュー(別セッション)

## 5. 最終状態

- flash live: 10
- 独立 MCQ live(retired 除く、flagged 含む): 12(q501〜q504, q506, q507, q509, q511〜q515。うち mcq_multi 2)
- Drill 短問: 1(q601)
- mcq_multi: 2
- 備考: validate-bank の p-d7 weight 乖離 WARN は従前から。flash の status 検査は --status flagged だと active が NG になる仕様のため d7 の active 分は無視した

## 6. Step 4 1周目の修正

| ID | 扱い | 内容 |
|---|---|---|
| p-d7-q515 | retired | 旧 C が CI の新規セッションで成立せず、旧 B が過剰(--allowedTools は事前承認であり制限ではない)だった。誤答の意味が変わるため新 ID に置換 |
| p-d7-q516 | 新規 flagged rev 1 | q515 の置換。B を「読み取り系のみ事前承認し、承認が必要な書き込み系は無人実行で拒否される」に弱め、C を「同じ job 内で作者セッションを --resume して再利用」に変更。正解 A,B と構造は q515 と同じ。D(plausible_ja に隔離コンテナ条件あり)は維持 |
| p-d7-q601 | rev 2(editorial、flagged) | stem を「エラーの挙動を問う」形にして A(場所の情報)が排除されるようにし、解説から根拠のない「先入観になりやすい」を削除。「場所の情報は挙動とは別の種類」に修正 |
| p-d7-q011 | rev 2(editorial、flagged 維持) | 解説の出典を common-workflows から headless(Pipe data through Claude)に修正し、「文脈を消費する」という理屈を削除。refs は headless のみ |

- 独立 MCQ live は q516 が q515 を置換するため 12 のまま(mcq_multi 2)。

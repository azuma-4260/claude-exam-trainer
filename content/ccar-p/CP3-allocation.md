# CP3 配分表(07 Step 5 相当・CCAR-P 独立 MCQ・2026-09-30)

CP3 = P の独立 MCQ(Practice / ドメイン別ミニ模試用、フォーム非収載)。`07` §CCAR-P Step 5 と `09` CP3 行(60〜100、全ドメインに収録)に従う。
生成量と配分はオーナー決定(2026-09-30): **76 問**・**mcq_single のみ**(multiple-response の選択数は Guide に記述が無く、T-pmock で模試形式と合わせて決める)。

## 適用ルール

1. **proficiency ルールは適用しない**: `07` Step 5 の「proficiency 下位トピックに difficulty 3 を優先 / 正答率 90% 超トピックには追加しない」は P の attempt が 0 件(P Drill 開始は 10/24)のため判定データが無い。F の C5 のような export ベースの配分は行わない
2. **ドメイン配分 = 重み比例 + 下限 10**: 重み 17/13/19/16/14/14/7 × 70 の largest remainder は 12/9/13/11/10/10/5。`01` FR-5 のドメイン別ミニ模試は独立 MCQ プールのみから 10〜15 問で構成するため、全ドメインでミニ模試を組めるよう下限を 10 とし **12 / 10 / 13 / 11 / 10 / 10 / 10 = 76**(D2 +1、D7 +5)。D2・D5・D6・D7 は 10 問ちょうどなので、当面そのドメインのミニ模試は毎回同じ問題集合になる(順序のみ変わる)
3. **ドメイン内の topic 配分**: 38 task statement すべてに最低 1 問(syllabus の task statement 数 6/5/8/6/5/5/3 はすべて配分以下)。残り 38 問は `SOURCES.md` §8 の重なりマップで F と重ならない(「なし」「部分」)目標の中核 topic を優先。D7 は topic が 8 しか無いため p-d7-t1-03 と p-d7-t3-01 に 2 問
3a. **Step 4 での topic 差し替え(2026-09-30)**: p-d2-t5-02 / p-d3-t7-03 / p-d6-t2-01 の 3 topic は、CP2 の調査(B-CP2-1、CP2 worktree で起票・オーナー判断待ち)で許可ソース内に中核を裏付ける本文が無いと判明した。CP3 は全 topic の網羅を要件としないため、この 3 topic に割り当てていた p-d2-q510 / p-d3-q512 / p-d6-q503 を同じ task statement 内の裏付けのある topic(p-d2-t5-03 / p-d3-t7-01 / p-d6-t2-02)へ差し替えて書き直した。task statement 38 本の被覆は維持。B-CP2-1 の結論で syllabus が改訂されても CP3 の問題は影響を受けない
4. **重なる目標の扱い**: 「強」「部分」の目標(1.4 / 1.5 / 3.1 / 5.3 / 7.1 / 7.2 など)は F の MCQ・flash と同じ具体例を使わず、architect 視点(ビジネス要件・トレードオフ・組織)で問う
5. **正解ラベル**: A〜D を各 19 問に固定し、ドメイン内でも 1 ラベル 1〜4 問に収める(下表の「正解」列。seed 固定の乱数で割当)。「最長の選択肢が正解」は 34 問(45%)以下
6. **validate-bank の重み乖離(±30% で warning)**: 乖離は flash を含む P 全問で計算される。独立 MCQ 76 問だけでは p-d7 が +88%(10 問 / 期待 5.3)で warning になるが、CP2 の最小フラッシュ 150(重み比例 26/20/28/24/21/21/10)と合算すると p-d7 は +26% で閾値内(他ドメインも ±5% 以内)。CP3 が CP2 より先に merge された場合は CP2 merge まで p-d7 の warning が残る(warning のみで CI は失敗しない)

## 固定値(全 76 問)

`type: mcq_single` / 4 択 A〜D / `scenario_id: null` / `eligible_modes: ["mock","practice"]` / `srs_eligible: true` / `status`: 生成時 `"flagged"` → Step 4 完了で `"active"`(現行は全 76 問 active。追加・作り直す問題は `flagged` で登録し Step 4 を経て active にする)/ `rev: 1` / `secondary_topic_ids` は必要時のみ / difficulty 既定 2(複数制約のトレードオフを問うものは 3)/ refs は `SOURCES.md` §13.2(CP3 節の台帳。CP2 の §12 台帳も可)の URL のみ。ID 帯は `SOURCES.md` §13.1(q501〜 連番)。ファイルは `content/ccar-p/questions/d<N>-mcq.json`

## 問題ごとの割当

### p-d1 Solution Design & Architecture(重み 17% → 12 問)

| ID | primary topic | 正解 |
|---|---|---|
| p-d1-q501 | p-d1-t1-01 | C |
| p-d1-q502 | p-d1-t1-03 | B |
| p-d1-q503 | p-d1-t2-02 | D |
| p-d1-q504 | p-d1-t2-03 | D |
| p-d1-q505 | p-d1-t3-01 | C |
| p-d1-q506 | p-d1-t3-03 | B |
| p-d1-q507 | p-d1-t4-01 | D |
| p-d1-q508 | p-d1-t4-03 | C |
| p-d1-q509 | p-d1-t5-02 | B |
| p-d1-q510 | p-d1-t6-01 | B |
| p-d1-q511 | p-d1-t6-02 | A |
| p-d1-q512 | p-d1-t6-03 | D |

### p-d2 Claude Models, Prompting & Context Engineering(重み 13% → 10 問)

| ID | primary topic | 正解 |
|---|---|---|
| p-d2-q501 | p-d2-t1-01 | C |
| p-d2-q502 | p-d2-t1-02 | A |
| p-d2-q503 | p-d2-t1-03 | D |
| p-d2-q504 | p-d2-t2-02 | B |
| p-d2-q505 | p-d2-t2-03 | A |
| p-d2-q506 | p-d2-t3-02 | C |
| p-d2-q507 | p-d2-t3-03 | A |
| p-d2-q508 | p-d2-t4-02 | B |
| p-d2-q509 | p-d2-t5-01 | B |
| p-d2-q510 | p-d2-t5-03 | A |

### p-d3 Integration(重み 19% → 13 問)

| ID | primary topic | 正解 |
|---|---|---|
| p-d3-q501 | p-d3-t1-02 | B |
| p-d3-q502 | p-d3-t2-01 | A |
| p-d3-q503 | p-d3-t2-03 | D |
| p-d3-q504 | p-d3-t3-01 | D |
| p-d3-q505 | p-d3-t3-02 | B |
| p-d3-q506 | p-d3-t4-02 | C |
| p-d3-q507 | p-d3-t5-01 | C |
| p-d3-q508 | p-d3-t5-02 | D |
| p-d3-q509 | p-d3-t6-01 | A |
| p-d3-q510 | p-d3-t6-02 | B |
| p-d3-q511 | p-d3-t7-02 | C |
| p-d3-q512 | p-d3-t7-01 | A |
| p-d3-q513 | p-d3-t8-03 | A |

### p-d4 Evaluation, Testing & Optimization(重み 16% → 11 問)

| ID | primary topic | 正解 |
|---|---|---|
| p-d4-q501 | p-d4-t1-01 | D |
| p-d4-q502 | p-d4-t1-03 | B |
| p-d4-q503 | p-d4-t2-01 | C |
| p-d4-q504 | p-d4-t2-02 | A |
| p-d4-q505 | p-d4-t3-01 | C |
| p-d4-q506 | p-d4-t3-02 | C |
| p-d4-q507 | p-d4-t4-02 | B |
| p-d4-q508 | p-d4-t4-03 | D |
| p-d4-q509 | p-d4-t5-03 | A |
| p-d4-q510 | p-d4-t6-01 | D |
| p-d4-q511 | p-d4-t6-02 | C |

### p-d5 Governance, Safety & Risk Management(重み 14% → 10 問)

| ID | primary topic | 正解 |
|---|---|---|
| p-d5-q501 | p-d5-t1-01 | D |
| p-d5-q502 | p-d5-t1-03 | A |
| p-d5-q503 | p-d5-t2-02 | B |
| p-d5-q504 | p-d5-t2-03 | D |
| p-d5-q505 | p-d5-t3-02 | C |
| p-d5-q506 | p-d5-t4-01 | A |
| p-d5-q507 | p-d5-t4-02 | D |
| p-d5-q508 | p-d5-t4-03 | B |
| p-d5-q509 | p-d5-t5-01 | D |
| p-d5-q510 | p-d5-t5-02 | A |

### p-d6 Stakeholder Communication & Lifecycle Management(重み 14% → 10 問)

| ID | primary topic | 正解 |
|---|---|---|
| p-d6-q501 | p-d6-t1-01 | B |
| p-d6-q502 | p-d6-t1-03 | D |
| p-d6-q503 | p-d6-t2-02 | A |
| p-d6-q504 | p-d6-t2-02 | C |
| p-d6-q505 | p-d6-t3-01 | D |
| p-d6-q506 | p-d6-t3-02 | A |
| p-d6-q507 | p-d6-t4-01 | C |
| p-d6-q508 | p-d6-t4-02 | C |
| p-d6-q509 | p-d6-t5-02 | C |
| p-d6-q510 | p-d6-t5-03 | B |

### p-d7 Developer Productivity & Operational Enablement(重み 7% → 10 問)

| ID | primary topic | 正解 |
|---|---|---|
| p-d7-q501 | p-d7-t1-01 | A |
| p-d7-q502 | p-d7-t1-02 | A |
| p-d7-q503 | p-d7-t1-03 | D |
| p-d7-q504 | p-d7-t1-03 | B |
| p-d7-q505 | p-d7-t2-01 | C |
| p-d7-q506 | p-d7-t2-02 | C |
| p-d7-q507 | p-d7-t2-03 | B |
| p-d7-q508 | p-d7-t3-01 | B |
| p-d7-q509 | p-d7-t3-01 | A |
| p-d7-q510 | p-d7-t3-02 | D |

## 新規 ID(監査コマンド用。セッション B は同じ集合に `--status active` を適用する)

生成日 2026-09-30。生成時は全件 `status: flagged` / `rev: 1`、Step 4 完了後は全件 `status: active` / `rev: 1`。独立 MCQ 76 件(`--counts 12,10,13,11,10,10,10`):

```
p-d1-q501,p-d1-q502,p-d1-q503,p-d1-q504,p-d1-q505,p-d1-q506,p-d1-q507,p-d1-q508,p-d1-q509,p-d1-q510,p-d1-q511,p-d1-q512,p-d2-q501,p-d2-q502,p-d2-q503,p-d2-q504,p-d2-q505,p-d2-q506,p-d2-q507,p-d2-q508,p-d2-q509,p-d2-q510,p-d3-q501,p-d3-q502,p-d3-q503,p-d3-q504,p-d3-q505,p-d3-q506,p-d3-q507,p-d3-q508,p-d3-q509,p-d3-q510,p-d3-q511,p-d3-q512,p-d3-q513,p-d4-q501,p-d4-q502,p-d4-q503,p-d4-q504,p-d4-q505,p-d4-q506,p-d4-q507,p-d4-q508,p-d4-q509,p-d4-q510,p-d4-q511,p-d5-q501,p-d5-q502,p-d5-q503,p-d5-q504,p-d5-q505,p-d5-q506,p-d5-q507,p-d5-q508,p-d5-q509,p-d5-q510,p-d6-q501,p-d6-q502,p-d6-q503,p-d6-q504,p-d6-q505,p-d6-q506,p-d6-q507,p-d6-q508,p-d6-q509,p-d6-q510,p-d7-q501,p-d7-q502,p-d7-q503,p-d7-q504,p-d7-q505,p-d7-q506,p-d7-q507,p-d7-q508,p-d7-q509,p-d7-q510
```

検証コマンド(現行は `active`。セッション A 時点は `flagged` で実行):

```
npm run validate-bank
npm run audit:choices -- --exam ccar-p --status active
npx tsx scripts/audit-practice-mcq.ts --exam ccar-p --counts 12,10,13,11,10,10,10 --status active --batch-ids <上の 76 件>
```

## セッション A → B 申し送り(2026-09-30)

生成は 7 ドメイン並列(ドメインごとに独立した生成エージェント。各問の ref は取得して本文を確認したうえで作成)。セッション A での確認: validate-bank OK(ccar-p 76 問、warning は上記 6 の p-d7 のみ)/ `audit:choices --exam ccar-p --status flagged` OK(最長=正解 23/76 = 30%)/ `audit:practice --exam ccar-p --status flagged --batch-ids <76 件>` OK / 正解ラベル A〜D 各 19 / topic・正解は割当表と全件一致(p-d4-q506 は生成時に C/D が逆だったため選択肢と解説の C/D を入れ替えて割当表に合わせた)。

Step 4 の refs 突合で**重点的に見る問題**(生成エージェントの自己申告。正解の核心が ref の字句ではなく原則からの設計判断、または世代固有の事実に依存):

| 観点 | 問題 |
|---|---|
| 世代固有の事実・モデル名・数値への依存(07 原則 / SOURCES §4 に照らして要確認) | p-d2-q503(新しい世代で手動 budget_tokens が 400)、p-d2-q501(解説のモデル名)、p-d3-q505(batch の件数・期限)、p-d3-q507(文脈 50〜100 トークン)、p-d3-q510(正解に上位 150 → 20 の数値)、p-d3-q513(ツール数・10k トークンの閾値)、p-d4-q509(正解に 95%)、p-d5-q506(data residency の地域・Bedrock legacy ページ)、p-d5-q507(HIPAA readiness の設定挙動)、p-d5-q508(正解が「FedRAMP High を支援」という時点依存の認可状況)、p-d6-q510(60 日前通知) |
| 抽出方法 | 上の行は生成エージェントの自己申告に加え、正解の選択肢に数字・モデル名・規制名を含む問題を機械抽出(p-d3-q509 の BM25 は手法名で対象外)。数値が解説にだけ出る問題は対象外 |
| ref が原則までしか支えない | p-d1-q503 / q504 / q510 / q511、p-d2-q504 / q510、p-d3-q502 / q503 / q508 / q511 / q512、p-d4-q502 / q505 / q510、p-d5-q503 / q504 / q505 / q509、p-d6-q503 / q507 / q509、p-d7-q504 / q510 |
| F バンクとの具体例重複を生成時に grep していない | p-d1 全問(他ドメインは生成時に F を grep 済みと申告) |

重複統合は P 内(76 問相互)と F バンク(`content/ccar-f/questions/`)に加え、CP2 の flash が merge 済みならそれとも突合する。

## Step 4(step4-review・2026-09-30)

- **refs 突合**: 全 76 問の ref を独立レビュアーが実取得し、正解の核心と誤答の退け理由を本文で確認。使用 URL 52 件はすべて §13.2 台帳内(未使用の台帳行は CP4 以降の候補として残す)。anthropic.com/research の URL は不使用(許可ソースの解釈は B-CP2-1 でオーナー確認中のため)
- **1 周目**(ドメインごとの独立レビュアー 7 本・生成時の文脈なし): P1 1 件(p-d5-q508: 時点で変わる FedRAMP の認可状況に正解が依存)、P2 21 件(F / P 内の重複、ref に無い主張、docs との食い違い、許可ソース外の URL)。重複の組はどちらを直すか統括者が決め、p-d2-q510 / p-d3-q512 / p-d6-q503 を上記 3a の topic へ差し替え
- **2 周目**(新しいレビュアー 7 本・1 周目の結果を見せない): P1 0 件、P2 8 件。解説の事実誤り(p-d4-q502 の有害/無害の取り違え)と重複を修正し、書き直した問題は新しいレビュアーで再確認(最終確認 3 問 OK)
- **重複統合**: P 内 76 問相互と F バンク(411 問)を突合。同じ具体例で同じ判断を問う組は片方を別状況・別判断に書き直した(同一具体例 0)。CP2 の flash は未 merge のため、CP2 merge 後の突合は CP2 側の Step 4 で行う
- **active 化**: 全 76 問を `status: active`(rev 1 のまま。未公開のため rev++ 不要)。`validate-bank` / `audit:choices`(active、最長=正解 23/76)/ `audit:practice --exam ccar-p --status active --batch-ids <76 件>` 緑
- 見送った指摘は `tasks/backlog/B-CP3-1.md`(推論依存の問題の再点検)・`B-CP3-2.md`(時点依存の docs 記述・軽微な重複)

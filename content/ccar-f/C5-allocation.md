# C5 配分表(07 Step 5・2026-09-03)

判定データ: オーナー提供の `/api/export` JSON(2026-09-03、srs_state 34 行 / attempt 56 行 / 正解 question 28 件)。
`src/lib/queue/proficiency.ts` の `topicProficiencies()` に Date 復元済みの行を渡して topic 別 proficiency を算出し、
attempt から topic 別正答率(primary_topic_id 単位・モード不問)を算出した。生成量はオーナー決定(flash +50 → 200 / 独立 MCQ 70)。

## 適用ルール(07 Step 5)

1. **正答率 90% 超の topic には flash を追加しない**: attempt が 1 件以上あり正答率 > 0.90 の 18 topic を除外
   (f-d1-t1-02 / t1-03 / t2-03 / t4-01 / t4-02 / t5-01、f-d2-t2-01 / t3-03、f-d3-t1-01 / t2-01 / t3-01 / t6-01、
   f-d4-t1-01 / t2-01 / t3-01 / t6-01、f-d5-t1-01 / t4-01)。試行 1〜2 件の 100% も spec どおり除外する
2. **proficiency 下位 topic に difficulty 3 を優先追加**: attempt があり正答率 ≤ 0.90 の topic(proficiency 0.44〜0.85)
   f-d1-t1-01(0.54 / 60%)、f-d1-t2-01(0.85 / 86%)、f-d1-t2-02(0.83 / 80%)、f-d1-t3-01(0.61 / 33%)、
   f-d1-t3-02(0.61 / 33%)、f-d1-t3-03(0.46 / 0%)、f-d2-t1-01(0.53 / 50%)、f-d5-t2-01(0.44 / 0%)
3. 残りは「topic 平均 2〜3 枚」に向け、1 枚しか無い topic を優先して 2 枚へ、その後ドメイン重み比例(54/36/40/40/30)で未学習 topic(proficiency 0.21)を埋める

## flash 追加(+50。ID は各ドメインの既存最大番号 +1 から連番、status=flagged、rev=1)

| ドメイン | 追加 | 到達 | topic(枚数・difficulty) |
|---|---|---|---|
| f-d1 | +14 | 54 | t1-01 ×2(d3)、t2-01(d3)、t2-02(d3)、t3-01 ×2(d3)、t3-02(d3)、t3-03 ×2(d3)、t5-02、t6-01、t6-02、t7-01、t7-02 |
| f-d2 | +9 | 36 | t1-01 ×2(d3)、t1-02、t2-02、t3-01、t3-02、t4-01、t4-02、t4-03 |
| f-d3 | +10 | 40 | t1-02、t1-03、t2-02、t2-03、t4-01、t4-02、t5-02、t5-03、t6-02、t6-03 |
| f-d4 | +10 | 40 | t1-02、t2-02、t3-02、t3-03 ×2、t4-01、t4-02、t5-01、t5-02、t6-02 |
| f-d5 | +7 | 30 | t2-01 ×2(d3)、t3-02、t4-02、t5-01、t6-02、t6-03 |

difficulty の既定は 2(未学習 topic の補充)。ルール 2 の topic は 3。

## 独立 MCQ(70。ID は f-dN-q501〜、`eligible_modes: ["mock","practice"]`、`srs_eligible: true`、`scenario_id: null`)

配分 19 / 13 / 14 / 14 / 10。弱点 topic(ルール 2)は 2 問、その他は 1 問。scenarios.yaml のシナリオには紐付けず、
stem 内に 1〜3 文の文脈を持つ「この要件ならどの構成か」型。生成制約: 対応する flash・C3a MCQ・form A/B と同じ具体例を使わない。

| ドメイン | 問数 | topic |
|---|---|---|
| f-d1 | 19 | t1-01 ×2、t1-02、t1-03、t2-01、t2-02、t2-03、t3-01 ×2、t3-02、t3-03、t4-01、t4-02、t5-01、t5-02、t6-01、t6-02、t7-01、t7-02 |
| f-d2 | 13 | 全 13 topic 各 1 |
| f-d3 | 14 | t1-01、t1-02、t1-03、t2-01、t2-02、t2-03、t3-01、t3-02、t4-01、t4-02、t5-01、t5-02、t6-01、t6-02 |
| f-d4 | 14 | 全 13 topic 各 1 + t3-03 |
| f-d5 | 10 | t1-01、t1-02、t1-03、t2-01、t2-02、t3-01、t3-02、t4-01、t5-02、t6-01 |

## 新規 ID(監査コマンド用。セッション B は同じ集合に `--status active` を適用する)

生成日 2026-09-03。全件 `status: flagged` / `rev: 1`。

- flash 50 件(`--counts 54,36,40,40,30`、retired 除外):

```
f-d1-q041,f-d1-q042,f-d1-q043,f-d1-q044,f-d1-q045,f-d1-q046,f-d1-q047,f-d1-q048,f-d1-q049,f-d1-q050,f-d1-q051,f-d1-q052,f-d1-q053,f-d1-q054,f-d2-q029,f-d2-q030,f-d2-q031,f-d2-q032,f-d2-q033,f-d2-q034,f-d2-q035,f-d2-q036,f-d2-q037,f-d3-q033,f-d3-q034,f-d3-q035,f-d3-q036,f-d3-q037,f-d3-q038,f-d3-q039,f-d3-q040,f-d3-q041,f-d3-q042,f-d4-q031,f-d4-q032,f-d4-q033,f-d4-q034,f-d4-q035,f-d4-q036,f-d4-q037,f-d4-q038,f-d4-q039,f-d4-q040,f-d5-q024,f-d5-q025,f-d5-q026,f-d5-q027,f-d5-q028,f-d5-q029,f-d5-q030
```

- 独立 MCQ 70 件(`--counts 19,13,14,14,10`):

```
f-d1-q501,f-d1-q502,f-d1-q503,f-d1-q504,f-d1-q505,f-d1-q506,f-d1-q507,f-d1-q508,f-d1-q509,f-d1-q510,f-d1-q511,f-d1-q512,f-d1-q513,f-d1-q514,f-d1-q515,f-d1-q516,f-d1-q517,f-d1-q518,f-d1-q519,f-d2-q501,f-d2-q502,f-d2-q503,f-d2-q504,f-d2-q505,f-d2-q506,f-d2-q507,f-d2-q508,f-d2-q509,f-d2-q510,f-d2-q511,f-d2-q512,f-d2-q513,f-d3-q501,f-d3-q502,f-d3-q503,f-d3-q504,f-d3-q505,f-d3-q506,f-d3-q507,f-d3-q508,f-d3-q509,f-d3-q510,f-d3-q511,f-d3-q512,f-d3-q513,f-d3-q514,f-d4-q501,f-d4-q502,f-d4-q503,f-d4-q504,f-d4-q505,f-d4-q506,f-d4-q507,f-d4-q508,f-d4-q509,f-d4-q510,f-d4-q511,f-d4-q512,f-d4-q513,f-d4-q514,f-d5-q501,f-d5-q502,f-d5-q503,f-d5-q504,f-d5-q505,f-d5-q506,f-d5-q507,f-d5-q508,f-d5-q509,f-d5-q510
```

検証コマンド(セッション A で緑を確認済み):

```
npm run validate-bank
npx tsx scripts/audit-flash.ts --counts 54,36,40,40,30 --status flagged --batch-ids <flash 50 件>
npx tsx scripts/audit-practice-mcq.ts --counts 19,13,14,14,10 --status flagged --batch-ids <MCQ 70 件>
npm run audit:form
```

セッション B(step4-review)は同じ ID 集合に `--status active` を適用する。

## Step 4 セルフレビュー(2026-09-03、別セッション step4-review)

1. refs 突合: 新規 120 件が参照する 37 URL すべて HTTP 200(リダイレクト後)、台帳 §10 との照合は audit で機械確認
2. 独立レビュー 1 周目(ドメイン別 3 名): 事実誤り・正解不一意(P1)は 0 件。P2 は「既存カード・C3a MCQ・form A/B と同じ具体例の再掲」と「refs が主張を字句どおり裏付けない(d5 エスカレーション系、B-C5-1 に起票)」
3. 重複統合: 非 retired 全件から「id 不一致かつ一方が新規」の順序なしペア 41,700 組(= 120×288 + C(120,2)、retired 3 件は除外)を正規化 Jaccard で比較。J≥0.28 の 35 組とレビュアー指摘を合わせ **42 件を別角度に書き直し**(flash 24 / MCQ 18。f-d1-q512 は mcq_multi 化)。再検査後の残り 11 組はいずれも flash↔MCQ 間または角度違いの概念重複で、同一具体例は 0
4. 再レビュー 2 周目: 書き直し 41 件について一次ソースで 11 主張を確認(全件 confirmed、矛盾 0)、P2 1 件(f-d2-q504 解説の残存例)を修正
5. 全 120 件を active へ反転し、`--status active` で audit:flash / audit:practice、`npm run audit:form`、validate-bank が緑(active 408 / retired 3)
6. B-C3a-2 の再評価: C3a MCQ 18 問と flash 200 枚の最大 Jaccard は 0.25 で、同一具体例の転用は残っていない(差し替えなし、absorbed-by C5)
7. Codex レビュー 1 回目: P1 1 件(f-d4-q506 が `tool_choice: any` で「exactly one」の呼び出しを保証すると読める)。07 Step 4 の修正ループどおり flagged に戻し、stem を「ツール呼び出しで処理する(1 つ以上)」に改め、解説に disable_parallel_tool_use を追記。再レビュー(一次ソース 4 主張 confirmed、正解一意)→ active → 全件監査 → Codex 再レビュー
8. Codex レビュー 2 回目: P1 なし、P2 1 件(f-d4-q039 / q512 の件数 200,000 / 500,000 が 1 バッチ上限 100,000 requests・256 MB を超える)。docs で上限を確認し、件数を 80,000 / 60,000 に修正(editorial fix。flagged → 修正 → 一次ソース確認 → active)→ 全件監査 → Codex 再レビュー
9. Codex レビュー 3 回目: P1 なし、P2 1 件(#7〜8 の修正 3 問に新 ID + retired を求める)。**不採用**: 03 §rev のルールは attempt / question_flag が参照する公開済みの (question_id, question_rev) を守るためのもので、この 3 問は main にも本番にも入っていない(worktree 内の Step 4 上で active 化しただけで、同じ ID・rev を参照する履歴行は存在し得ない)。初回リリース前の修正として同 ID・rev 1 のまま出す。以後(main 到達後)の修正は 03 のルールどおり editorial は rev++、前提変更は新 ID + retired とする

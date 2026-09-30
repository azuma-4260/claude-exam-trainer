---
id: B-CP2-3
origin: CP2
created: 2026-09-30
status: open
related_tasks: [CP6]
related_specs: ["07#step-2-最小フラッシュ150-枚weight-比例-d1-40--d2-27--d3-30--d4-30--d5-23", "07#step-6-継続改訂ループ"]
related_paths: [scripts/audit-flash.ts, content/ccar-f/questions]
related_backlog: []
stop_condition: none
---
# F の `npm run audit:flash` が main で 26 件 NG(stem に状況設定を足した F カードが「stem 1 文」規則に反する)

## 内容

CP2 の検証で `npm run audit:flash`(既定 exam = ccar-f、`--status active`)を実行したところ、main でも同じ 26 件が NG になっていた(例: `f-d1-q012: stem_en が 1 文でない(3 文)`)。原因は F の改訂(2026-09-19〜23 の「問題文に状況設定を追加(rev 2)」「全フラッシュ点検で見つかった 10 枚の表面に状況と項目数を明示」)で、stem が複数文になったこと。`07` Step 2 の「表 1 文英語」と、それを検査する `scripts/audit-flash.ts` 検査 4 が、F の改訂後のカードと食い違っている。

`audit:flash` は CI(`.github/workflows/ci.yml`)では実行していないため、デプロイは止まっていない。P(`--exam ccar-p`)は 150 枚すべて 1 文で OK。

## 再現手順 / 根拠

- 共有 checkout(main)で `npm run audit:flash` → `audit-flash 失敗: 26 件`
- `git log -- content/ccar-f/questions/d1-flash.json`(5263cfc / 5eab628 / 2e6a98c など)

## 推奨対応

オーナーが次のどちらかを決める。F バンクは S-2 の決定で改訂しないので、カード側は直さない前提。

1. `07` Step 2 の形式規則を「状況設定の文 + 疑問文 1 文」まで許す形に改め、`audit-flash` の検査 4 を合わせる(spec 先行)
2. F の flash を検査 4 の対象外にする(`--exam ccar-f` のときだけ stem 文数を警告に落とす)

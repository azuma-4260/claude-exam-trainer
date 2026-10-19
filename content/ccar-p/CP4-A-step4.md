# CP4-A: P form A(63 問)Step 4 記録(2026-10-19)

`specs/07` Step 4(P 版)の実施記録。Full Mock 品質チェックリストの「Step 4 の記録」を兼ねる。

## 実施内容
- 周回 1: ドメイン別の独立レビュー 6 名(d1 / d2 / d3 / d4 / d5 / d6+d7)。refs 突合・一意性・禁止パターン・構造化フィールド・CP3 / flash との重複。BLOCKER 2(d6-q704, q709)、MAJOR 約 10。事実誤り(正解が refs と矛盾)は 0
- 修正 1: 5 並列で全ドメインに反映(判断軸の差し替え、断定語・極端さで消える誤答の作り直し、stem 外前提の stem 追記、時点で変わる事実の除去など)
- 周回 2: 別のフレッシュなレビュアー 5 名で全問を再審査。BLOCKER 2(d1-q709 の期限切れ再投入、d7-q703 のディレクトリ @-mention の事実誤り)、MAJOR 4(d1-q706, d2-q705, d3-q705, d6-q705)
- 修正 2 → 周回 3(修正した 13 問): BLOCKER 0、MAJOR 3(d3-q706 B, d6-q705, d6-q707)
- 修正 3 → 最終ゲート(修正した 5 問): BLOCKER 0 / MAJOR 0。MINOR を反映して 63 問を `active` に反転(rev は 1 のまま。active 前の修正のため)

## 機械検査(active 後)
- `validate-bank` OK(ccar-p questions 289 / forms 1)
- `audit:form -- --exam ccar-p --form form-a --status active` OK(single 46 / multi 17、難易度 1:2 / 2:37 / 3:24、warnings 0)
- `audit:choices`(P 全体 139 問): 最長=正解 47(約 34%、上限 45%)、warnings 0
- 正解位置(複数正解は各ラベル): A 8 / B 18 / C 21 / D 22 / E 11 前後(周回 1 前は A 21 / E 9 に偏っていたため、書き換えた問で振り直した)
- refs 139 件はすべて SOURCES.md §12 / §13.2 の台帳 URL

## 所見の対応方針
- CP3 の Practice 問題と同じ判断を同じ切り口で問う重複: フォーム側を書き換えて差別化(d1-q701 / q706、d2-q707、d3-q705 D、d4-q701 / q707、d6-q707 / q708)。CP3 側・flash は変更しない(CP7 が並行して改変中のため)
- flash との概念の近接: Drill で概念を学び模試で適用を問う関係として許容。想起問題を状況で包んだだけのもの(d4-q707)は判断問題に書き換えた
- 推論どまりの主張: 学習者向け解説に「(推論)」は書かず、言い過ぎを弱めた。残りは B-CP4-A-1
- 時点で変わる事実: temperature 指定の誤答型を除去、manual thinking budget は stem に世代を明記、MCP のコンテキスト消費の記述を除去
- 弱い誤答・topic の偏りなど MINOR: B-CP4-A-2

## 未了(オーナー作業)
- 各ドメイン 5 問のオーナー抜き取り(d7 は全 4 問)。不備指摘があれば `07` Step 4 の active 化後の修正ループを通す

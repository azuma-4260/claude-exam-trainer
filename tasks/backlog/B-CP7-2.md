---
id: B-CP7-2
origin: CP7
created: 2026-10-19
status: open
related_tasks: [CP6]
related_specs: ["07#step-6-継続改訂ループ", "07#ccar-p-フェーズf-合格後v13-で詳細化"]
related_paths: [content/ccar-p/questions, content/ccar-p/CP7-reaudit-d2.md, content/ccar-p/CP7-reaudit-d4.md, content/ccar-p/CP7-reaudit-d7.md]
stop_condition: none
---
# CP7 Step 4 で見送った軽微事項(Drill の補充・d7-q516 の出力先・CP7 前の実装済みの検査)

## 内容
- Drill 短問 MCQ が d2・d4 で 1 問ずつになった(p-d2-q602 / p-d4-q602 を retired。オーナー決定 2026-10-19)。d2 の構造化メモ(コンテキスト外への永続化)と d4 の OTel 既定値の知識適用型は、別の判断を問う新 ID で補う余地がある
- p-d7-q516 の B は読み取り系のみ事前承認のため、レビュー結果の出力先(コメント投稿の可否)を stem か B に一言足すと厳密になる(2 周目レビューの任意指摘)
- p-d1-q510 の「価値の柱」、p-d1-q505 の拡張の当てはめは推論(B-CP7-1 の推論止まりと同じ扱い)

## 推奨対応
CP6(Step 6 継続改訂ループ)で、学習ログに弱点が出た論点から Drill を補う。d7-q516 は editorial fix で足りる。

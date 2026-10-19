---
id: B-T-bundle-1
origin: T-bundle
created: 2026-10-19
status: open
related_tasks: [D5-1]
related_specs: ["05#s-7", "05#解説の表示-mcq-共通v133s-4"]
related_paths: [src/lib/mistakes/derive.ts, src/components/drill/quick-drill.tsx]
stop_condition: none
---
# 総ざらい(間違いノート)がまとめ形式 mcq_bundle を周回対象にしていない

## 内容
総ざらいは Quick Drill 形式(選択即送信・集合比較・`DrillItem`)で周回する。まとめ形式は小問ごとに答え、全小問回答後に送信する形式のため、Quick Drill の状態機械(`src/lib/drill/machine.ts`)には載せていない。T-bundle では `assembleMistakesView` の `reviewItems` から `mcq_bundle` を除外した(誤答一覧には出る。Practice では解ける)。

## 再現手順 / 根拠
- P のフォームに mcq_bundle が入り、Mock で誤答 → 間違いノートの一覧には出るが「総ざらい開始」の周回には入らない
- `src/lib/mistakes/derive.ts` の `reviewCandidates`

## 推奨対応
総ざらいを Practice 画面(`PracticeItem` / `PracticeBundleCard`)で周回する形に寄せるか、Quick Drill に bundle の状態遷移を足す。CP4-A で mcq_bundle をフォームに入れる場合に判断する。

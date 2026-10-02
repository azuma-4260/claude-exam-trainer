---
id: B-T-exam-2
origin: T-exam
created: 2026-09-30
status: absorbed-by D6-4
related_tasks: [D6-4, D6-2]
related_specs: ["03#exam_session", "05#s-5-mock", "01#fr-5-模試モードmock-exam"]
related_paths: [src/lib/mock/lifecycle.ts, src/lib/mock/schema.ts, src/app/(tabs)/mock/page.tsx, src/components/mock/start-screen.tsx]
stop_condition: none
decisions:
  - { at: 2026-10-03, by: D6-4, action: absorb, note: "03 §exam_session / 05 S-5 を改訂し、開始リクエストを { exam, form_id } に変更。startFullMock は (exam, form_id) で解決し ambiguous_form を廃止。開始画面は exam を送り、同名 form もそれぞれ開始可" }
---
# スコープ both で F と P に同名フォームがあると full 模試を開始できない(開始 API に exam が無い)

## 内容
開始 API のリクエストは `{ form_id }` のみ(03 の API 定義どおり)。D6-1 では開始候補を学習スコープ内 exam のフォームに絞り、
候補に同名 form が複数 exam 分あれば `409 ambiguous_form` で fail closed にした(取り違えて別 exam の form を開始しない)。
また S-5 開始画面の `recommendedFormId` は定義順の先頭 exam の推奨を表示するだけで、exam 別の推奨(`recommendedByExam`)は
開始 API の検証にしか使っていない。P のフォームが存在するまでは到達しない経路(現行は F の form のみ)。

## 再現手順 / 根拠
- `src/lib/mock/lifecycle.ts` `startFullMock`(`matches.length > 1` → ambiguous_form)
- `src/lib/mock/scope.test.ts`「scope both で同名 form が複数 exam にあると開始しない」

## 推奨対応
D6-4(P 模試対応)で開始リクエストに `exam` を加える spec 改訂(03 §exam_session / 05 S-5)を行い、`(exam, form_id)` で開始する。
開始画面は exam ラベル付きで exam ごとの推奨を表示する(D6-2 の exam ラベルと合わせる)。

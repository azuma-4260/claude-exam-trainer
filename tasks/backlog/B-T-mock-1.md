---
id: B-T-mock-1
origin: T-mock
created: 2026-08-27
status: open
related_tasks: [D3-2, D3-3]
related_specs: ["05#s-5-mock", "01#fr-5-模試モードmock-exam"]
related_paths: [src/components/mock/exam-screen.tsx]
stop_condition: none
---
# 試験中画面の保存キューは in-memory のみ(離脱瞬間の未 ACK 操作 1 件が失われ得る)

## 内容

S-5 の回答・フラグ・位置保存はセッション単位の FIFO で直列送信し、未 ACK 中は提出を
無効化している。ただしキューは in-memory のみなので、PATCH 送信中〜ACK 前にタブを
閉じた場合、その操作 1 件はサーバーに届かず失われる(再開時は最後に ACK された状態に戻る)。

厳密 ACK + durable outbox 禁止の対象は学習回答(drill/practice)であり、Mock は
「操作ごとに即時保存」のみが要求(specs/03)。復元は常にサーバー状態から行われ
整合は壊れないため仕様違反ではないが、既知の限界として記録する。

あわせて dev(React StrictMode)では復元 effect が二重実行され、期限超過直後の復元で
「timed_out 表示」ではなく「進行中なし」に落ちる表示レースがある(2 回目の fetch が
204 を返すため)。本番ビルドでは effect は 1 回で、実機確認では timed_out 表示を確認済み。

## 再現手順 / 根拠

1. 試験中に回答をクリックした直後(ACK 前)にタブを閉じる → 再開するとその回答が無い
2. dev で deadline_at を過去にして /mock/session をリロード → まれに「進行中なし」表示
   (DB は正しく submitted/timeout になっている。2026-08-27 実機確認)

## 推奨対応

- D3-2 / D3-3 の画面改修時に、`navigator.sendBeacon` などでの離脱時フラッシュ、
  または復元時の「未保存だった可能性」の注意表示を検討する
- 復元 fetch の結果に「直前まで in_progress だった」情報を持たせ、204 でも直近の
  提出済みセッションを返して timed_out 表示に一本化することを検討する(D3-3 のレポート
  遷移で自然に解消する可能性が高い)

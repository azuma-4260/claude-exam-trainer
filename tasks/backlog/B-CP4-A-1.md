---
id: B-CP4-A-1
origin: CP4-A
created: 2026-10-19
status: open
related_tasks: [CP4-B, CP6, CP7]
related_specs: ["07#step-4-セルフレビューパス必須別セッション", "07#p-制作指針v132s-4"]
related_paths: [content/ccar-p/questions, content/ccar-p/CP4-A-step4.md]
related_backlog: [B-CP3-1, B-CP3-2]
stop_condition: none
---
# P form A のうち、正解の核心が ref の字句ではなく原則からの推論にとどまる問題と、時点で変わる事実の再点検

## 内容
CP4-A の Step 4(独立レビュー 3 周)で、次の問題は台帳(`content/ccar-p/SOURCES.md` §12 / §13.2)の許可ソースに直接の記述が無く、原則からの推論で正解が一意に決まると判断して active にした: p-d1-q708(失敗と空結果の区別)、p-d3-q705(委任 identity と検索層の強制)、p-d3-q711(構造化契約での出荷解放)、p-d4-q705(診断順序)、p-d4-q706(アプリ側ログの前提)、p-d5-q702 / q704 / q705 / q708、p-d6-q702 / q706 / q707 / q708。学習者向けの解説には「(推論)」を書かず、言い過ぎを弱める方針をとった。

時点で変わる事実を前提にする問題: p-d2-q705 / q708(manual thinking budget。stem に世代を明記)、p-d3-q706(MCP の managed settings)。docs の改訂で前提が変わると誤りになる。

## 再現手順 / 根拠
- `content/ccar-p/CP4-A-step4.md` の所見対応表
- B-CP3-1(CP3 の同種の点検)と同じ扱い

## 推奨対応
CP6(P の Step 6)で、推論依存の問題に直接裏付ける ref を追加できるか点検する。ref の差し替えだけなら editorial fix(rev++)、正解の意味が変わるなら新 ID + retired(`03` §rev)。active 後の修正は `07` Step 4 の修正ループを通す。

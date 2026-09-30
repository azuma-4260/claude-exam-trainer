---
id: B-CP2-2
origin: CP2
created: 2026-09-30
status: open
related_tasks: [CP6]
related_specs: ["07#step-6-継続改訂ループ", "07#ccar-p-フェーズf-合格後v13-で詳細化"]
related_paths: [content/ccar-p/questions/d1-flash.json, content/ccar-p/questions/d6-flash.json, content/ccar-p/CP2-refs-map.md]
related_backlog: [B-CP3-1, B-C5-1]
stop_condition: none
---
# P フラッシュの残課題: F と強く重なる topic の近接カードと、変わりやすい機能への依存

## 内容

CP2 の Step 4(独立レビュー 6 周。最終周の blocking 0)で blocking はゼロにしたが、次の点は構造上残るため CP6(P の Step 6)で再点検する。

1. **F と「強」で重なる topic の近接カード**: p-d1-t5-02(静的分解と動的分解)と p-d1-t4-03(マルチエージェントの失敗処理と状態)は、同じ topic の refs-map で裏付けられる事実が F のカード(f-d1-q034 / q035、f-d5-q011 / q012)とほぼ同じ一次ソースの同じ箇所になる。全 topic 被覆(audit-flash 検査 3)のため 1 枚は必要なので、p-d1-q022 は「固定設計の欠陥を診断する」architect 視点の問いに、p-d1-q020 は F に無い rainbow deployments に寄せた。p-d1-q022 は事実の核が F と近いまま残る
2. **変わりやすい機能**: Step 4 で temperature(新しいモデルで設定不可)・budget_tokens・Priority Tier(新規購入不可)を中心にしたカードは論点を差し替えた。今後の docs 改訂で、ほかのカードの前提(task budget などの beta 機能への言及、FedRAMP / IL の提供範囲 p-d5-q017)が古くなる可能性がある
3. **refs-map と最終カードの乖離**: Step 4 で論点を差し替えたカード(p-d6-q009 を p-d6-t5-01 へ移動、p-d1-q019 を p-d1-t3-03 へ移動 等)は、`CP2-refs-map.md` の topic 節にある URL の範囲内で書いたが、引用はカード単位では記録していない(突合はレビューの JSON で実施)

## 再現手順 / 根拠

- CP2 Step 4 のレビュー記録(承認依頼の報告)
- `content/ccar-p/SOURCES.md` §8 の重なりマップ(1.4 / 1.5 が「強」)

## 推奨対応

CP6 で `/api/export?exam=ccar-p` のフラグと合わせて点検する。1 は P の学習ログで F と混同している兆候があれば論点を差し替える(意味が変わるので新 ID + retired)。2 は docs の改訂を確認し、前提が古くなったカードを editorial fix(rev++)または新 ID で直す。

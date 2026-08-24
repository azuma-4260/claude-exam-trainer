---
id: B-T-queue-1
origin: T-queue
created: 2026-08-24
status: open
related_tasks: [D1-5]
related_specs: ["04#日次キュー45-分時間予算方式", "05#s-1-home"]
related_paths: [src/lib/queue/build.ts]
stop_condition: none
---
# 同日内キュー再構築の消費シグナル導出規則を D1-5 で確定する

## 内容

`buildDailyQueue` は予算 2700 秒/日・new_per_day/日を守るため、同日内の再構築時に
`spentTodaySec`(今日消化した見積り秒数)と `introducedTodayCount`(今日導入した新規数)を
差し引く I/F を持つ(Codex レビュー P2 対応)。ただし両シグナルを attempt ログから
どう導出するかは未確定: 同一問題の同日内再回答(FSRS learning steps による再 due)を
消化秒数に重複計上するか、導入数を「今日 srs_state が新規作成された件数」でどう数えるか
(srs_state に created_at が無い)等。

## 再現手順 / 根拠

シグナルを渡さず再構築すると、リロードのたびに 45 分予算がフル復活し、
新規導入も target まで再充填される(specs/04 の「1 日」量の意図に反する)。

## 推奨対応

D1-5(Home の進捗リング・ノルマ表示)実装時に、当日 attempt(00:00 JST 以降)からの
導出規則を決めて `buildDailyQueue` に結線する。必要なら specs/04 に導出規則を追記する。

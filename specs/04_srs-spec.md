# 04. 復習アルゴリズム仕様(v1.2)

## 方針

- ts-fsrs 5.4.1(exact pin)。Card は lossless 永続化(`03`)。返却 Card の個別フィールド書換禁止
- srs_state は初回 rating commit 時に生成(表示だけでは new のまま)

## モード行列

| Mode | attempt | FSRS 更新 | 間違いノート |
|---|---|---|---|
| Drill(flash) | Yes(即時・厳密 ACK) | Yes(ユーザー 4 択評価) | No |
| Drill(短問 MCQ) | Yes(即時) | Yes(正解→Good / 不正解→Again) | No |
| Practice | Yes(即時) | **srs_eligible=true の場合のみ**(同上の自動レーティング)。false(解放済みフォーム問題等)は applied_rating=null | Yes |
| Mock(full / mini / half) | **提出時一括**(`03`) | No | Yes(提出時分) |

- 回答時間による Easy 自動判定はしない
- 初期診断テストは存在しない(v1.2 で廃止)

## 試験日対応

```
maximum_interval = max(1, days_until_exam - 1)
request_retention = 0.90
```

- これ以外の間隔上限は設けない(v1.1 の MAX_INTERVAL_DAYS=10 は削除。試験日制約と高頻度復習という別目的を混ぜない)
- retrievability の取得は `scheduler.get_retrievability(card, now, false)`(number で受ける)

## 新規カード導入ペース(target)

```
remaining_new = 「status=active AND srs_eligible=true AND holdout 非該当」で srs_state 行なしの問題数
days_left     = 試験日までの残日数(Asia/Tokyo 暦日)
buffer_days   = 7
DAILY_NEW_CAP = 40

if remaining_new == 0 or days_left <= buffer_days:
    required_new = 0; new_per_day = 0
else:
    required_new = ceil(remaining_new / (days_left - buffer_days))
    new_per_day  = min(required_new, DAILY_NEW_CAP)

pace_warning = (required_new > DAILY_NEW_CAP)
```

**new_per_day は達成目標であり hard guarantee ではない。時間予算が優先。** 実導入数が target 未満なら翌日 remaining_new から再計算される(自己補正)。

## 日次キュー(45 分時間予算方式)

item 数 cap は廃止。問題種別の固定コストで予算管理する(実測からの自動調整は実装しない)。

```
EST_SEC(flash)         = 20
EST_SEC(short_mcq)     = 60
EST_SEC(scenario_mcq)  = 120
DAILY_QUEUE_BUDGET_SEC = 2700   // 45 分。残り 15 分は間違いノート・refs 確認等のバッファ
NEW_RESERVED_SEC       = 600    // 新規用に最大 10 分を予約
```

アルゴリズム:

```
new_candidates    = priority 降順、最大 new_per_day 件
reserved_new_sec  = min(NEW_RESERVED_SEC, sum(EST_SEC(new_candidates)))

1. due(due_at <= now)を古い順に、
   DAILY_QUEUE_BUDGET_SEC - reserved_new_sec の範囲まで積む
2. new_candidates を priority 順に、new_per_day 件以内かつ残予算内で積む
3. 予算が余れば due バックログを追加
4. 予算超過分は翌日へ(バックログとして件数のみ分離表示)
```

新規の priority: `priority(topic) = domain_weight × (1 - proficiency(topic))`

## 習熟度(proficiency)

primary_topic_id のみで集計。

```
proficiency(t) = 0.7 × retention(t) + 0.3 × coverage(t)

retention(t):
  SRS 導入済み(committed srs_state)の active カードが 1 件以上
    → retrievability の平均
  0 件 → 0.3(固定既定値)

coverage(t) = t 配下の srs_eligible 問題のうち 1 回以上正解した割合
```

- 未学習トピックは proficiency = 0.7×0.3 + 0.3×0 = 0.21 となり、初期の優先度は概ねドメイン重みで決まる(意図した挙動)
- ドメイン proficiency はトピックの単純平均

## 到達度の表示

素の正答率 / ドメイン重み付き正答率 / 未提出フォーム初回受験の模試推移(rehearsal は別系列)/ 内部目標 85%。スケールドスコア換算なし。

## 直前期(9/20〜9/26)と D-1

- 新規導入は逆算式により自動 0。キュー = due 復習 + 間違いノート + 固定フォーム模試
- **D-1(9/26)**: 通常の due ベースのキュー選定を停止し、「間違いノート → low-stability 順」を**時間予算内だけ**提示する。全カード完走は要求しない。回答自体は通常どおり attempt + srs_state を更新してよいが、返却された将来 due は試験前のキュー選定に使用しない

## 日付規約

試験日・days_left・日次リセット・直前期判定は Asia/Tokyo 暦日。日次リセット 00:00 JST。

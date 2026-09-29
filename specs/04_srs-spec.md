# 04. 復習アルゴリズム仕様(v1.3)

**v1.3(2026-09-29, S-3 / オーナー決定)**: 試験日を exam 別化し、試験日を過ぎた exam は上限なしで復習継続。学習スコープ(F / P / F+P)でのキュー合成・新規ペース・習熟度・D-1 の規則を追加。

## 方針

- ts-fsrs 5.4.1(exact pin)。Card は lossless 永続化(`03`)。返却 Card の個別フィールド書換禁止
- srs_state は初回 rating commit 時に生成(表示だけでは new のまま)

## モード行列

| Mode | attempt | FSRS 更新 | 間違いノート |
|---|---|---|---|
| Drill(flash) | Yes(**Next 押下時**・厳密 ACK。評価は Next まで変更可) | Yes(ユーザー 4 択評価) | No |
| Drill(短問 MCQ) | Yes(即時) | Yes(正解→Good / 不正解→Again) | No |
| Practice | Yes(即時) | **srs_eligible=true の場合のみ**(同上の自動レーティング)。false(解放済みフォーム問題等)は applied_rating=null | Yes |
| Mock(full / mini / half) | **提出時一括**(`03`) | No | Yes(提出時分) |

- 回答時間による Easy 自動判定はしない
- **flash の is_correct(v1.2.2 確定)**: 利用者評価 Again → false、Hard / Good / Easy → true(「思い出せた」を正解とみなす)。coverage(§習熟度)の「1 回以上正解」はこの定義で数える。MCQ は集合一致・部分点なし
- 初期診断テストは存在しない(v1.2 で廃止)

## 試験日対応

試験日は exam ごとのコード定数(Asia/Tokyo 暦日): CCAR-F = 2026-09-27、CCAR-P = 2026-12-12。rating を適用するカードの **exam の試験日**で scheduler を作る(学習スコープではなくカード単位)。

```
days_until_exam = そのカードの exam の試験日 - 今日(JST 暦日。当日 0、通過後は負)

if days_until_exam < 0:          # 試験日を過ぎた exam(v1.3 / オーナー決定 2026-09-29)
    maximum_interval = 指定しない(ts-fsrs 5.4.1 の既定値。上限なし)
else:
    maximum_interval = max(1, days_until_exam - 1)
request_retention = 0.90
```

- 試験日を過ぎた exam のカードも復習を継続する。旧式 `max(1, 負数) = 1` による「毎日 due」は廃止(過去試験が学習時間を圧迫しないため)。既存カードの due は書き換えず、次回 rating 時から新しい上限で再計算される(Card の lossless 原則を維持)
- 試験日が未設定の exam は学習スコープに選べない(`03` §study_setting)ため、未定義の試験日でスケジューリングすることはない

- これ以外の間隔上限は設けない(v1.1 の MAX_INTERVAL_DAYS=10 は削除。試験日制約と高頻度復習という別目的を混ぜない)
- retrievability の取得は `scheduler.get_retrievability(card, now, false)`(number で受ける)

## 新規カード導入ペース(target)

exam ごとに下式を計算する(remaining_new / days_left ともその exam の値。holdout は `(exam, form_id)` で判定、`03`)。

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

- 試験日を過ぎた exam は days_left <= buffer_days なので new_per_day = 0(新規導入なし。復習のみ継続)
- 学習スコープ `both` では、new_per_day = 各 exam の new_per_day の合計、pace_warning = いずれかの exam が該当、required_new は exam ごとに表示できるよう保持する。**新規枠は exam ごとに独立**: 新規候補は exam ごとにその exam の(当日導入済みを差し引いた)new_per_day 件までを取り、それを priority 順にマージする。ある exam の未導入カードが他の exam の新規枠を消費することはない(試験日を過ぎた F は new_per_day = 0 なので F の新規は入らない)

**new_per_day は達成目標であり hard guarantee ではない。時間予算が優先。** 実導入数が target 未満なら翌日 remaining_new から再計算される(自己補正)。

## 日次キュー(45 分時間予算方式)

候補は学習スコープ内の exam の問題のみ(`03` 出題プール判定 0)。スコープ `both` でも予算は 1 つ(2700 秒)を共有する(v1.3 / オーナー決定 2026-09-29)。

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
new_candidates    = exam ごとに priority 降順で最大 new_per_day(exam) 件 → priority 順にマージ
reserved_new_sec  = min(NEW_RESERVED_SEC, sum(EST_SEC(new_candidates)))

1. due(due_at <= now)を古い順に(スコープ `both` でも exam を区別せず due_at 順)、
   DAILY_QUEUE_BUDGET_SEC - reserved_new_sec の範囲まで積む
2. new_candidates を priority 順に、new_per_day 件以内かつ残予算内で積む
3. 予算が余れば due バックログを追加
4. 予算超過分は翌日へ(バックログとして件数のみ分離表示)
```

新規の priority: `priority(topic) = domain_weight × (1 - proficiency(topic))`(domain_weight はその topic の exam の公式重み。exam ごとの候補の切り出しと、マージ後の並び順の両方にこの式を使う)

### 同日内リビルドの消費シグナル導出(v1.2.3 確定、B-T-queue-1 解消)

予算 2700 秒/日と new_per_day は 1 日(00:00 JST リセット)の量なので、同日内にキューを再構築する
ときは当日の消化分を差し引く。両シグナルは attempt ログから次の規則で導出する(オーナー決定 2026-08-25):

```
当日 = answered_at >= 当日 00:00 JST
対象 mode = drill / practice のみ
対象 exam(v1.3): spent_today_sec は全 exam(スコープに関係なく当日実際に使った学習時間。同日にスコープを切り替えても予算は戻らない)。
  introduced_today_count は exam ごとに導出する(新規枠が exam ごとのため)(mock は提出時一括生成で answered_at が回答時刻でないため除外)

spent_today_sec       = Σ EST_SEC(question)  … 当日対象 attempt の全件(回答回数ぶん加算。
                        同一問題の同日内再回答(learning steps による再 due)も 1 回ずつ数える。
                        時間予算 = 実際に使った学習時間、の意味に合わせる)
introduced_today_count = distinct question 数 … 「applied_rating IS NOT NULL の最初の attempt が当日」
                        (srs_state に created_at が無いため attempt から導出。
                        練習で applied_rating=null だった過去回答は「導入」に数えない)
```

- バンクに存在しない question_id の attempt(retired 済み等)は spent の加算対象外(EST_SEC 不明のため 0)

## 習熟度(proficiency)

primary_topic_id のみで集計。topic は exam 固有なので、スコープ内の exam の topic だけを計算対象にする(ドメイン・exam をまたいで平均しない)。

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

## 直前期と D-1

**v1.3**: 以下は「学習スコープが単一 exam のとき、その exam の試験日」に対して適用する。直前期 = 凍結日(試験日 − 7 日)〜試験日前日、D-1 = 試験日前日(F: 9/20〜9/26 / 9/26、P: 12/5〜12/11 / 12/11)。**スコープ `both` では D-1 モードにしない**(常に通常キュー。前日は単独スコープに切り替えて使う。オーナー決定 2026-09-29)。

- 新規導入は逆算式により自動 0。キュー = due 復習 + 間違いノート + 固定フォーム模試
- **D-1(試験日前日。単独スコープ時のみ)**: 通常の due ベースのキュー選定を停止し、「間違いノート → low-stability 順」を**時間予算内だけ**提示する。全カード完走は要求しない。回答自体は通常どおり attempt + srs_state を更新してよいが、返却された将来 due は試験前のキュー選定に使用しない

## 日付規約

試験日・days_left・日次リセット・直前期判定は Asia/Tokyo 暦日。試験日は exam ごと(§試験日対応)。日次リセット 00:00 JST。

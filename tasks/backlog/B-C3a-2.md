---
id: B-C3a-2
origin: C3a
created: 2026-08-27
status: open
related_tasks: [C5, C3b-A]
related_specs: ["07#step-3a-practice-専用シナリオ-mcq828-までフォーム非収載", "07#step-4-セルフレビューパス必須別セッション"]
related_paths: [content/ccar-f/questions]
stop_condition: none
---
# C3a の MCQ 18 問中 14 問が C2 フラッシュと概念・具体例レベルで高一致(生成時点)

## 内容
Step 4 の重複検査(生成直後の状態に対する監査)で、C3a の Practice 専用 MCQ 18 問のうち 14 問が、C2 フラッシュカードの
表(前提)+ 裏(正解根拠)を同一の具体例までほぼ転用していると判定された
(例: f-d1-q102 ↔ flash f-d1-q024「本人確認→与信の prerequisite gate」、
f-d5-q103 ↔ flash f-d5-q014「scratchpad + subagent + /compact」)。
モードは分離されており(flash = drill 専用 / MCQ = practice 専用)出題プールは混ざらず、
事実誤りや誤学習は生じないが、Drill 済みの学習者にとって Practice の独自性(未知の
適用文脈での判別練習)が減る。両者が同じ syllabus トピックと同じ一次ソースから
生成されている以上、知識点の重複自体は構造的で不可避。

## 再現手順 / 根拠
- C3a Step 4 の重複検査(2026-08-27)の判定結果。高一致は 14 問
  (d1-q102/q103/q104, d2-q102/q103, d3-q101/q103/q104, d4-q101/q102/q104, d5-q101/q102/q103 ↔ 各対応 flash)
- うち d1-q102 は同日の書き直し(公式サンプル近似解消)で具体例が変わり、対応 flash(f-d1-q024)との一致度は低下済み。C5 での再評価時は書き直し後の本文を基準にすること
- flash と MCQ の生成順(C2 → C3a)と同一トピックツリー由来であることは specs/07 の設計どおり

## 推奨対応
- C5(Step 5: 独立 MCQ 60〜100 問)の生成時に「対応する flash と同じ具体例を使わない」を
  生成制約に明記し、C3a の高一致 12 問のうち劣化が大きいものはそこで新 ID 差し替えを検討する
- C3b-A(フォーム収載 180 問)は form 間・flash との具体例重複チェックを Step 4 の必須検査に含める
- 8/28 の Practice 開始を優先するため C3a 時点では書き直さない(オーナー抜き取りで
  個別に書き直し指示があれば active 化後の修正ループで対応)

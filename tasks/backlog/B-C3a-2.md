---
id: B-C3a-2
origin: C3a
created: 2026-08-27
status: absorbed-by C5
related_tasks: [C5, C3b-A]
related_specs: ["07#step-3a-practice-専用シナリオ-mcq828-までフォーム非収載", "07#step-4-セルフレビューパス必須別セッション"]
related_paths: [content/ccar-f/questions]
stop_condition: none
decisions:
  - { at: 2026-09-03, by: C5, action: absorb, note: "Step 4 で再評価: C3a MCQ 18 問と全 flash(200 枚)の正規化 Jaccard は最大 0.25(f-d3-q103↔q013)で、C3b-A/C3b-B の書き直しと C5 の重複統合後は同一具体例の転用は残っていない。知識点レベルの重複は同一トピックツリー由来の構造的なもの(モードも分離)と判断し、差し替えは行わない。C5 新規 120 件は「新規×既存 + 新規×新規」41,700 ペアを検査し、同一具体例 42 件を別角度に書き直した。以上で本項目の C5 分を完了" }
  - { at: 2026-09-03, by: C5, action: absorb, note: "C5 の独立 MCQ 70 問・flash +50 の生成制約に「対応する flash / C3a MCQ / form A・B と同じ具体例を使わない」を適用し、Step 4(step4-review セッション)で非 retired 全件から「id 不一致かつ一方が新規」の順序なしペアを正規化 Jaccard で全比較する。高一致 12 問の差し替え要否は同セッションで判定し、差し替えまで済めば absorbed-by C5 に更新、見送り分があれば範囲を記録して open 維持" }
  - { at: 2026-08-27, by: C3b-A, action: absorb, note: "form A 60 問の生成制約に「対応 flash / C3a Practice MCQ と同じ具体例を使わない」を適用(既存 168 問の stem を生成前に照合し具体例を変えた)。flash・practice との具体例重複の機械的検査は Step 4 セッション(step4-review)の必須検査に含める。C5 での高一致 12 問の差し替え検討は open のまま" }
  - { at: 2026-08-27, by: C3b-A, action: absorb, note: "Step 4 で form A 60 問と既存 169 問の stem を正規化トークン Jaccard で全組合せ比較し、上位ペアを人手で再確認。同一の具体例・選択肢の転用は 0 件。同一トピックの flash → 異なるシナリオへの適用問題は、知識点の重複はあるが具体例重複ではないと判定。C3b-A 分の absorb を完了、C5 分のみ open 継続" }
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

---
id: B-CP3-2
origin: CP3
created: 2026-09-30
status: open
related_tasks: [CP6]
related_specs: ["07#step-6-継続改訂ループ"]
related_paths: [content/ccar-p/questions/d5-mcq.json, content/ccar-p/questions/d2-mcq.json, content/ccar-p/questions/d1-mcq.json]
stop_condition: none
---
# 時点で変わる製品仕様を誤答の退け理由に使っている P 独立 MCQ と、軽微な重複の見送り

## 内容
Step 4 で「正解の判断には効かない」ため OK とした、docs の現行仕様に依存する記述と、見送った軽微な重複:

- p-d5-q506: 誤答 C を退ける理由が `inference_geo` の取りうる値(global / us のみ)。値が増えても C は us 固定のため誤答のままだが、解説の記述は古くなりうる
- p-d5-q507: code execution が HIPAA 対象外という表の記述に依拠
- p-d2-q503: "Claude 4.7 and later models ... reject requests that use [budget_tokens]" という世代固有の記述を状況説明に使う(正解は「移行ガイド確認 + 自前の評価再実行」という手順で決まる)
- p-d2-q510: 誤答 D の退け理由が claude.ai の custom Skills の共有仕様(個人単位)
- p-d1-q508: F の flash f-d5-q012(checkpoint 再開)と概念が近い。1 周目で正解を「失敗した subagent だけ失敗内容を伝えて別経路で再試行、完了分は再利用」に変えて判断を分けたため、2 周目の指摘(軽微)は見送った

## 再現手順 / 根拠
- 各問の explanation_ja と refs(`content/ccar-p/SOURCES.md` §13.2)

## 推奨対応
Exam Guide / docs の改訂トリガー(`07` 原則)または CP6 で、該当 docs の記述が変わっていないか確認し、変わっていれば解説を editorial fix(rev++)。

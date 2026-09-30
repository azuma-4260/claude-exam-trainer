---
id: B-CP3-1
origin: CP3
created: 2026-09-30
status: open
related_tasks: [CP6, CP2]
related_specs: ["07#原則", "07#step-6-継続改訂ループ"]
related_paths: [content/ccar-p/questions, content/ccar-p/CP3-allocation.md]
related_backlog: [B-CP2-1, B-C5-1]
stop_condition: none
---
# P 独立 MCQ のうち、正解の核心が ref の字句ではなく原則からの推論にとどまる問題の再点検

## 内容
CP3 の Step 4(独立レビュー 2 周)では、正解の核心が ref の字句ではなく「ref が述べる原則からの短い推論」にとどまる問題を、推論が自然で一意性が保たれる限り OK とし、解説に「推論」と明記させた。主に p-d6(ステークホルダー・ライフサイクル)、p-d4-q510 / q511、p-d7-q510、p-d1-q503 / q508 / q511 など。台帳(`content/ccar-p/SOURCES.md` §13.2)の許可ソースでは直接の記述が見つからなかったため。

CP2 の B-CP2-1(許可ソースの解釈・拡大のオーナー判断待ち)の結論によっては、より直接の ref に差し替えられる可能性がある。

## 再現手順 / 根拠
- `content/ccar-p/questions/d*-mcq.json` の explanation_ja で「推論」と明記した問題
- レビュー記録: CP3 の承認依頼報告

## 推奨対応
B-CP2-1 の決定後、または CP6(P の Step 6)で、推論依存の問題に直接裏付ける ref が追加できるか点検する。ref の差し替えだけなら editorial fix(rev++)、正解の意味が変わるなら新 ID + retired(`03` §rev)。

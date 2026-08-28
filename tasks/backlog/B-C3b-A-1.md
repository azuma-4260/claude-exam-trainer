---
id: B-C3b-A-1
origin: C3b-A
created: 2026-08-27
status: open
related_tasks: [C3b-B, C3b-C]
related_specs: ["07#step-3b-固定フォーム用シナリオ-mcq最大工数", "03#mock_formsyaml-と-validator-条件"]
related_paths: [content/ccar-f/scenarios.yaml, content/ccar-f/mock_forms.yaml]
related_backlog: [B-C3a-1, B-D0-3-2]
stop_condition: none
---
# form B/C のシナリオプール設計方針が未確定(全体 6〜8 本の上限と再利用の要否)

## 内容
specs/07 Step 3b はシナリオを全体で 6〜8 本とする。C3b-A 完了時点でプールは 6 本
(C3a の Practice 専用 2 本 + form A 用 4 本)。form B / C も各 4 シナリオ × 60 問を
要するため、C3b-B では次のどれかを選ぶ必要がある:
1. form A のシナリオ 4 本を form B でも再利用する(validator は form 間の**問題**重複のみ
   禁止し、シナリオ共有は許容)
2. 新規シナリオを追加する(上限 8 本まで、あと 2 本)
3. C3a の Practice 専用シナリオ(sc-billing-support-agent / sc-ci-code-review)に
   form 収載問題を追加する — ただし Practice で文脈既知のシナリオが holdout フォームに
   載ることの学習効果への影響は未評価

C3b-A では form A を新規 4 本で構成し、この選択は行っていない。

## 再現手順 / 根拠
- specs/07 Step 3b「シナリオ 6〜8 本」「form A → B → C の順に各 60 問(form 間重複なし)」
- scripts/validate-bank.ts はシナリオの form 間共有を禁止していない(問題 ID 重複のみ検査)

## 推奨対応
- C3b-B 着手時に方針を決めて着手報告に記録する。公式は「6 本から 4 本抽選」なので、
  本番構造に寄せるなら 1(+不足分のみ 2)が近い。3 は避けるのが無難(holdout の
  文脈新鮮さを保つ)

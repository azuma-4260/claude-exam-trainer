---
id: B-C3b-B-1
origin: C3b-B
created: 2026-09-02
status: open
related_tasks: [C3b-C]
related_specs: ["07#step-3b-固定フォーム用シナリオ-mcq最大工数", "03#mock_formsyaml-と-validator-条件"]
related_paths: [content/ccar-f/scenarios.yaml, content/ccar-f/mock_forms.yaml]
related_backlog: [B-C3b-A-1]
stop_condition: none
---
# form C のシナリオ構成方針(既存プールからの再利用を基本とする)

## 内容
B-C3b-A-1 の方針決定(2026-09-02、オーナー回答)により form B は「新規 2 本 + form A 再利用 2 本」で
構成し、シナリオプールは 8 本(Practice 専用 2 + form A 用 4 + form B 用 2)になった。
specs/07 Step 3b の「シナリオ 6〜8 本」は固定フォーム用の記述であり、Practice 専用の 2 本を
含めて数えるかは spec に明示がない(フォーム用だけなら現在 6 本)。したがって「spec 上追加不能」
ではなく、C3b-B の方針判断として **form C は新規シナリオを追加せず既存プールから 4 本を選ぶ**
ことを基本とし、追加が必要なら着手時にオーナー判断(必要なら spec に上限の数え方を明記)とする。

form C の構成候補(C3b-C 着手時に決める):
- form 収載済みシナリオの再利用: sc-outdoor-returns-agent / sc-payments-monorepo-codegen(form A のみ)、
  sc-legacy-modernization-agent / sc-org-rollout-ci-testgen(form B のみ)の 4 本を使えば
  「各シナリオが 2 フォームに載る」対称構成になり、公式「6 本から 4 本抽選」に近い
- Practice 専用シナリオ(sc-billing-support-agent / sc-ci-code-review)への form 収載は
  B-C3b-A-1 の推奨どおり避ける(holdout の文脈新鮮さ)
- 弱点トピック difficulty 3 追加(09 の C3b-C DoD)はシナリオ選択と独立

## 再現手順 / 根拠
- specs/07 Step 3b「シナリオ 6〜8 本」
- content/ccar-f/scenarios.yaml のシナリオ数が 8(`grep -c '^  - id: sc-' content/ccar-f/scenarios.yaml`)
- content/ccar-f/mock_forms.yaml form-b の scenario_ids(新規 2 + 再利用 2)

## 推奨対応
- C3b-C 着手報告で form C の 4 本を上記候補から確定し、B-C3b-A-1 と本項目を参照する
- 新規シナリオを足す場合は、Step 3b の「6〜8 本」が Practice 専用を含むかをオーナーが決めて spec に明記してから(停止条件ではないが spec 更新を伴う)

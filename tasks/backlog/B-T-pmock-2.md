---
id: B-T-pmock-2
origin: T-pmock
created: 2026-10-03
status: open
related_tasks: [D6-5]
related_specs: ["03#mock_formsyaml-と-validator-条件", "03#exam_session"]
related_paths: [scripts/verify-release.ts]
stop_condition: none
---
# verify-release がフォームを form_id だけで引く(F と P の同名 form-a を区別しない)

## 内容
`scripts/verify-release.ts` の対象フォーム解決は `bank.forms.find((f) => f.id === formId)` で exam を見ない。
D6-4 で問題数は `FORM_STRUCTURE[form.exam].size` に直したが、F と P に同名の form-a があると先に見つかった方を検証する。
P の form A が入る CP4-A 以降、P の提出後解放を検証する D6-5 で到達する。

## 再現手順 / 根拠
- `scripts/verify-release.ts` の `bank.forms.find`(D6-4 時点)

## 推奨対応
D6-5 で `verify:release` に `--exam` を加え、`(exam, form_id)` でフォームと session を解決する。

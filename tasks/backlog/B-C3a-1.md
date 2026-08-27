---
id: B-C3a-1
origin: C3a
created: 2026-08-24
status: open
related_tasks: [C3b-A, C5]
related_specs: ["07#step-3a-practice-専用シナリオ-mcq828-までフォーム非収載", "09#1-順序を支配する原則"]
related_paths: [content/ccar-f/questions, scripts]
related_backlog: [B-D0-3-2]
stop_condition: none
---
# C3a 固有不変条件の監査がアドホック(恒久スクリプト化を defer)

## 内容
C3a の検証では、Practice 専用シナリオ MCQ の固有不変条件(q101+ 範囲で件数 15〜20 /
distinct scenario_id = 2 / 各シナリオ使用数 > 0 / eligible_modes = ["practice"] /
srs_eligible = true / 全 5 ドメイン各 2 問以上 / refs が一次ソースドメインのみ)を
セッション内のアドホックな Python/jq で機械確認した。validate-bank はこれらを強制しない
(汎用 validator に C3a 固有条件を足すと受理集合が変わるため意図的に見送り)。
C2 の `scripts/audit-flash.ts` に相当する恒久監査スクリプトは未整備。

## 再現手順 / 根拠
- `scripts/validate-bank.ts` は件数・シナリオ使用数・mode 固定値を検証しない
- C2 は同種の固有条件を `scripts/audit-flash.ts` + `npm run audit:flash` で恒久化している

## 推奨対応
- C3b-A / C5 でコンテンツ監査を拡張する際に、`scripts/audit-practice-mcq.ts`(仮)として
  C3a 固有条件を恒久化し、Step 4 / deploy 前の必須検証に加える
- C3a セッション B(C2 統合後)で audit-flash を flash のみ抽出に修正するのと同時に
  実装するのが最小コスト

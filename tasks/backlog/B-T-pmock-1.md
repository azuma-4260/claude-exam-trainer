---
id: B-T-pmock-1
origin: T-pmock
created: 2026-10-03
status: open
related_tasks: [S-4, CP7]
related_specs: ["07#ccar-p-フェーズf-合格後v13-で詳細化"]
related_paths: [content/ccar-p/SOURCES.md, ExamGuide/memo.md]
stop_condition: none
related_backlog: [B-D6-3-2, B-T-exam-2, B-D0-3-2]
---
# Prep Course(Partner Academy)の lesson 単位の内容と P バンクの突合が未実施

## 内容
- 公式 Prep Course(https://anthropic-partners.skilljar.com/path/claude-certified-architect-professional、5 モジュール約 12 時間)は、
  モジュール単位(Solution Design 238 分 / Enterprise Integration 158 分 / Responsible AI・Safety 114 分 / Stakeholder・Lifecycle・GTM 178 分 /
  Team Enablement 45 分)では Guide の 7 ドメインに対応し、P の syllabus は Guide の詳細目標 38 本と 1:1 なので目標単位の漏れは無い
- lesson の中身はログインが必要で取得できず、コース固有の枠組み(GTM・ステークホルダー対応の進め方など)がバンクに反映されているか未確認
- 受験記(KDDI Tech Note 2026-10-02)は Prep Course 受講を推奨し、定型表現(compensating control / binding constraint / least privilege 等)の習熟を勧める。
  P バンクでは compensating control・binding constraint が 0 件(2026-10-03 時点)

## 再現手順 / 根拠
- `content/ccar-p/SOURCES.md` §1.1.1、`ExamGuide/memo.md` §13・§16

## 推奨対応
オーナーが Prep Course を受講し、lesson で扱う論点のうち P バンクに無いものを S-4(制作指針)/ CP7(再監査)の入力にする。

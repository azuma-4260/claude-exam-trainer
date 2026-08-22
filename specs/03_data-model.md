# 03. データモデル(v1.2)

バンク = Git 内静的ファイル(ビルド時取込)、進捗 = Neon Postgres。スキーマの単一ソースは `src/lib/bank/schema.ts` の Zod discriminated union(TypeScript 型は z.infer、validate-bank.ts も同 schema を import)。本書の JSON/SQL は説明例。

## 1. 問題バンク(`content/`)

```
content/ccar-f/
  syllabus.yaml / scenarios.yaml / mock_forms.yaml / SOURCES.md
  questions/d1-agentic.json ... d5-context.json
```

### question オブジェクト

```jsonc
{
  "id": "f-d2-q014", "exam": "ccar-f", "domain_id": "f-d2",
  "primary_topic_id": "f-d2-t1-03", "secondary_topic_ids": [],
  "type": "mcq_single",                       // mcq_single | mcq_multi | flash
  "scenario_id": null,
  "eligible_modes": ["drill"],                // drill | practice | mock
  "srs_eligible": true,
  "stem_en": "...", "choices": [...], "answer": ["B"], "answer_en": null,
  "explanation_ja": "...", "refs": ["https://docs.claude.com/..."],
  "difficulty": 2, "status": "active", "rev": 1
}
```

不変条件(Zod 強制): flash は choices/answer=null・answer_en 必須 / mcq_single は answer 1 件 / mcq_multi は 2 件以上・集合一致・部分点なし・"Select TWO" 明記 / scenario_id・topic・domain の整合 / refs >= 1。

**フォーム収載問題の標準値**: `eligible_modes: ["mock", "practice"]`, `srs_eligible: false`(mock 提出後の Practice 解放を可能にするため。ただし出題可否は下記 holdout ゲートが優先)。

### 出題プールの判定順序(全モード共通)

1. **holdout ゲート(最優先)**: 未提出(submitted な exam_session が存在しない)full form に収載された問題は、その正確な full form の実施以外では出題しない。Practice / Drill / domain mini / 間違いノートを含む
2. status = 'active'
3. 現行 rev の未解決フラグが存在しない(下記)
4. eligible_modes に当該 mode が含まれる
5. (SRS 文脈では)srs_eligible

domain mini は上記に加え、full-form 収載問題を常に候補から除外する。

### rev のライフサイクル

- 同一 ID + rev++ は editorial fix のみ。正解・選択肢の意味・前提・問う概念の変更は新 ID + 旧 ID retired
- retired でも DB 履歴行は削除しない

### mock_forms.yaml と validator 条件

```yaml
forms:
  - id: form-a
    exam: ccar-f
    scenario_ids: [sc-1, sc-2, sc-3, sc-4]
    question_ids: [ ...60 件、出題順 ]
```

validator: 60 問 / ドメイン配分 16-11-12-12-9 / form 間の問題重複なし / 全問 eligible_modes に mock を含む / **全問 scenario_id != null** / **各問の scenario_id ∈ form.scenario_ids** / **実使用 scenario_id 集合 = form.scenario_ids(完全一致)** / Step 0 で「各 15 問」が公式確認できた場合のみ各シナリオ 15 問も検証(未確認なら件数を固定しない)。

## 2. 進捗 DB(Postgres)

数値は double precision。mode / exam / reason / status / kind は enum または CHECK で TypeScript union と一致させる。

### srs_state — ts-fsrs 5.4.1 Card の lossless 永続化

```sql
create table srs_state (
  question_id text primary key, exam text not null,
  due_at timestamptz not null,
  stability double precision not null, difficulty double precision not null,
  elapsed_days int not null, scheduled_days int not null,
  reps int not null, lapses int not null, learning_steps int not null,
  state smallint not null,               -- ts-fsrs State enum 値のみ
  last_review_at timestamptz,
  updated_at timestamptz not null default now()
);
```

**生成タイミング(重要)**: 表示時・キュー生成時には作成しない。**最初の SRS rating がサーバーに commit されるまで、その問題は new**。初回回答保存時、行が無ければサーバー内で `createEmptyCard()` を一時生成 → Rating 適用後の Card を attempt と同一トランザクションで INSERT。「SRS 導入済み」= committed srs_state 行の存在。

### attempt — 追記専用ログ

```sql
create table attempt (
  attempt_id uuid primary key,           -- 学習回答: クライアント生成 / mock: サーバー生成
  question_id text not null, question_rev int not null,
  exam text not null,
  mode text not null,                    -- drill | practice | mock
  session_id uuid,
  applied_rating smallint,               -- 実際に ts-fsrs に渡した Rating。非更新は null
  is_correct boolean, chosen text[], elapsed_ms int,
  answered_at timestamptz not null default now()
);

create unique index attempt_mock_session_question_uq
  on attempt(session_id, question_id) where mode = 'mock';
```

### 学習回答の書込プロトコル(drill / practice — 厳密 ACK 方式・唯一の実装)

durable client outbox は実装しない。クライアントは正誤・解説を即時表示してよいが、**保存 ACK 受信前は Next を活性化しない**。失敗時は現在問題に留まり Retry(自動巻き戻し UI なし)。

サーバー処理順序:

1. session / auth / payload validation
2. attempt_id が既存なら既存 payload と照合。一致 → 即 200(再適用しない)、不一致 → 409
3. 現在の srs_state を取得(無ければ createEmptyCard)
4. サーバー側で correctness / rating を確定し、ts-fsrs を実行
5. Neon HTTP の non-interactive transaction で attempt INSERT + srs_state INSERT/UPDATE を原子的に実行
6. attempt PK 競合で rollback した場合、既存 attempt を再取得し同一 payload なら 200

**禁止**: `INSERT ... ON CONFLICT DO NOTHING` の後で無条件に srs_state を更新する実装(ACK 喪失リトライで SRS が二重適用される)。

### exam_session / exam_session_answer

```sql
create table exam_session (
  id uuid primary key, exam text not null,
  kind text not null,                    -- full | domain_mini | half
  form_id text, domain_id text,
  question_ids text[] not null,
  status text not null,                  -- in_progress | submitted | abandoned
  submission_reason text,                -- null | manual | timeout
  started_at timestamptz not null,
  deadline_at timestamptz,
  current_index int not null default 0,
  finished_at timestamptz, score_raw int
);

create table exam_session_answer (
  session_id uuid not null references exam_session(id),
  question_id text not null,
  question_rev int not null,             -- 開始時に snapshot
  chosen text[],                         -- null = 未回答
  flagged boolean not null default false,
  answer_updated_at timestamptz,         -- 回答変更時のみ更新
  updated_at timestamptz not null,
  primary key (session_id, question_id)
);
```

- **セッション開始時に全問題分の行を一括生成**し、question_rev をその時点でスナップショット(模試中の deploy に影響されない)
- full は abandon 不可(manual / timeout 提出のみ)。domain mini のみ abandon 可
- deadline 超過の検知時は submission_reason='timeout' で提出処理(独立した expired 状態は持たない)

### Mock の attempt 生成(提出時一括)

模試実施中は attempt を生成しない(回答状態は exam_session_answer のみ)。manual / timeout 提出時に 1 トランザクションで:

1. final の exam_session_answer から score_raw を計算
2. 全問題について attempt を 1 行ずつ生成: mode='mock'、applied_rating=null、未回答は chosen=null・is_correct=false。answered_at は回答済みなら answer_updated_at、未回答なら finished_at。question_rev は snapshot 値
3. attempt 一括 INSERT + exam_session の terminal 更新(status/submission_reason/finished_at/score_raw)
4. 冪等性は attempt_mock_session_question_uq で保証(提出リトライは既提出を検知して 200)

### question_flag

```sql
create table question_flag (
  id uuid primary key,
  question_id text not null, question_rev int not null,
  reason text not null,                  -- ambiguous | wrong | outdated
  memo text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index question_flag_one_open
  on question_flag(question_id, question_rev) where resolved_at is null;
```

- 出題除外は「現行 rev と一致する未解決フラグ」のみ
- **現行 rev と不一致の旧フラグは superseded** とみなし、出題除外・未解決一覧から自動的に外れる。resolved_at の更新は任意の履歴整理であり、バンク deploy の成功条件にしない
- 同一 rev の再フラグは既存 open 行の update(reason/memo)

### 間違いノート(attempt からの導出)

- 対象 mode: practice / mock
- 問題ごとに answered_at 順で走査し、is_correct=false が 1 回以上かつ最新の連続正解数 < 3 のものを掲載。3 連続正解で自然消滅、再誤答で自然復帰(状態レス)
- holdout は attempt 生成タイミング(mock 提出時)により自動的に守られる

## 3. 併行利用・エクスポート

- PC/スマホは逐次利用前提。複数端末からの同時回答送信はサポート外(競合制御は実装しない)
- `/api/export`: 全テーブル + 未解決フラグ(現行 rev のみ)を JSON 出力

# 03. データモデル(v1.3)

**v1.3(2026-09-29, S-3)**: `content/ccar-p/`、出題プール判定の学習スコープ段、フォームの `(exam, form_id)` 識別、進行中セッションのスコープ非依存、`study_setting` テーブル、間違いノート・export の exam 絞り込みを追加。mock_forms の件数・配分は CCAR-F 固有と明記。

バンク = Git 内静的ファイル(ビルド時取込)、進捗 = Neon Postgres。スキーマの単一ソースは `src/lib/bank/schema.ts` の Zod discriminated union(TypeScript 型は z.infer、validate-bank.ts も同 schema を import)。本書の JSON/SQL は説明例。

## 1. 問題バンク(`content/`)

```
content/ccar-f/
  syllabus.yaml / scenarios.yaml / mock_forms.yaml / SOURCES.md
  questions/*.json (例: d1-flash.json / d1-agentic.json。ローダーはファイル名非依存)
content/ccar-p/              # v1.3。構成は ccar-f と同じ(ファイルの有無・シナリオ有無は CP0 / T-pmock で確定)
```

- exam ごとにディレクトリを分ける。**問題・syllabus(domain / task statement / topic)の ID** は exam 接頭辞(`f-` / `p-`)で全体一意(`src/lib/bank/schema.ts` の `EXAM_PREFIX`)。F からの流用は新 ID(`07`)
- **シナリオ ID(`sc-*`)とフォーム ID(`form-*`)は exam 内で一意**(接頭辞なし。F と P に同名の `form-a` があってよい)。フォームは常に `(exam, form_id)`、シナリオは `(exam, scenario_id)` で解釈する
- 各 question の `exam` はそのディレクトリの exam と一致する(validator で検証)
- `syllabus.yaml` の各 domain の `form_questions`(固定フォームのドメイン配分)は、固定フォーム配分が確定した exam(`src/lib/bank/schema.ts` の `FORM_DOMAIN_QUOTA` に値がある exam。現状 CCAR-F のみ)でのみ必須で、合計 = フォーム問題数・配分一致を検証する。配分が未確定の exam(CCAR-P は T-pmock で確定し D6-4 で反映するまで)は `form_questions` を**書かない**(書けば validator エラー。暫定配分の混入防止)。配分未確定の exam の `mock_forms.yaml` は validator が拒否する(D6-3)

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

0. **学習スコープ(v1.3)**: question.exam ∈ 現在の学習スコープ(§study_setting)。**新規の出題選定にのみ適用**する(日次キュー・Drill / Practice の出題・間違いノート・full / domain mini の**開始候補**)。**進行中の exam_session には適用しない**(下記 §exam_session)
1. **holdout ゲート(最優先の出題可否判定)**: 未提出(同じ `(exam, form_id)` を持つ submitted な full exam_session が存在しない)full form に収載された問題は、その正確な full form の実施以外では出題しない。Practice / Drill / domain mini / 間違いノートを含む。**フォームは常に `(exam, form_id)` で識別する**: 提出済み判定だけでなく、中間集計(未提出フォームの集合、holdout 対象問題集合)と新規ペースの `remaining_new` 算出でも `(exam, form_id)` をキーにする(F と P に同名の `form-a` があり片方だけ提出済みの場合に、もう片方の提出状態を取り違えないため。v1.3)
2. status = 'active'
3. 現行 rev の未解決フラグが存在しない(下記)
4. eligible_modes に当該 mode が含まれる
5. (SRS 文脈では)srs_eligible

domain mini は上記に加え、full-form 収載問題を常に候補から除外する。

### rev のライフサイクル

- 同一 ID + rev++ は editorial fix のみ。正解・選択肢の意味・前提・問う概念の変更は新 ID + 旧 ID retired
- retired でも DB 履歴行は削除しない

### scenarios.yaml(形式は 2026-08-24, C3a で確定)

```yaml
scenarios:
  - id: sc-support-triage          # ^sc-[a-z0-9-]+$
    title_en: "Customer Support Resolution Agent"
    context_en: |
      TechCorp is building an automated support agent ...(S-4 で折りたたみ表示する英語本文。複数段落可)
    refs:
      - https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview
```

- フィールドは `id` / `title_en`(非空)/ `context_en`(非空)/ `refs`(URL 1 件以上)の 4 つのみ。未知キーは Zod strict で拒否する
- シナリオ→ドメイン対応は独立フィールドとして持たない(当該 `scenario_id` を参照する question の `domain_id` から導出する)
- `title_en` / `context_en` は英語(問題文と同じ言語ポリシー)。一次ソースに準拠した自作とし、Exam Guide 本文の転記はしない(`07` の一次ソース主義)

### mock_forms.yaml と validator 条件

以下の件数・配分・シナリオ条件は **CCAR-F 固有値**。CCAR-P の構造(問題数・フォーム数・ドメイン配分・シナリオ有無・multiple-response の選択数)は T-pmock の冒頭で CP0 の記録をもとに本節へ追記する(停止条件: Mock のスコア)。exam 共通の条件は「form 間の問題重複なし(同一 exam 内)/ 全問 eligible_modes に mock を含む / 全問 form.exam と同じ exam / form の `(exam, id)` が一意」。

```yaml
forms:
  - id: form-a
    exam: ccar-f
    scenario_ids: [sc-1, sc-2, sc-3, sc-4]
    question_ids: [ ...60 件、出題順 ]
```

validator(CCAR-F): 60 問 / ドメイン配分 16-11-12-12-9 / form 間の問題重複なし / 全問 eligible_modes に mock を含む / **全問 scenario_id != null** / **各問の scenario_id ∈ form.scenario_ids** / **実使用 scenario_id 集合 = form.scenario_ids(完全一致)** / Step 0 で「各 15 問」が公式確認できた場合のみ各シナリオ 15 問も検証(未確認なら件数を固定しない)。

**Step 0 判定(2026-08-23, C0)**: Exam Guide v1.0 に各シナリオの問題数の記述は**なし**(`content/ccar-f/SOURCES.md` §1.1)。したがって各シナリオ 15 問検証は **OFF で確定**。validator はシナリオ内件数を検証せず、上記の scenario_id 整合のみ検証する。

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

durable client outbox は実装しない。クライアントは正誤・解説を即時表示してよいが、**保存 ACK 受信前に次問へ進まない**。失敗時は現在問題に留まり Retry(自動巻き戻し UI なし)。

送信タイミング(v1.2.3 / D4-4): MCQ は選択(複数選択は Answer)= 送信。flash の rating は **Next 押下時に確定送信**し、それまではクライアントローカルで変更できる(サーバーには何も送らない)。commit 後の attempt は不変で、rating の変更・取り消し API は設けない(同 attempt_id の別 payload は 409 のまま)。flash の `elapsed_ms` は**最初の評価タップまで**の時間(思い出すまでの時間)で、評価の変更や解説閲覧の時間は含めない。`attempt_id` は Next 押下時に生成する。

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
- **進行中セッションは学習スコープに依存しない(v1.3)**: 復元・回答保存・見直しフラグ・位置保存・manual / timeout 提出・attempt 一括生成は、セッションの `exam` と開始時に固定した `question_ids` / snapshot `question_rev` だけを使い、出題プールの判定(スコープ・holdout・flag・eligible_modes)を再評価しない。スコープ切替で進行中セッションが除外・再開不能になってはならない。新規開始の候補にだけスコープを適用する
- exam_session.exam は開始したフォーム(またはミニのドメイン)の exam。full の form_id は常に exam と組で解釈する

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
- 表示対象は学習スコープ内の exam の attempt のみ(v1.3)。連続正解の判定は問題ごとなので exam をまたがない

### study_setting(v1.3 / オーナー決定 2026-09-29)

学習スコープを保持する単一行テーブル。追加のみの migration で導入する(`06` cutover ルール)。

```sql
create table study_setting (
  id smallint primary key default 1 check (id = 1),   -- 単一行
  scope text not null,                                -- ccar-f | ccar-p | both
  updated_at timestamptz not null default now()
);
```

- 行が無い場合の実効値は `ccar-f`(S-3 以前の挙動と同一)。初回切替時に INSERT、以後 UPDATE
- scope の変更は本テーブルの 1 行のみを書く。srs_state / attempt / exam_session / exam_session_answer / question_flag は一切変更しない
- scope に含まれる各 exam は試験日(exam ごとのコード定数)を持たなければならない。未設定の exam を含む scope への変更はサーバーで拒否する(fail closed)
- 認証済みセッションのみ変更可(他の write API と同じ境界)

## 3. 併行利用・エクスポート

- PC/スマホは逐次利用前提。複数端末からの同時回答送信はサポート外(競合制御は実装しない)
- `/api/export`: 全テーブル + 未解決フラグ(現行 rev のみ)を JSON 出力。既定は全 exam(study_setting を含む)
- `/api/export?exam=ccar-f|ccar-p`(v1.3): exam 列を持つ全テーブルをその exam の行に絞り(exam_session_answer は親 session の exam、question_flag は question_id の exam 接頭辞で判定)、study_setting は含めない。学習スコープの切替前後で同じ exam の export が一致することを検証に使う(`09` M9)

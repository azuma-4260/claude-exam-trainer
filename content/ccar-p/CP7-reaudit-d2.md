# CP7 再監査レポート: p-d2(Claude Models, Prompting & Context Engineering)

対象: `content/ccar-p/questions/d2-flash.json` / `d2-mcq.json`。変更した新規・改訂行はすべて `status: flagged`。

## 1. flash 再監査

19 枚を全件読み、「定義の想起だけ」に明確に該当するものだけを replace した(2 枚 = 約 1 割)。それ以外は、状況(チーム・症状)に対して適用する形か、設計判断の理由を問う形のため keep(曖昧なものは残す方針)。

| 旧 ID | 判定 | 理由 | 新 Drill MCQ ID | 補充 flash ID |
|---|---|---|---|---|
| p-d2-q007 (t2-02) | replace | 「テンプレートの変数がどう差し込まれるか(f-string の placeholder と `<request>` タグ)」は docs の実装例の想起で、状況への適用が要らない | p-d2-q601 | p-d2-q020(複数の可変レポートをタグで区分する適用型) |
| p-d2-q014 (t4-02) | replace | 「どの技法がどの場面に向くか」の対応表の想起(note-taking ↔ マイルストーン、compaction ↔ 往復)で、適用が要らない | p-d2-q602 | p-d2-q021(compaction プロンプトを再現率優先 → 精度の順で調整する適用型) |
| 上記以外の 17 枚 (q001-006, 008-013, 015-019) | keep | 状況つきで適用を問う、または理由・手順を問うため | - | - |

- 件数: 旧 live 19 → 新 live 19(retired 2、新規 flash 2)。全 topic(p-d2-t1-01 … t5-03 の 15 topic)に live の flash が 1 枚以上残る(t2-02 は q020、t4-02 は q021 が受け皿)
- audit:flash: d2 の違反は新規 q020 / q021 の `status flagged(期待 active)` のみ。これは flagged で追加する指示どおりの意図した状態で、active 化は Step 4 の周回後

### B-CP2-2 の突合(F バンクとの重なり・変わりやすい機能)

| ID | 突合結果 | 処置 |
|---|---|---|
| p-d2-q014 | F の f-d5-q001(compaction で数値が崩れる)/ q002(構造化メモで事実を保持)/ q015(scratchpad)と事実の核が強く重なる | **replace 済み**(上記)。Drill MCQ q602 は同じ題材(note-taking の適用)で F f-d5-q002 に近く、p-d2-t4-02 の scope が F と構造的に重なるため残る重なり |
| p-d2-q021(新規) | F f-d5-q001 は「要約で正確な値が崩れる原因」、q021 は「compaction プロンプトの調整順序(再現率 → 精度)」で観点が別 | 処置なし |
| p-d2-q019 | F の f-d3-q011 / q036(skill は on-demand で読み込まれる)と「必要時に読み込まれる」という核が近い。P 側は API 側の段階的開示(name/description → 本文 → 付属ファイル)と多数の Skill の許容 | **keep**。Step 4 で f-d3-q011/q036 を実際に突合し、核が別と確認(根拠: f-d3-q011/q036 は CLAUDE.md と skill の置き場所の選択、P は 3 段階の段階的開示で核が別。f-d5-q002 は構造化メモで q602 側の論点)。defer ではなく keep |
| p-d2-q009 | F の f-d4-q006〜q010(few-shot)と topic は重なるが、P は「例の関連性・多様性の検査と生成」で観点が別 | 処置なし |
| 変わりやすい機能 | d2 の flash には temperature・budget_tokens・Priority Tier・task budget などを中心にしたカードは無い(q010 の thinking 課金、q011 の effort は設計原則側の記述) | 処置なし |

## 2. 独立 MCQ 再監査(q501〜q510 の全 10 問)

構造化解説フィールドの埋め戻し、difficulty の付け直し、禁止パターン検査を全問に実施した。

| 旧 ID | 処置 | 変更点 | 新 ID | ID 判定の根拠 |
|---|---|---|---|---|
| p-d2-q501 | rev++(1→2) | binding_constraint_ja と A/B/D の plausible_ja / not_best_ja を追加。difficulty 3→2(技術は 1 つで、制約は評価で決まる)。解説をモデル名なしで binding constraint 中心に再構成 | - | 追加・付け直しのみで、正解・選択肢・前提・概念は不変 |
| p-d2-q502 | rev++(1→2) | 構造化解説の埋め戻し(B/C/D)。difficulty は 3 のまま(費用・紛争品質・経路別評価の複数制約) | - | 同上 |
| p-d2-q503 | **新 ID + retired** | stem の前提を変更。旧は「手動 thinking + 強制 tool 使用で JSON を出す」構成だが、docs 上 thinking と強制 tool 使用は併用できず前提に疑義があるため、「長期チューニング済みのプロンプトと固定 thinking budget」に変更。解説から「新しい世代では budget_tokens が 400」という時点依存の記述を削除し、「移行ガイド確認 + 自前評価の再実行」という手順で決まる形にした(B-CP3-2)。difficulty 3→2 | p-d2-q511 | stem の前提変更 |
| p-d2-q504 | **新 ID + retired** | 誤答 A の "alone"、D の "no prompt restructuring is then necessary" など断定語だけで消せる選択肢を作り直し。A=入力フィルタ(多層防御の一層としては妥当)、B=指示の再掲、C=出力検査(新規。特定値の漏えい検出としては妥当)、D(正解)に差し替え。difficulty 2 | p-d2-q512 | 誤答の差し替え(選択肢の意味が変わる) |
| p-d2-q505 | rev++(1→2) | 構造化解説の埋め戻し(B/C/D)。difficulty 2→1(「沈黙時は分からないと答える許可を与える」という知識の直接適用)。誤答は「別条件なら妥当」な形で plausible_ja に記述 | - | 追加・付け直しのみ |
| p-d2-q506 | **新 ID + retired** | 誤答 A の "always improves accuracy"(断定語)、D の「高 temperature で多数決」(temperature は新しいモデルで設定不可になりうる時点依存、B-CP3-2)を差し替え。A=最大深度の固定、C=法域ごとの並列分割(過剰設計)、D=固定手順。difficulty 3→2 | p-d2-q513 | 誤答の差し替え |
| p-d2-q507 | **新 ID + retired** | 誤答 B の "general remedy"、C の "which is a technique meant for long documents"(誤りの理由が選択肢文に書かれている)を作り直し。A=段階的推論(別条件なら妥当)、B=引用先行、D=文単位分類。difficulty 2→1 | p-d2-q514 | 誤答の差し替え |
| p-d2-q508 | **新 ID + retired** | 誤答 A「compaction を止めて最初からやり直す」(現実に選ばない)と C の "so that no separate files ... at all"(断定語)を作り直し。A=compaction に頼る、B=ツール結果クリア、D=手動の要約受け渡し。difficulty 3→2 | p-d2-q515 | 誤答の差し替え |
| p-d2-q509 | **新 ID + retired** | 誤答 C「短くすればキャッシュされやすい」(根拠が薄い)と D の "always" 的な言い回しを作り直し。C を「2 つ目のブレークポイントを後ろに足す」(累積ハッシュの理解を問う)に差し替え。difficulty 3→2 | p-d2-q516 | 誤答の差し替え |
| p-d2-q510 | **新 ID + retired** | 誤答 D(claude.ai の custom Skills は個人単位で共有されない、という時点依存の仕様)を原則ベースの「エージェントごとのコピーではずれが残る」に差し替え。誤答 B から description 1,024 文字の上限への依存も削除(B-CP3-2)。difficulty 2 のまま | p-d2-q517 | 誤答の差し替え(選択肢の意味が変わる) |

- 新 ID は q511〜q517(七問)、Select TWO は q518〜q519
- 正解ラベルの分散(独立 MCQ の単一選択 10 問): A 3 / B 2 / C 3 / D 2
- 全問 4〜5 択。単一選択の stem は 3 文以上の状況つき(q601/q602 の Drill のみ 2 文)
- `audit:choices`(flagged、d2-mcq.json)OK: 最長=正解 0/14、全問の正解長が最長の誤答の 0.83〜0.98 倍

## 3. バックログ対応

### B-CP2-2(d2 分)
- 解消: p-d2-q014(F の f-d5-q001/q002/q015 と強く重なる)を replace。変わりやすい機能への依存は d2 の flash に該当なし
- keep: p-d2-q019(Step 4 で F の f-d3-q011/q036 と突合し、核が別と確認)
- defer: Drill MCQ q602(F f-d5-q002 と題材が近い)

### B-CP3-1(原則からの推論にとどまる問題)
- 解消: p-d2-q510 → q517。核心(段階的な読み込み、description/本文/付属ファイル)は Skills overview と engineering ブログで直接裏付けられ、誤答の退け理由も原則ベースに修正
- defer: p-d2-q504 → q512。正解の核心の一部(信頼できない入力を JSON エンコードの枠に入れる)は docs の間接インジェクション節の記述で、直接入力への適用は推論にとどまる。許可ソース内に直接裏付ける ref が見つからず、解説に「推論」と明記したまま残す

### B-CP3-2(時点で変わる仕様を誤答の退け理由に使う)
- 解消: p-d2-q503 → q511(世代固有の "Claude 4.7 and later ... reject budget_tokens" と、強制 tool 使用との併用の前提を除去)/ p-d2-q510 → q517(claude.ai の custom Skills 共有仕様を原則ベースに)
- 解消(追加): p-d2-q506 → q513(temperature の多数決を除去)

## 4. 新規 Select TWO

| ID | topic | 狙った binding constraint | 2 つの正解とその独立した理由 |
|---|---|---|---|
| p-d2-q518 | p-d2-t4-01 | 原因は「ウィンドウに収まるか」ではなく、文脈が長く無関係な内容が多いほど精度が落ちることと、質問が文書の前にある配置。変えられるのはプロンプトの組み立てだけ | B: 関連箇所だけを選んで送る(量の問題)/ D: 文書を先頭、質問を末尾に置く(配置の問題)。誤答は、より大きなウィンドウ(収まっているので無関係)、extended thinking(量を減らさず遅延が増える)、質問の反復 |
| p-d2-q519 | p-d2-t5-02 | 全呼び出しで繰り返される静的なマニュアルと、一部の呼び出しだけが使う手順は性質が違い、再利用の仕組みを使い分ける | C: マニュアルを先頭に置いてキャッシュ(繰り返し処理コスト)/ E: 変換手順を Skill にする(必要な呼び出しでだけ読み込む)。誤答は、先頭に顧客名と日付を置く、マニュアルを Skill にする、手順を全呼び出しの system prompt に入れる |

q519 は flash p-d2-q018(caching か Skill か)と選択肢の対が近いが、2 つの異なる内容に別々の仕組みを当てる組合せ判断(difficulty 3)として観点を分けた。

## 5. 最終状態の件数

- flash live 数: 19(retired 2 を除く。active 17 + flagged 2)
- 独立 MCQ(q501〜帯)live 数: 12(single 10 + multi 2。active は q501・q502・q505 の rev 2 が flagged のため、status が active のものは 0、flagged 12)。retired は 7(q503, q504, q506〜q510)
- Drill 短問 MCQ(q601〜帯): 2(q601 / q602、いずれも flagged)
- mcq_multi 数: 2(q518 / q519)
- d2 全体の MCQ 行数: 21(live 14 = 独立 12 + Drill 2、retired 7)

## Step 4 1周目の修正

| 旧 ID | 処置 | 新 ID / rev |
|---|---|---|
| p-d2-q512 | editorial。正解 D から "JSON-encoded" を外し「固定テンプレート + タグ付きスロット」に変更(mitigate-jailbreaks の記述とのずれの解消)。stem に「給与データはモデルに渡る」前提を追加し、C(出力検査)と D(構造分離)を保守性の軸で分けた。解説に「完全な防御ではなく最小権限・出力検査との多層防御の 1 層」を明記。q601=基本、q512=信頼境界で役割を分離 | p-d2-q512 rev 2 |
| p-d2-q511 | editorial。refs に migrating-to-claude-4(台帳 #322)を追加。A/C/D の "since ..." 節を落として行動のみにし、not_best_ja を stem の事実(監査対象・固定 thinking budget)で退ける形に変更。choice-balance のため B のカンマを除去 | p-d2-q511 rev 2 |
| p-d2-q501 | editorial。A の "removes both the latency and the cost problem" を "reduces the input cost" に弱めた | p-d2-q501 rev 3 |
| p-d2-q502 | editorial。C の "without any measured validation" を "in its own answer, with no separate classifier in front" に弱め、not_best_ja を stem 基準に | p-d2-q502 rev 3 |
| p-d2-q505 | editorial。B の "since a general quality reminder also covers ..." を落とした | p-d2-q505 rev 3 |
| p-d2-q517 | 誤答 B の意味が変わる(全文を description → 手順の要約を長く description に書く)ため新 ID。旧を retired | p-d2-q520(flagged rev 1) |
| p-d2-q602 | 変更しない(flagged のまま)。f-d5-q002 と事実の核が同一、P 内 q515 と判断が重複、stem が元記事の対応表の文言そのまま。オーナー判断(retire のみ / 別判断に差し替え)待ち | 変更なし |
| p-d2-q019 | カード変更なし(上記の keep) | 変更なし |

- B-CP3-1 の q504 → q512: JSON エンコードの記述を外したため、残っていた「推論」依存は解消(正解の核は prompt-templates のタグ分離)
- live 数は不変(独立 MCQ 12 + Drill 2 = 14、retired は q517 追加で 8)。全カード flagged を維持
- 検証: validate-bank OK、audit-choice-balance OK(最長=正解 0)、audit-practice-mcq OK(`--counts 14,12,15,13,12,12,12`)

## 検証

- `npx tsx scripts/validate-bank.ts`: ccar-p OK(警告は p-d7 の問題数偏差のみ。他ドメインの担当分)
- `npm run audit:flash -- --exam ccar-p`: d2 の違反は q020 / q021 の status flagged(意図した状態)のみ
- `npx tsx scripts/audit-choice-balance.ts --exam ccar-p --status flagged --file d2-mcq.json`: OK
- 件数メモ: `audit:practice` の P 用 `--counts`(CP3-allocation.md では d2=10)は、d2 の live が 12 になったため、統括者側で 12 に更新が必要

## Step 4 2周目の修正

| 旧 ID | 処置 | 新 ID / rev |
|---|---|---|
| p-d2-q501 | editorial。stem に "The team keeps a labeled set of past emails." を追加(C・binding_constraint・B の not_best が前提にしていた既存ラベル付きメールを stem で明示)。A の not_best_ja は「主因は出力生成」の断定を弱め、「最上位 tier のままでは固定プレフィックスの入力処理以外(出力生成)の遅さと費用が残る」に | p-d2-q501 rev 4 |
| p-d2-q512 | 誤答 C が「給与を含む返信を一律遮断」で、承認された照会まで塞ぐため現実には選ばれない。C を「照会者本人以外の給与を含む返信を遮断する出力検査」に変更(誤答の意味が変わる)。not_best_ja・binding_constraint も stem の事実(承認された照会で給与がモデルに渡る)に合わせた。新 ID、旧を retired | p-d2-q521(flagged rev 1) |
| p-d2-q511 | editorial。refs の migrating-to-claude-4 が目次ページへリダイレクトされ thinking の変更点を原文確認できないため、解説の「移行ガイドで thinking の設定の変更点を確認」を「対象モデルの移行ガイドで変更点を確認」に一般化 | p-d2-q511 rev 3 |
| p-d2-q602 | 触らない | 変更なし |

- live 数は不変(q512 → q521 の置換。retired は 9)。全カード flagged を維持

## 8. p-d2-q602 の処置(Step 4 完了時・オーナー決定 2026-10-19)

p-d2-q602 は f-d5-q002 と事実の核が同一で、P 内の q515 とも判断が重複し、stem が元記事の対応表の文言そのままだった。オーナー決定で retired(status のみ変更)。d2 の Drill は q601 の 1 問になる。

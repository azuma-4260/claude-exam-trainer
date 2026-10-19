# CP7 再監査記録: p-d5(Governance, Safety & Risk Management)

対象: `content/ccar-p/questions/d5-flash.json` / `d5-mcq.json`。編集した問題は全て status flagged(retired を除く)。

## 1. flash 表

全 21 枚を読み、定義・列挙・事実の想起だけで答えられるカードのみを置換対象にした(上限 1 割 = 2 枚)。曖昧なカード(q004 / q007 / q010 / q013 / q014 / q015 / q020 / q021 など)は残した。

| 旧 ID | 判定 | 理由 | 新 Drill MCQ | 補充 flash |
|---|---|---|---|---|
| p-d5-q008 | replace | CISO ガイドの 4 つの質問のうちどれか、という列挙の想起だけ。状況への適用が要らない | p-d5-q601(t2-03。ログで区別も SIEM 記録もできない状況で最初に直す点を問う) | p-d5-q022(t2-03。匿名顧客のチケットを読み返金 DB に書ける agent のリスクを least agency で限定する) |
| p-d5-q011 | replace | 「LLM-as-judge を何と較正するか」の単純想起 | p-d5-q602(t3-02。judge の採点を信頼する前にすることを問う) | p-d5-q023(t3-02。安定稼働した judge で人間レビューを全廃してよいかを問う) |
| その他 19 枚 | keep | 状況への適用、または理由・設計判断を問う | - | - |

集計: live 21 枚 → 21 枚(2 枚 retired、2 枚追加)。全 15 topic に live の flash が残る(audit:flash で d5 の被覆エラーなし)。retired は履歴として id 連番に含まれる(q001〜q023)。

B-CP2-2 の突合(content/ccar-f/questions を grep):
- p-d5-q002(PreToolUse hook と deny ルール)は F の f-d1-q031〜033 / q050(hook による強制)と近いが、問うのは「hook の allow が deny ルールを覆さない」点で別観点。処置なし。
- p-d5-q013(Citations)は F の f-d5-q020(multi-agent の citations 付与)と製品名が重なるが、問う内容は別。処置なし。
- p-d5-q006 / 011 / 012 / 019 等に F と強く重なる近接カードは見つからなかった。
- p-d5-q017(FedRAMP / IL の提供範囲)は変わりやすい前提を持つ。docs / 発表の現状確認は本セッションでは行っていないため **defer**(処置なし)。

## 2. MCQ 表(独立 MCQ q501〜)

difficulty は新定義(1 知識の適用 / 2 制約判断 / 3 アーキテクチャのトレードオフ)。lifecycle_phase は phase-gate 問題がないため全問未設定。

| 旧 ID | 処置 | 変更点 | 新 ID | ID 判定の根拠 |
|---|---|---|---|---|
| q501 | rev 2(flagged) | 構造化解説を埋め戻し(A/B/C)。explanation_ja を正解理由 + 原則に絞る。difficulty 2→2 | - | 選択肢・正解・前提は不変。editorial fix |
| q502 | rev 2(flagged) | 構造化解説を埋め戻し。B の「single rule covers every wording」という断定語を除去し「the instruction already tells the model how to handle them」に表現修正。difficulty 3→2(単一の binding constraint) | - | B の意味(プロンプト指示だけの 1 層)は不変で表現のみの修正 |
| q503 | 新 ID + retired | C「権限を広げて自己修復」はこのシナリオでは危険寄りで plausible_ja が書けない。事後の突合レポート(検知止まりで予防ではない)に差し替え。ラベル順を並べ替え正解 B→C。difficulty 2→2 | q511 | 誤答の差し替え = 選択肢の意味の変更 |
| q504 | rev 2(flagged) | 構造化解説を埋め戻し。difficulty 3→2 | - | 内容不変 |
| q505 | rev 2(flagged) | 構造化解説を埋め戻し(judge 変更で閾値の根拠が失われる点を binding constraint に)。difficulty 3→3 | - | 内容不変 |
| q506 | rev 2(flagged) | 構造化解説を埋め戻し。誤答 C を退ける理由を「inference_geo の取りうる値(global / us のみ)」から「US 固定は EU 内処理の要件と逆」という原則ベースに変更(B-CP3-2)。提供経路の対応地域は時点で変わるため採用時に docs で確認する旨を追記。difficulty 3→2 | - | 選択肢・正解は不変で、解説の退け理由の修正のみ |
| q507 | 新 ID + retired | stem の「code execution tool に依存」(時点で変わる対象外機能の表)を「HIPAA 対象と明記されていない beta 機能に依存」に変更(stem の前提変更)。誤答 C(Console の playground)を、氏名のマスクだけで BAA を省く案に、誤答 D を実データで試作して BAA を後回しにする案に差し替え。5 択化し正解は E。difficulty 3→2 | q512 | stem の前提変更と誤答の差し替え |
| q508 | 新 ID + retired | 誤答 D(global endpoint で可用性、認可水準と無関係でありえない)を「販売上の位置づけを認可の証拠とみなす」案に差し替え。ラベル順を並べ替え正解 B→C。difficulty 2→2 | q513 | 誤答の差し替え(ありえない誤答の作り直し) |
| q509 | rev 2(flagged) | 構造化解説を埋め戻し。A の「treat the matter as settled」の断定表現を除去。difficulty 3→2 | - | 内容不変、表現修正のみ |
| q510 | rev 2(flagged) | 構造化解説を埋め戻し。citations を知っていれば直接解けるため difficulty 2→1 | - | 内容不変 |
| (追加) | 追加 | 新規 Select TWO | q514, q515 | 下記 4 |
| (追加) | 追加 | Drill 短問 MCQ(flash 置換分) | q601, q602 | 下記 5 |

注: 旧 q503 / q507 / q508 は status を "retired" にしただけで他のフィールドは変えていない。

## 3. バックログ対応

- **B-CP3-2(d5 分)**: p-d5-q506 は解説の退け理由を原則ベースに修正(rev 2)で解消。p-d5-q507 は stem の前提から code execution の対象外という製品仕様依存を外した q512 に置換して解消(旧 retired)。
- **B-CP3-1(d5 分)**: 台帳 CP3-allocation の「ref が原則までしか支えない」に挙がる q503 / q504 / q505 / q509 は、explanation_ja で ref が直接述べる部分と問いでの推論を分けて明記した。q503 → q511 は building-effective-agents の「各ステップの ground truth とチェックポイントでの人間確認」を直接の根拠にしている。q504・q509 は Anthropic の research(是認しない用途・属性だけを変える手法)が根拠。q505 の「judge を替えると較正の根拠が失われる」は設問での推論のまま(解説に明記)。新しい URL は追加できないため、これらの推論部分の直接の ref 追加は **defer**(B-CP2-1 の許可ソース判断待ちのまま)。
- **B-CP2-2(d5 分)**: p-d5-q017 の FedRAMP / IL 前提は docs の現状確認をしておらず **defer**。F との近接カードは突合の結果、処置が必要なものは無し。p-d5-q508 は時点依存の認可状況に依存していたが、検証手順を問う q513 に置換して解消。

## 4. 新規 Select TWO

- **p-d5-q514**(t1-02、答え B, E、難易度 2): binding constraint は「モデルが指示を無視・誤読しても効く統制が必要」。deny の permission ルール(既知の禁止呼出しを実行前に遮断)と OS の sandbox(許可済みコマンドが名前以上のことをしても境界を保つ)が独立した理由で必要。誤答はプロンプトの禁止リスト拡充、PostToolUse hook でのログ記録(事後確認)、別 Claude インスタンスによる承認(確率的な審査)。
- **p-d5-q515**(t5-03 + secondary t1-02、答え C, D、難易度 3): binding constraint は「責任の帰属を、本人が見ている自分の資格情報での操作か、単一目的の専用 ID で動く操作のどちらかに明確にする」。専用の最小権限 service account(無人 agent)と、人の資格情報で動かす場合の本人の責任の明示が、別々の使い方に対する別々の理由で必要。誤答は共有管理者アカウント、本人の委任された ID を夜間 agent に持ち込む案、ログの justification を責任の所在とみなす案。

## 5. 最終状態

- flash live: 21(旧 21)。retired 2、新規 flagged 2(q022, q023)
- 独立 MCQ live(retired 除く・flagged 含む): 12(q501, 502, 504, 505, 506, 509, 510 = rev 2、q511〜q515 = 新規)。retired 3(q503, q507, q508)
- Drill 短問 MCQ: 2(q601, q602)
- mcq_multi: 2(q514, q515)
- 正解ラベル(独立 MCQ live): D3 / A3 / C3 / E1 + multi の BE・CD

## 検証

- `validate-bank`: d5 のエラーなし(ccar-p 全体の NG は他ドメインの d2-mcq.json の構造化解説の不備による。担当外)
- `audit:flash -- --exam ccar-p`: d5 の NG は新規 q022 / q023 の status が flagged(`--status active` 期待)のみ。形式・被覆・連番・refs の違反なし
- `audit-choice-balance` / `audit-practice-mcq`(d5 のみのコピーで実行): どちらも OK、warnings 0

## Step 4 1周目の修正

すべて editorial fix(意味不変、rev+1、flagged 維持)。

- **p-d5-q502**(rev 2→3): 誤答 B 末尾の自白句を中立な文に変更。誤答 D 末尾を「既に設定・承認済みだから」という運用理由に差し替え。stem の問いを "Which approach best limits the damage if an injection succeeds?" に中立化。正解 A・誤答の意味は不変。
- **p-d5-q504**(rev 2→3): explanation_ja から building-effective-agents の「最も単純な解から始める」の一文を削除し、根拠を Anthropic の discrimination research(高リスクな適格性判断で自動判断を是認しない)に寄せた。台帳 §12/§13 に載っている当該 URL は既に refs にあり、根拠から外れた building-effective-agents を refs から削除。選択肢は不変。
- **p-d5-q023**(rev 1→2): answer_en / explanation_ja を「安定して見えても judge は人間の判断から気づかれずにずれうるため、人間レビューを残す」という理由寄りに書き換え(答えは不変)。Drill q602 との近さを下げる目的。

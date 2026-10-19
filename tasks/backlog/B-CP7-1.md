---
id: B-CP7-1
origin: CP7
created: 2026-10-19
status: open
related_tasks: [CP6, CP7]
related_specs: ["07#step-6-継続改訂ループ", "07#ccar-p-フェーズf-合格後v13-で詳細化"]
related_paths: [content/ccar-p/questions, content/ccar-p/CP7-reaudit-d1.md, content/ccar-p/CP7-reaudit-d2.md, content/ccar-p/CP7-reaudit-d3.md, content/ccar-p/CP7-reaudit-d4.md, content/ccar-p/CP7-reaudit-d5.md, content/ccar-p/CP7-reaudit-d6.md, content/ccar-p/CP7-reaudit-d7.md]
stop_condition: none
---
# CP7 再監査で defer した P バンクの残課題(docs 改訂確認・推論止まりの MCQ・F との近接)

## 内容
ドメイン別の再監査記録(`content/ccar-p/CP7-reaudit-d{1..7}.md`)の「バックログ対応」節が一次情報。要点:

- B-CP2-2(変わりやすい機能への依存)の defer: p-d1-q006/q016/q022、p-d3-q004/q005/q008/q012、p-d4-q016/q017/q019/q020/q021(Drill p-d4-q602 は retired)、p-d5-q017、p-d6-q019/q020。現行 docs との突合は未実施
- B-CP2-2(F との近接)の defer: p-d1-q022(f-d1-q035 と近い。兆候が出るまで維持)。p-d2-q019 は CP7 の Step 4 で f-d3-q011/q036 と突合し核が別と確認(keep、本項目から除外)。p-d2-q602 は retired(オーナー決定 2026-10-19)
- B-CP3-1(推論止まり)の defer: p-d1-q505、p-d2-q512、p-d3-q502、p-d5-q505、p-d6-q506/q507/q508/q512/q515。解説に「推論」と明記済み。許可ソースに直接の記述が見つかれば ref を追加
- B-CP3-1 の注意: p-d7-q513 の正解は playbook の段階的対応の類推を含む

## 推奨対応
CP6(Step 6 継続改訂ループ)で docs の改訂を確認し、変わっていれば editorial fix(rev++)。直接 ref が見つからない推論止まりの問題は、差し替えるか「推論」明記のまま許容するかをオーナーが判断する。

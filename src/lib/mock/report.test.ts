import { describe, expect, it } from "vitest";
import type { ExamSessionRow } from "@/db/schema";
import { mcq, syllabus } from "@/lib/queue/test-fixtures";
import { buildMockReport, isRehearsal, type MockAttempt, type SubmittedFullSession } from "./report";

// D3-3: S-6 模試レポートの導出(specs/05 S-6、01 FR-5)。
// 正誤の単一ソースは提出時一括生成の attempt。ここでは再採点しないことを前提に検証する。

const NOW = new Date("2026-08-27T10:00:00+09:00");
const MIN = (m: number) => new Date(NOW.getTime() + m * 60_000);

// syllabus fixture は f-d1(weight 60)/ f-d2(weight 40)の 2 ドメイン
const Q1 = mcq("f-d1-q001"); // answer ["B"]
const Q2 = mcq("f-d1-q002", {
  type: "mcq_multi",
  answer: ["A", "B"],
  stem_en: "Select TWO transports the MCP server should use.",
});
const Q3 = mcq("f-d2-q001");
const Q_REV2 = mcq("f-d1-q003", { rev: 2 });
const Q4 = mcq("f-d2-q002");
const BANK = new Map([Q1, Q2, Q3, Q_REV2, Q4].map((q) => [q.id, q]));
const findQuestion = (id: string) => BANK.get(id) ?? null;

const session = (over: Partial<ExamSessionRow> = {}): ExamSessionRow => ({
  id: "sess-b",
  exam: "ccar-f",
  kind: "full",
  formId: "form-a",
  domainId: null,
  questionIds: [Q1.id, Q2.id, Q3.id],
  status: "submitted",
  submissionReason: "manual",
  startedAt: NOW,
  deadlineAt: MIN(120),
  currentIndex: 0,
  finishedAt: MIN(100),
  scoreRaw: 1,
  ...over,
});

const prior = (over: Partial<SubmittedFullSession> = {}): SubmittedFullSession => ({
  id: "sess-a",
  exam: "ccar-f",
  kind: "full",
  formId: "form-a",
  status: "submitted",
  startedAt: MIN(-300),
  finishedAt: MIN(-200),
  ...over,
});

const att = (questionId: string, over: Partial<MockAttempt> = {}): MockAttempt => ({
  questionId,
  questionRev: 1,
  isCorrect: false,
  chosen: null,
  ...over,
});

describe("isRehearsal", () => {
  it("同一 (exam, form) の先行 submitted full があれば rehearsal", () => {
    expect(isRehearsal(session(), [prior()])).toBe(true);
  });

  it("先行セッションが無ければ initial(自分自身は除外される)", () => {
    expect(isRehearsal(session(), [])).toBe(false);
    expect(isRehearsal(session(), [prior({ id: "sess-b", finishedAt: MIN(-200) })])).toBe(false);
  });

  it("別 form・別 exam・kind≠full・後から終了したものは数えない", () => {
    expect(isRehearsal(session(), [prior({ formId: "form-b" })])).toBe(false);
    expect(isRehearsal(session(), [prior({ exam: "ccar-p" })])).toBe(false);
    expect(isRehearsal(session(), [prior({ kind: "domain_mini" })])).toBe(false);
    expect(isRehearsal(session(), [prior({ finishedAt: MIN(200) })])).toBe(false);
  });

  it("finished_at 同時刻は id 昇順で先行を決める(決定的)", () => {
    const same = prior({ id: "sess-a", finishedAt: MIN(100) });
    expect(isRehearsal(session({ id: "sess-b" }), [same])).toBe(true);
    expect(isRehearsal(session({ id: "sess-0" }), [same])).toBe(false);
  });

  it("formId が無い(domain_mini 等)セッションは rehearsal 対象外", () => {
    expect(isRehearsal(session({ kind: "domain_mini", formId: null }), [prior()])).toBe(false);
  });
});

describe("buildMockReport", () => {
  const build = (over: Partial<ExamSessionRow>, attempts: MockAttempt[], priors: SubmittedFullSession[] = []) =>
    buildMockReport({ session: session(over), attempts, priorSessions: priors, findQuestion, syllabus });

  const ATTEMPTS = [
    att(Q1.id, { isCorrect: true, chosen: ["B"] }),
    att(Q2.id, { isCorrect: false, chosen: ["A", "C"] }),
    att(Q3.id, { isCorrect: false, chosen: null }), // 未回答
  ];

  it("素点は score_raw を正とし、null のときだけ attempt から導出する", () => {
    expect(build({}, ATTEMPTS).scoreRaw).toBe(1);
    expect(build({ scoreRaw: null }, ATTEMPTS).scoreRaw).toBe(1);
    expect(build({}, ATTEMPTS).total).toBe(3);
  });

  it("ドメイン別集計は syllabus の全ドメインを順序どおり返す(出題 0 のドメインも行を持つ)", () => {
    const report = build({ questionIds: [Q1.id, Q2.id] }, ATTEMPTS.slice(0, 2));
    expect(report.domains).toEqual([
      { domainId: "f-d1", name: "Domain 1", weight: 60, total: 2, correct: 1 },
      { domainId: "f-d2", name: "Domain 2", weight: 40, total: 0, correct: 0 },
    ]);
  });

  it("誤答一覧は出題順で、未回答・改訂・正答/選択を含む", () => {
    const report = build({}, ATTEMPTS);
    expect(report.wrong.map((w) => w.questionId)).toEqual([Q2.id, Q3.id]);
    const [w2, w3] = report.wrong;
    expect(w2).toMatchObject({ position: 2, unanswered: false, chosen: ["A", "C"], correct: ["A", "B"], revChanged: false });
    expect(w2.stemEn).toBe(Q2.stem_en);
    expect(w2.explanationJa).toBe(Q2.explanation_ja);
    expect(w3).toMatchObject({ position: 3, unanswered: true, chosen: [], correct: ["B"] });
  });

  it("attempt が欠落した問題は未回答の誤答として扱う(防御)", () => {
    const report = build({}, ATTEMPTS.slice(0, 2));
    const w3 = report.wrong.find((w) => w.questionId === Q3.id);
    expect(w3).toMatchObject({ unanswered: true, chosen: [], revChanged: false });
  });

  it("attempt の rev snapshot が現行 rev と違えば revChanged", () => {
    const report = build({ questionIds: [Q_REV2.id], scoreRaw: 0 }, [att(Q_REV2.id, { questionRev: 1 })]);
    expect(report.wrong[0].revChanged).toBe(true);
  });

  it("バンクに無い問題は unknownQuestionIds に集め、ドメイン集計から除外する", () => {
    const report = build({ questionIds: [Q1.id, "f-d1-q404"] }, [
      att(Q1.id, { isCorrect: true, chosen: ["B"] }),
      att("f-d1-q404"),
    ]);
    expect(report.unknownQuestionIds).toEqual(["f-d1-q404"]);
    expect(report.domains.find((d) => d.domainId === "f-d1")).toMatchObject({ total: 1, correct: 1 });
    const w = report.wrong.find((x) => x.questionId === "f-d1-q404");
    expect(w).toMatchObject({ correct: null, stemEn: null, explanationJa: null });
  });

  it("weakest は正答率最小のドメイン(出題 0 は対象外)", () => {
    const report = build({}, ATTEMPTS); // d1: 1/2, d2: 0/1
    expect(report.weakestDomainId).toBe("f-d2");
  });

  it("weakest の正答率同率は weight が大きい方(影響が大きい方)を選ぶ", () => {
    const report = build({ questionIds: [Q1.id, Q_REV2.id, Q3.id, Q4.id] }, [
      att(Q1.id, { isCorrect: true, chosen: ["B"] }),
      att(Q_REV2.id, { isCorrect: false, chosen: ["A"], questionRev: 2 }),
      att(Q3.id, { isCorrect: true, chosen: ["B"] }),
      att(Q4.id, { isCorrect: false, chosen: ["A"] }),
    ]); // d1: 1/2, d2: 1/2 の同率 → weight 60 の d1 を弱点とする
    expect(report.weakestDomainId).toBe("f-d1");
  });

  it("rehearsal 判定と timeout をレポートに載せる", () => {
    const initial = build({}, ATTEMPTS);
    expect(initial.rehearsal).toBe(false);
    const rehearsal = build({ submissionReason: "timeout" }, ATTEMPTS, [prior()]);
    expect(rehearsal.rehearsal).toBe(true);
    expect(rehearsal.submissionReason).toBe("timeout");
  });
});

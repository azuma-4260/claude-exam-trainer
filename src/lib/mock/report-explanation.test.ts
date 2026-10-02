import { describe, expect, it } from "vitest";
import type { ExamSessionRow } from "@/db/schema";
import { mcq, structuredPmcq, syllabus } from "@/lib/queue/test-fixtures";
import { buildMockReport, type MockAttempt } from "./report";

// D6-9: S-6 誤答一覧の構造化解説フィールド(specs/03 §1、05 §解説の表示)。
// 提出後のレポートだけが受け取る(試験中 DTO には含めない: dto.test.ts)。
// syllabus fixture は f-d1 / f-d2 だが、ドメイン集計はこのテストの関心外(問題 id の domain は集計外でもよい)

const NOW = new Date("2026-10-03T10:00:00+09:00");

const WITH = structuredPmcq("p-d1-q001"); // 正解 B
const PLAIN = mcq("f-d1-q001"); // 正解 B、フィールドなし
const BANK = new Map([WITH, PLAIN].map((q) => [q.id, q]));

const session = (questionIds: string[]): ExamSessionRow => ({
  id: "sess-x",
  exam: "ccar-f",
  kind: "full",
  formId: "form-a",
  domainId: null,
  questionIds,
  status: "submitted",
  submissionReason: "manual",
  startedAt: NOW,
  deadlineAt: new Date(NOW.getTime() + 120 * 60_000),
  currentIndex: 0,
  finishedAt: new Date(NOW.getTime() + 100 * 60_000),
  scoreRaw: 0,
});

const att = (questionId: string, chosen: string[]): MockAttempt => ({ questionId, questionRev: 1, isCorrect: false, chosen });

const build = (questionIds: string[], attempts: MockAttempt[]) =>
  buildMockReport({
    session: session(questionIds),
    attempts,
    priorSessions: [],
    findQuestion: (id) => BANK.get(id) ?? null,
    syllabus,
  });

describe("buildMockReport: 構造化解説フィールド(D6-9)", () => {
  it("フィールドがある誤答は拘束条件・フェーズ・選択肢ごとの理由を明示的に詰める", () => {
    const r = build([WITH.id], [att(WITH.id, ["A"])]);
    expect(r.wrong[0]).toMatchObject({
      questionId: WITH.id,
      chosen: ["A"],
      correct: ["B"],
      bindingConstraintJa: "支払いは取り消せない",
      lifecyclePhase: "deployment",
    });
    expect(r.wrong[0].choices).toEqual([
      { label: "A", text_en: "a", plausible_ja: "事後監査が目的なら妥当", not_best_ja: "支払い後では手遅れ" },
      { label: "B", text_en: "b", plausible_ja: null, not_best_ja: null },
      { label: "C", text_en: "c", plausible_ja: "C の条件", not_best_ja: "C の理由" },
      { label: "D", text_en: "d", plausible_ja: "D の条件", not_best_ja: "D の理由" },
    ]);
  });

  it("フィールドが無い問題(F・既存 P)は null で、選択肢は label / text_en だけの値を持つ", () => {
    const r = build([PLAIN.id], [att(PLAIN.id, ["A"])]);
    expect(r.wrong[0]).toMatchObject({ bindingConstraintJa: null, lifecyclePhase: null });
    expect(r.wrong[0].choices?.every((c) => c.plausible_ja === null && c.not_best_ja === null)).toBe(true);
  });

  it("バンクに無い問題はフィールドも null", () => {
    const r = build(["p-d9-q999"], []);
    expect(r.wrong[0]).toMatchObject({ choices: null, bindingConstraintJa: null, lifecyclePhase: null });
  });
});

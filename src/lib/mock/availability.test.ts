import { describe, expect, it } from "vitest";
import { mockFormSchema, type MockForm, type Question } from "@/lib/bank/schema";
import type { OpenFlag, PoolSession } from "@/lib/bank/pool";
import { mcq } from "@/lib/queue/test-fixtures";
import { buildMockFormOptions, formStartability } from "./availability";

// D3-2: S-5 開始画面のフォーム選択肢(01 FR-5、05 S-5)。
// availability・submitted(rehearsal)・推奨フォームは DB に保存せず都度導出する。

// mockFormSchema は question_ids を 60 問固定で要求する(03 §mock_forms)
const formQuestions = (prefix: string): Question[] =>
  Array.from({ length: 60 }, (_, i) =>
    mcq(`${prefix}-q${String(i + 1).padStart(3, "0")}`, {
      scenario_id: `sc-${prefix}`,
      eligible_modes: ["mock", "practice"],
      srs_eligible: false,
    }),
  );

const form = (id: string, questions: readonly Question[], exam: "ccar-f" | "ccar-p" = "ccar-f"): MockForm =>
  mockFormSchema.parse({
    id,
    exam,
    scenario_ids: [...new Set(questions.map((q) => q.scenario_id))],
    question_ids: questions.map((q) => q.id),
  });

const qa = formQuestions("f-d1");
const qb = formQuestions("f-d2");
const qc = formQuestions("f-d3");
const formA = form("form-a", qa);
const formB = form("form-b", qb);
const formC = form("form-c", qc);
const byId = new Map([...qa, ...qb, ...qc].map((q) => [q.id, q]));
const find = (id: string) => byId.get(id) ?? null;

const submittedA: PoolSession = { exam: "ccar-f", kind: "full", formId: "form-a", status: "submitted" };
const openFlag = (q: Question): OpenFlag => ({ questionId: q.id, questionRev: q.rev, resolvedAt: null });

describe("buildMockFormOptions(D3-2, 01 FR-5 / 05 S-5)", () => {
  it("全フォーム未実施・available なら定義順の先頭を推奨する", () => {
    const r = buildMockFormOptions([formA, formB, formC], [], [], find);
    expect(r.recommendedFormId).toBe("form-a");
    expect(r.allBlocked).toBe(false);
    expect(r.options.map((o) => o.formId)).toEqual(["form-a", "form-b", "form-c"]);
    expect(r.options.every((o) => !o.submitted && o.availability.available)).toBe(true);
    expect(r.options[0].questionCount).toBe(60);
  });

  it("提出済みフォームは submitted:true(rehearsal ラベルの元データ)になり推奨から外れる", () => {
    const r = buildMockFormOptions([formA, formB], [submittedA], [], find);
    expect(r.options.find((o) => o.formId === "form-a")?.submitted).toBe(true);
    expect(r.recommendedFormId).toBe("form-b");
  });

  it("フラグ付きフォームは推奨から外れ、次の有効な未実施フォームを選ぶ(01 FR-5)", () => {
    const r = buildMockFormOptions([formA, formB], [], [openFlag(qa[0])], find);
    expect(r.options.find((o) => o.formId === "form-a")?.availability).toMatchObject({
      available: false,
      openFlagCount: 1,
    });
    expect(r.recommendedFormId).toBe("form-b");
    expect(r.allBlocked).toBe(false);
  });

  it("全フォーム block なら allBlocked:true・推奨なし(開始拒否と悪問修正の要求)", () => {
    const flags = [openFlag(qa[0]), openFlag(qb[0])];
    const r = buildMockFormOptions([formA, formB], [], flags, find);
    expect(r.allBlocked).toBe(true);
    expect(r.recommendedFormId).toBeNull();
  });

  it("未実施フォームが全 block でも提出済みフォームが available なら allBlocked:false(rehearsal は可能)、推奨は無し", () => {
    const r = buildMockFormOptions([formA, formB], [submittedA], [openFlag(qb[0])], find);
    expect(r.allBlocked).toBe(false);
    expect(r.recommendedFormId).toBeNull();
  });

  it("フォームが 0 件なら allBlocked:false(未収載は block ではない)", () => {
    const r = buildMockFormOptions([], [], [], find);
    expect(r).toEqual({ options: [], recommendedFormId: null, recommendedByExam: {}, allBlocked: false });
  });
});

describe("T-exam: F+P で同名 form の片方だけ提出済み(B-S-3-1、specs/03 §出題プール 1)", () => {
  const qp = formQuestions("f-d4").map((q) =>
    mcq(q.id.replace(/^f-/, "p-"), {
      exam: "ccar-p",
      domain_id: "p-d4",
      primary_topic_id: "p-d4-t1-01",
      scenario_id: "sc-p",
      eligible_modes: ["mock", "practice"],
      srs_eligible: false,
    }),
  );
  const formAp = form("form-a", qp, "ccar-p");
  const all = new Map([...byId, ...qp.map((q) => [q.id, q] as const)]);
  const findAll = (id: string) => all.get(id) ?? null;

  it("submitted と推奨は (exam, form_id) で判定し、別試験の同名 form の提出状態を取り違えない", () => {
    const r = buildMockFormOptions([formA, formB, formAp], [submittedA], [], findAll);
    expect(r.options.map((o) => [o.exam, o.formId, o.submitted])).toEqual([
      ["ccar-f", "form-a", true],
      ["ccar-f", "form-b", false],
      ["ccar-p", "form-a", false],
    ]);
    expect(r.recommendedByExam).toEqual({ "ccar-f": "form-b", "ccar-p": "form-a" });
  });

  it("P の form-a を提出しても F の form-a は未提出のまま", () => {
    const submittedAp: PoolSession = { ...submittedA, exam: "ccar-p" };
    const r = buildMockFormOptions([formA, formAp], [submittedAp], [], findAll);
    expect(r.options.map((o) => [o.exam, o.submitted])).toEqual([
      ["ccar-f", false],
      ["ccar-p", true],
    ]);
    expect(r.recommendedByExam).toEqual({ "ccar-f": "form-a", "ccar-p": null });
  });
});

describe("D6-2: 開始可否は exam ごとの推奨で判定し、同名 form は開始させない(05 S-5、B-T-exam-2)", () => {
  const pQuestions = (prefix: string) =>
    formQuestions(prefix).map((q) =>
      mcq(q.id.replace(/^f-/, "p-"), {
        exam: "ccar-p",
        domain_id: q.domain_id.replace(/^f-/, "p-"),
        primary_topic_id: q.primary_topic_id.replace(/^f-/, "p-"),
        scenario_id: `sc-p-${prefix}`,
        eligible_modes: ["mock", "practice"],
        srs_eligible: false,
      }),
    );
  const qpx = pQuestions("f-d5");
  const qpa = pQuestions("f-d6");
  const formPx = form("form-px", qpx, "ccar-p");
  const formPa = form("form-a", qpa, "ccar-p");
  const all = new Map([...byId, ...[...qpx, ...qpa].map((q) => [q.id, q] as const)]);
  const findAll = (id: string) => all.get(id) ?? null;
  const at = (r: ReturnType<typeof buildMockFormOptions>, exam: string, formId: string) =>
    formStartability(r.options.find((o) => o.exam === exam && o.formId === formId)!, r);

  it("F と P で form id が異なれば、それぞれの exam の推奨フォームとして開始できる", () => {
    const r = buildMockFormOptions([formA, formB, formPx], [], [], findAll);
    expect(at(r, "ccar-f", "form-a")).toEqual({ recommended: true, startable: true, blocked: null });
    expect(at(r, "ccar-p", "form-px")).toEqual({ recommended: true, startable: true, blocked: null });
    expect(at(r, "ccar-f", "form-b")).toEqual({ recommended: false, startable: false, blocked: "not_next" });
  });

  it("同名 form が F と P の両方にあれば、未実施・提出済みとも開始不可(理由 ambiguous_form)", () => {
    const r = buildMockFormOptions([formA, formB, formPa], [submittedA], [], findAll);
    expect(at(r, "ccar-f", "form-a")).toMatchObject({ startable: false, blocked: "ambiguous_form" });
    expect(at(r, "ccar-p", "form-a")).toMatchObject({ startable: false, blocked: "ambiguous_form" });
    // 同名でない form は影響を受けない
    expect(at(r, "ccar-f", "form-b")).toEqual({ recommended: true, startable: true, blocked: null });
  });

  it("単独スコープ(F のみ)では従来どおり: 推奨は開始可、提出済みは rehearsal で開始可、block は unavailable", () => {
    const r = buildMockFormOptions([formA, formB, formC], [submittedA], [openFlag(qc[0])], find);
    expect(at(r, "ccar-f", "form-a")).toEqual({ recommended: false, startable: true, blocked: null });
    expect(at(r, "ccar-f", "form-b")).toEqual({ recommended: true, startable: true, blocked: null });
    expect(at(r, "ccar-f", "form-c")).toEqual({ recommended: false, startable: false, blocked: "unavailable" });
  });
});

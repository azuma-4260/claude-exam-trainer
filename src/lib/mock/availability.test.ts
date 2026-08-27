import { describe, expect, it } from "vitest";
import { mockFormSchema, type MockForm, type Question } from "@/lib/bank/schema";
import type { OpenFlag, PoolSession } from "@/lib/bank/pool";
import { mcq } from "@/lib/queue/test-fixtures";
import { buildMockFormOptions } from "./availability";

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

const form = (id: string, questions: readonly Question[]): MockForm =>
  mockFormSchema.parse({
    id,
    exam: "ccar-f",
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
    expect(r).toEqual({ options: [], recommendedFormId: null, allBlocked: false });
  });
});

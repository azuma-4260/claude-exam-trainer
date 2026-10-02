import { describe, expect, it } from "vitest";
import { mcq, structuredPmcq } from "@/lib/queue/test-fixtures";
import { toQuestionDtos } from "./dto";

// D6-9: 試験中 DTO の正解の漏洩防止(specs/03 §1)。構造化解説フィールドは正解の選択肢だけ持たないため、
// 有無そのものが正解を示す → answer / explanation_ja と同じく提出まで渡さない(ホワイトリストで詰め直す)

describe("toQuestionDtos(試験中 DTO)", () => {
  const withFields = structuredPmcq("p-d1-q001", { eligible_modes: ["mock", "practice"], srs_eligible: false });
  const bank = new Map([withFields, mcq("f-d1-q001")].map((q) => [q.id, q]));
  const dtos = toQuestionDtos([withFields.id, "f-d1-q001"], (id) => bank.get(id) ?? null);

  it("構造化解説フィールドを含めない(question / choice のどちらにも)", () => {
    if (!dtos) throw new Error("null");
    const text = JSON.stringify(dtos);
    for (const key of ["binding_constraint_ja", "lifecycle_phase", "plausible_ja", "not_best_ja", "answer", "explanation_ja", "refs"])
      expect(text).not.toContain(`"${key}"`);
    expect(text).not.toContain("支払いは取り消せない");
  });

  it("選択肢は label / text_en だけに詰め直す(フィールドの有無で正解が分からない)", () => {
    if (!dtos) throw new Error("null");
    expect(dtos[0]).toEqual({
      id: withFields.id,
      type: "mcq_single",
      scenario_id: null,
      stem_en: withFields.stem_en,
      choices: ["A", "B", "C", "D"].map((label) => ({ label, text_en: label.toLowerCase() })),
      select_count: 1,
    });
    for (const d of dtos) for (const c of d.choices) expect(Object.keys(c).sort()).toEqual(["label", "text_en"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  FORM_STRUCTURE,
  mockFormSchema,
  mockFormsFileSchema,
  questionSchema,
  questionsFileSchema,
  scenariosFileSchema,
  syllabusFileSchema,
  type Question,
} from "./schema";

// specs/03 §1 の不変条件を 1 つずつ写す。valid fixture を基準に 1 箇所だけ壊して invalid を作る。

const mcqSingle = {
  id: "f-d2-q014",
  exam: "ccar-f",
  domain_id: "f-d2",
  primary_topic_id: "f-d2-t1-03",
  secondary_topic_ids: ["f-d2-t2-01"],
  type: "mcq_single",
  scenario_id: null,
  eligible_modes: ["practice"],
  srs_eligible: true,
  stem_en: "Which transport should the MCP server use?",
  choices: [
    { label: "A", text_en: "stdio" },
    { label: "B", text_en: "Streamable HTTP" },
    { label: "C", text_en: "WebSocket" },
    { label: "D", text_en: "gRPC" },
  ],
  answer: ["B"],
  answer_en: null,
  explanation_ja: "リモート公開には Streamable HTTP が適切。",
  refs: ["https://docs.claude.com/en/docs/mcp"],
  difficulty: 2,
  status: "active",
  rev: 1,
} as const;

const mcqMulti = {
  ...mcqSingle,
  id: "f-d2-q015",
  type: "mcq_multi",
  stem_en: "Select TWO practices that harden a tool schema.",
  answer: ["A", "C"],
} as const;

const flash = {
  id: "f-d1-q001",
  exam: "ccar-f",
  domain_id: "f-d1",
  primary_topic_id: "f-d1-t1-01",
  secondary_topic_ids: [],
  type: "flash",
  scenario_id: null,
  eligible_modes: ["drill"],
  srs_eligible: true,
  stem_en: "What is the hub-and-spoke pattern?",
  choices: null,
  answer: null,
  answer_en: "A coordinator agent dispatches work to specialist sub-agents.",
  explanation_ja: "中央のオーケストレーターがサブエージェントへ委任するパターン。",
  refs: ["https://www.anthropic.com/engineering/multi-agent-research-system"],
  difficulty: 1,
  status: "active",
  rev: 1,
} as const;

const ok = (q: unknown) => questionSchema.safeParse(q).success;
const ng = (q: unknown) => !questionSchema.safeParse(q).success;

describe("questionSchema: 共通", () => {
  it("正常な mcq_single / mcq_multi / flash を受理する", () => {
    expect(ok(mcqSingle)).toBe(true);
    expect(ok(mcqMulti)).toBe(true);
    expect(ok(flash)).toBe(true);
  });

  it("type は z.infer で判別できる", () => {
    const q: Question = questionSchema.parse(flash);
    if (q.type === "flash") expect(q.answer_en.length).toBeGreaterThan(0);
    else throw new Error("flash のはず");
  });

  it("未知の type / exam / mode / status は拒否する", () => {
    expect(ng({ ...mcqSingle, type: "essay" })).toBe(true);
    expect(ng({ ...mcqSingle, exam: "ccar-x" })).toBe(true);
    expect(ng({ ...mcqSingle, eligible_modes: ["quiz"] })).toBe(true);
    expect(ng({ ...mcqSingle, status: "draft" })).toBe(true);
  });

  it("refs は 1 件以上の URL", () => {
    expect(ng({ ...mcqSingle, refs: [] })).toBe(true);
    expect(ng({ ...mcqSingle, refs: ["not a url"] })).toBe(true);
  });

  it("difficulty は 1〜3 の整数、rev は 1 以上の整数", () => {
    expect(ng({ ...mcqSingle, difficulty: 0 })).toBe(true);
    expect(ng({ ...mcqSingle, difficulty: 4 })).toBe(true);
    expect(ng({ ...mcqSingle, difficulty: 1.5 })).toBe(true);
    expect(ng({ ...mcqSingle, rev: 0 })).toBe(true);
  });

  it("eligible_modes は 1 件以上で重複なし", () => {
    expect(ng({ ...mcqSingle, eligible_modes: [] })).toBe(true);
    expect(ng({ ...mcqSingle, eligible_modes: ["practice", "practice"] })).toBe(true);
  });

  it("id / domain_id / topic_id の形式と整合(id と topic は domain 配下)", () => {
    expect(ng({ ...mcqSingle, id: "q014" })).toBe(true);
    expect(ng({ ...mcqSingle, domain_id: "f-d9" })).toBe(true);
    expect(ng({ ...mcqSingle, id: "f-d3-q014" })).toBe(true); // domain_id=f-d2 と不一致
    expect(ng({ ...mcqSingle, primary_topic_id: "f-d3-t1-03" })).toBe(true);
    expect(ng({ ...mcqSingle, secondary_topic_ids: ["f-d3-t1-01"] })).toBe(true);
  });

  it("secondary_topic_ids は primary を含まず重複しない", () => {
    expect(ng({ ...mcqSingle, secondary_topic_ids: ["f-d2-t1-03"] })).toBe(true);
    expect(ng({ ...mcqSingle, secondary_topic_ids: ["f-d2-t2-01", "f-d2-t2-01"] })).toBe(true);
  });

  it("exam と id の接頭辞は一致する(ccar-f → f-)", () => {
    expect(ng({ ...mcqSingle, exam: "ccar-p" })).toBe(true);
  });

  it("scenario_id は null か sc-* 形式", () => {
    expect(ok({ ...mcqSingle, scenario_id: "sc-1" })).toBe(true);
    expect(ng({ ...mcqSingle, scenario_id: "scenario1" })).toBe(true);
  });

  it("mock を含む独立 MCQ(ミニ模試用、scenario_id=null)を受理する。フォーム収載時の scenario 必須は validator 側", () => {
    expect(ok({ ...mcqSingle, eligible_modes: ["mock", "practice"] })).toBe(true);
    expect(ok({ ...mcqSingle, eligible_modes: ["mock", "practice"], scenario_id: "sc-1", srs_eligible: false })).toBe(true);
  });

  it("未知のキーは拒否する(スキーマ外フィールドの混入防止)", () => {
    expect(ng({ ...mcqSingle, extra: 1 })).toBe(true);
  });
});

describe("questionSchema: flash", () => {
  it("choices / answer は null、answer_en は必須", () => {
    expect(ng({ ...flash, choices: [] })).toBe(true);
    expect(ng({ ...flash, answer: ["A"] })).toBe(true);
    expect(ng({ ...flash, answer_en: null })).toBe(true);
    expect(ng({ ...flash, answer_en: "" })).toBe(true);
  });

  it("flash は mock / practice に出題できない(drill 専用)", () => {
    expect(ng({ ...flash, eligible_modes: ["practice"] })).toBe(true);
    expect(ng({ ...flash, eligible_modes: ["drill", "mock"] })).toBe(true);
  });
});

describe("questionSchema: mcq 共通", () => {
  it("choices は 2 件以上で label が一意、answer は choices の label に含まれる", () => {
    expect(ng({ ...mcqSingle, choices: [{ label: "A", text_en: "x" }] })).toBe(true);
    expect(
      ng({ ...mcqSingle, choices: [{ label: "A", text_en: "x" }, { label: "A", text_en: "y" }] }),
    ).toBe(true);
    expect(ng({ ...mcqSingle, answer: ["E"] })).toBe(true);
  });

  it("answer_en は null のみ(mcq は選択肢で答える)", () => {
    expect(ng({ ...mcqSingle, answer_en: "B" })).toBe(true);
  });

  it("choices の text_en / stem_en / explanation_ja は空にできない", () => {
    expect(ng({ ...mcqSingle, stem_en: "" })).toBe(true);
    expect(ng({ ...mcqSingle, explanation_ja: "" })).toBe(true);
    expect(ng({ ...mcqSingle, choices: [{ label: "A", text_en: "" }, { label: "B", text_en: "y" }] })).toBe(true);
  });
});

describe("questionSchema: mcq_single", () => {
  it("answer はちょうど 1 件", () => {
    expect(ng({ ...mcqSingle, answer: [] })).toBe(true);
    expect(ng({ ...mcqSingle, answer: ["A", "B"] })).toBe(true);
  });
});

describe("questionSchema: mcq_multi", () => {
  it("answer は 2 件以上・重複なし", () => {
    expect(ng({ ...mcqMulti, answer: ["A"] })).toBe(true);
    expect(ng({ ...mcqMulti, answer: ["A", "A"] })).toBe(true);
  });

  it("stem に 'Select TWO' 等の件数明記が必要で、件数は answer と一致する", () => {
    expect(ng({ ...mcqMulti, stem_en: "Which practices harden a tool schema?" })).toBe(true);
    expect(ng({ ...mcqMulti, stem_en: "Select THREE practices.", answer: ["A", "C"] })).toBe(true);
    expect(ok({ ...mcqMulti, stem_en: "Select THREE practices.", answer: ["A", "B", "C"] })).toBe(true);
  });
});

// D6-9(specs/03 §1 構造化解説フィールド、v1.3.3・S-4)
const structured = {
  ...mcqSingle,
  binding_constraint_ja: "リモートのクライアントから接続する必要がある",
  lifecycle_phase: "design",
  choices: [
    { label: "A", text_en: "stdio", plausible_ja: "同一ホストのローカル連携なら妥当", not_best_ja: "リモートから接続できない" },
    { label: "B", text_en: "Streamable HTTP" },
    { label: "C", text_en: "WebSocket", plausible_ja: "独自の双方向通信が要るなら妥当", not_best_ja: "MCP の標準トランスポートではない" },
    { label: "D", text_en: "gRPC", plausible_ja: "社内の既存 gRPC 基盤に寄せるなら妥当", not_best_ja: "MCP の標準トランスポートではない" },
  ],
} as const;

/** 選択肢 i だけ差し替えた structured */
const withChoice = (i: number, c: Record<string, unknown>) => ({
  ...structured,
  choices: structured.choices.map((x, j) => (j === i ? c : x)),
});

describe("questionSchema: 構造化解説フィールド(D6-9)", () => {
  it("書くなら全部: binding_constraint_ja + 正解でない選択肢すべての plausible_ja / not_best_ja を受理する", () => {
    expect(ok(structured)).toBe(true);
  });

  it("フィールドが無い従来の問題はそのまま受理する(F・既存 P)", () => {
    expect(ok(mcqSingle)).toBe(true);
    expect(ok(mcqMulti)).toBe(true);
  });

  it("lifecycle_phase は単独で設定してよい(null も可)。値は 5 種のみ", () => {
    for (const ph of ["discovery", "design", "deployment", "monitoring", "iteration", null])
      expect(ok({ ...mcqSingle, lifecycle_phase: ph })).toBe(true);
    expect(ng({ ...mcqSingle, lifecycle_phase: "handoff" })).toBe(true);
    expect(ng({ ...mcqSingle, lifecycle_phase: "" })).toBe(true);
  });

  it("binding_constraint_ja は非空文字列", () => {
    expect(ng({ ...structured, binding_constraint_ja: "" })).toBe(true);
    expect(ng({ ...structured, binding_constraint_ja: "   " })).toBe(true);
    expect(ng({ ...structured, binding_constraint_ja: null })).toBe(true);
  });

  it("正解でない選択肢が 1 つでも欠ける・片方だけなら拒否する", () => {
    expect(ng(withChoice(0, { label: "A", text_en: "stdio" }))).toBe(true);
    expect(ng(withChoice(0, { label: "A", text_en: "stdio", plausible_ja: "x" }))).toBe(true);
    expect(ng(withChoice(2, { label: "C", text_en: "WebSocket", not_best_ja: "x" }))).toBe(true);
    expect(ng(withChoice(3, { label: "D", text_en: "gRPC", plausible_ja: "", not_best_ja: "x" }))).toBe(true);
  });

  it("正解の選択肢は 2 フィールドを持たない(正解の漏洩防止の前提)", () => {
    expect(ng(withChoice(1, { label: "B", text_en: "Streamable HTTP", plausible_ja: "x", not_best_ja: "y" }))).toBe(true);
    expect(ng(withChoice(1, { label: "B", text_en: "Streamable HTTP", not_best_ja: "y" }))).toBe(true);
  });

  it("binding_constraint_ja が無い問題は choice の 2 フィールドを持たない", () => {
    const noBc: Record<string, unknown> = { ...structured };
    delete noBc.binding_constraint_ja;
    expect(ng(noBc)).toBe(true);
    expect(
      ng({ ...mcqSingle, choices: [{ ...mcqSingle.choices[0], plausible_ja: "x", not_best_ja: "y" }, ...mcqSingle.choices.slice(1)] }),
    ).toBe(true);
  });

  it("mcq_multi でも正解 2 つを除く選択肢すべてに必要", () => {
    const multi = { ...structured, id: "f-d2-q015", type: "mcq_multi", stem_en: "Select TWO transports.", answer: ["A", "B"] };
    // A が正解になったので A のフィールドは不可、B は正解のまま
    expect(ng(multi)).toBe(true);
    const fixed = { ...multi, choices: [{ label: "A", text_en: "stdio" }, ...structured.choices.slice(1)] };
    expect(ok(fixed)).toBe(true);
  });

  it("flash は構造化解説フィールドを持てない", () => {
    expect(ng({ ...flash, binding_constraint_ja: "x" })).toBe(true);
    expect(ng({ ...flash, lifecycle_phase: "design" })).toBe(true);
  });

  it("F の問題も同じ不変条件で受理する(使わないが許容)", () => {
    expect(structured.exam).toBe("ccar-f");
    expect(ok(structured)).toBe(true);
  });
});

// D6-9(specs/03 §1 P の MCQ の不変条件): multi は Select TWO のみ・選択肢 4〜5 個
const pSingle = { ...mcqSingle, id: "p-d2-q014", exam: "ccar-p", domain_id: "p-d2", primary_topic_id: "p-d2-t1-03", secondary_topic_ids: [] } as const;
const pMulti = { ...pSingle, id: "p-d2-q015", type: "mcq_multi", stem_en: "Select TWO practices.", answer: ["A", "C"] } as const;
const fifth = { label: "E", text_en: "SSE" } as const;

describe("questionSchema: P の MCQ の不変条件(D6-9)", () => {
  it("P の 4 択・5 択の single / Select TWO の multi を受理する", () => {
    expect(ok(pSingle)).toBe(true);
    expect(ok({ ...pSingle, choices: [...pSingle.choices, fifth] })).toBe(true);
    expect(ok(pMulti)).toBe(true);
    expect(ok({ ...pMulti, choices: [...pMulti.choices, fifth] })).toBe(true);
  });

  it("P の MCQ は選択肢 3 個以下・6 個以上を拒否する(フォーム収載に限らない)", () => {
    expect(ng({ ...pSingle, choices: pSingle.choices.slice(0, 3) })).toBe(true);
    expect(ng({ ...pSingle, choices: [...pSingle.choices, fifth, { label: "F", text_en: "TCP" }] })).toBe(true);
  });

  it("P の mcq_multi は Select TWO(answer 2 件)のみ", () => {
    expect(ng({ ...pMulti, stem_en: "Select THREE practices.", answer: ["A", "B", "C"] })).toBe(true);
  });

  it("F は従来どおり(2〜3 択・Select THREE を許容)", () => {
    expect(ok({ ...mcqSingle, choices: mcqSingle.choices.slice(0, 2) })).toBe(true);
    expect(ok({ ...mcqMulti, stem_en: "Select THREE practices.", answer: ["A", "B", "C"] })).toBe(true);
  });
});

describe("questionsFileSchema(questions/*.json)", () => {
  it("配列を受理し、ファイル内の id 重複を拒否する", () => {
    expect(questionsFileSchema.safeParse([mcqSingle, flash]).success).toBe(true);
    expect(questionsFileSchema.safeParse([mcqSingle, mcqSingle]).success).toBe(false);
  });
});

describe("mockFormSchema(mock_forms.yaml の forms[])", () => {
  const form = {
    id: "form-a",
    exam: "ccar-f",
    scenario_ids: ["sc-1", "sc-2", "sc-3", "sc-4"],
    question_ids: Array.from({ length: 60 }, (_, i) => `f-d1-q${String(i + 1).padStart(3, "0")}`),
  };

  it("正常なフォームを受理する", () => {
    expect(mockFormSchema.safeParse(form).success).toBe(true);
  });

  it("question_ids はちょうど 60 件で重複なし、scenario_ids は 1 件以上で重複なし", () => {
    expect(mockFormSchema.safeParse({ ...form, question_ids: form.question_ids.slice(0, 59) }).success).toBe(false);
    expect(
      mockFormSchema.safeParse({ ...form, question_ids: [...form.question_ids.slice(0, 59), form.question_ids[0]] })
        .success,
    ).toBe(false);
    expect(mockFormSchema.safeParse({ ...form, scenario_ids: [] }).success).toBe(false);
    expect(mockFormSchema.safeParse({ ...form, scenario_ids: ["sc-1", "sc-1"] }).success).toBe(false);
  });

  it("id は form-* 形式", () => {
    expect(mockFormSchema.safeParse({ ...form, id: "A" }).success).toBe(false);
  });

  // T-pmock(specs/03 §mock_forms §CCAR-P の構造): P は 63 問・独立問題形式(scenario_ids は空)
  const pForm = {
    id: "form-a",
    exam: "ccar-p",
    scenario_ids: [],
    question_ids: Array.from({ length: 63 }, (_, i) => `p-d1-q${String(i + 1).padStart(3, "0")}`),
  };

  it("FORM_STRUCTURE: F は 60 問・4 シナリオ、P は 63 問・シナリオなし", () => {
    expect(FORM_STRUCTURE["ccar-f"]).toEqual({ size: 60, scenarioCount: 4 });
    expect(FORM_STRUCTURE["ccar-p"]).toEqual({ size: 63, scenarioCount: 0 });
  });

  it("P: 63 問・scenario_ids 空を受理", () => {
    expect(mockFormSchema.safeParse(pForm).success).toBe(true);
  });

  it("P: 62 / 64 問は拒否、F の 60 問も P では拒否", () => {
    expect(mockFormSchema.safeParse({ ...pForm, question_ids: pForm.question_ids.slice(0, 62) }).success).toBe(false);
    expect(mockFormSchema.safeParse({ ...pForm, question_ids: [...pForm.question_ids, "p-d1-q064"] }).success).toBe(false);
    const r = mockFormSchema.safeParse({ ...pForm, question_ids: pForm.question_ids.slice(0, 60) });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/63 件/);
  });

  it("P: scenario_ids を持つと拒否(独立問題形式)", () => {
    const r = mockFormSchema.safeParse({ ...pForm, scenario_ids: ["sc-1"] });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/独立問題形式/);
  });

  it("F: 63 問は拒否(exam ごとの問題数)", () => {
    const qs = Array.from({ length: 63 }, (_, i) => `f-d1-q${String(i + 1).padStart(3, "0")}`);
    expect(mockFormSchema.safeParse({ ...form, question_ids: qs }).success).toBe(false);
  });
});

// --- syllabus.yaml / scenarios.yaml(D0-3) ---

const syllabus = {
  exam: "ccar-f",
  version: 1,
  source: "content/ccar-f/SOURCES.md",
  domains: [
    {
      id: "f-d1",
      name: "A",
      weight: 60,
      form_questions: 36,
      task_statements: [
        { id: "f-d1-t1", name: "t", topics: [{ id: "f-d1-t1-01", name: "x", scope_ja: "範囲" }] },
      ],
    },
    {
      id: "f-d2",
      name: "B",
      weight: 40,
      form_questions: 24,
      task_statements: [
        { id: "f-d2-t1", name: "t", topics: [{ id: "f-d2-t1-01", name: "y", scope_ja: "範囲" }] },
      ],
    },
  ],
};

describe("syllabusFileSchema", () => {
  it("valid fixture を受理", () => {
    expect(syllabusFileSchema.safeParse(syllabus).success).toBe(true);
  });
  const bad: [string, (s: string) => string, RegExp][] = [
    ["domain id 重複", (s) => s.replace('"id":"f-d2"', '"id":"f-d1"'), /id 重複/],
    ["topic id 重複", (s) => s.replace('"id":"f-d2-t1-01"', '"id":"f-d1-t1-01"'), /id 重複/],
    ["task_statement が他 domain 配下", (s) => s.replace('"id":"f-d2-t1"', '"id":"f-d1-t9"'), /配下でない/],
    ["topic が他 task_statement 配下", (s) => s.replace('"id":"f-d2-t1-01"', '"id":"f-d1-t1-02"'), /配下でない/],
    ["weight 合計 ≠ 100", (s) => s.replace('"weight":40', '"weight":30'), /weight 合計/],
    ["form_questions 合計 ≠ 60", (s) => s.replace('"form_questions":24', '"form_questions":20'), /form_questions 合計/],
    ["exam と domain 接頭辞不一致", (s) => s.replace('"exam":"ccar-f"', '"exam":"ccar-p"'), /p- で始まる/],
    ["未知キー", (s) => s.replace('"version":1', '"version":1,"extra":1'), /unrecognized|Unrecognized/i],
  ];
  for (const [name, mutate, re] of bad) {
    it(`invalid: ${name}`, () => {
      const r = syllabusFileSchema.safeParse(JSON.parse(mutate(JSON.stringify(syllabus))));
      expect(r.success).toBe(false);
      expect(JSON.stringify(r.error?.issues)).toMatch(re);
    });
  }

  // D6-3 / T-pmock(specs/03 §1): form_questions は固定フォーム配分が確定した exam(FORM_DOMAIN_QUOTA あり)でのみ必須で、
  // 合計はその exam のフォーム問題数(F 60 / P 63)。P は T-pmock で確定済み
  const toP = (s: typeof syllabus) =>
    JSON.parse(JSON.stringify(s).replaceAll('"f-d', '"p-d').replace('"exam":"ccar-f"', '"exam":"ccar-p"')) as Record<
      string,
      unknown
    >;
  const withoutFormQuestions = (s: typeof syllabus) => ({
    ...s,
    domains: s.domains.map((d) => {
      const copy: Partial<(typeof s.domains)[number]> = { ...d };
      delete copy.form_questions;
      return copy;
    }),
  });

  it("配分確定 exam(ccar-f)で form_questions が欠けると拒否", () => {
    const r = syllabusFileSchema.safeParse(withoutFormQuestions(syllabus));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/form_questions が必須/);
  });

  it("配分確定 exam(ccar-p)で form_questions が欠けると拒否", () => {
    const r = syllabusFileSchema.safeParse(toP(withoutFormQuestions(syllabus) as typeof syllabus));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/form_questions が必須/);
  });

  it("ccar-p の form_questions 合計は 63(F の 60 では拒否)", () => {
    const r = syllabusFileSchema.safeParse(toP(syllabus));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/form_questions 合計が 63 でない\(60\)/);
    const p63 = toP(syllabus) as { domains: { form_questions: number }[] };
    p63.domains[0].form_questions += 3;
    expect(syllabusFileSchema.safeParse(p63).success).toBe(true);
  });
});

describe("mockFormsFileSchema", () => {
  it("form id 重複を拒否", () => {
    const f = { id: "form-a", exam: "ccar-f", scenario_ids: ["sc-1"], question_ids: Array.from({ length: 60 }, (_, i) => `f-d1-q${String(i + 1).padStart(3, "0")}`) };
    expect(mockFormsFileSchema.safeParse({ forms: [f] }).success).toBe(true);
    const r = mockFormsFileSchema.safeParse({ forms: [f, f] });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/form id 重複/);
  });
});

describe("scenariosFileSchema", () => {
  /** specs/03 §1 scenarios.yaml(2026-08-24, C3a 確定): id / title_en / context_en / refs のみ */
  const makeScenario = (over: Record<string, unknown> = {}) => ({
    id: "sc-1",
    title_en: "Customer Support Resolution Agent",
    context_en: "TechCorp is building an automated support agent.",
    refs: ["https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview"],
    ...over,
  });
  it("4 フィールドすべて揃った scenario は valid", () => {
    const r = scenariosFileSchema.safeParse({ scenarios: [makeScenario()] });
    expect(r.success).toBe(true);
  });
  it.each([
    ["title_en 欠落", { title_en: undefined }],
    ["context_en 欠落", { context_en: undefined }],
    ["refs 欠落", { refs: undefined }],
    ["title_en 空文字", { title_en: "" }],
    ["context_en 空文字", { context_en: "" }],
    ["title_en 空白のみ", { title_en: "   " }],
    ["context_en 空白のみ(改行含む)", { context_en: " \n  \n" }],
    ["refs 空配列", { refs: [] }],
    ["refs に URL でない文字列", { refs: ["not-a-url"] }],
  ])("%s を拒否", (_label, over) => {
    expect(scenariosFileSchema.safeParse({ scenarios: [makeScenario(over)] }).success).toBe(false);
  });
  it("未知キーを strict で拒否", () => {
    expect(scenariosFileSchema.safeParse({ scenarios: [makeScenario({ domain_ids: ["f-d1"] })] }).success).toBe(false);
  });
  it("id 重複を拒否", () => {
    const r = scenariosFileSchema.safeParse({ scenarios: [makeScenario(), makeScenario()] });
    expect(r.success).toBe(false);
  });
  it("id 形式違反を拒否", () => {
    expect(scenariosFileSchema.safeParse({ scenarios: [makeScenario({ id: "scenario1" })] }).success).toBe(false);
  });
});

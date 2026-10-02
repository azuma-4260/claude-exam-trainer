import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stringify as toYaml } from "yaml";
import { FORM_STRUCTURE, type MockForm, type Question, type Scenario, type Syllabus } from "../src/lib/bank/schema";
import { loadBankForValidation, runValidateAll, runValidateBank, validateBank, type BankInput } from "./validate-bank";

// specs/06 §バンク静的検証 / specs/03 §mock_forms の各条件を 1 つずつ写す。
// valid fixture を基準に 1 箇所だけ壊して invalid を作る(scripts/backlog/check.test.ts と同じ手法)。

// --- syllabus fixture: 5 domain × 1 task_statement × 3 topic、weight 27/18/20/20/15、form_questions 16/11/12/12/9 ---
const DOMAINS: [string, number, number][] = [
  ["f-d1", 27, 16],
  ["f-d2", 18, 11],
  ["f-d3", 20, 12],
  ["f-d4", 20, 12],
  ["f-d5", 15, 9],
];

function makeSyllabus(): Syllabus {
  return {
    exam: "ccar-f",
    version: 1,
    source: "content/ccar-f/SOURCES.md",
    domains: DOMAINS.map(([id, weight, form_questions]) => ({
      id,
      name: `Domain ${id}`,
      weight,
      form_questions,
      task_statements: [
        {
          id: `${id}-t1`,
          name: `Task ${id}`,
          topics: [1, 2, 3].map((n) => ({ id: `${id}-t1-0${n}`, name: `Topic ${n}`, scope_ja: "範囲" })),
        },
      ],
    })),
  };
}

function makeQuestion(domain: string, n: number, over: Partial<Question> = {}): Question {
  return {
    id: `${domain}-q${String(n).padStart(3, "0")}`,
    exam: "ccar-f",
    domain_id: domain,
    primary_topic_id: `${domain}-t1-01`,
    secondary_topic_ids: [],
    type: "mcq_single",
    scenario_id: null,
    eligible_modes: ["practice"],
    srs_eligible: true,
    stem_en: "Which option is correct?",
    choices: [
      { label: "A", text_en: "a" },
      { label: "B", text_en: "b" },
    ],
    answer: ["A"],
    answer_en: null,
    explanation_ja: "解説",
    refs: ["https://docs.claude.com/"],
    difficulty: 2,
    status: "active",
    rev: 1,
    ...over,
  } as Question;
}

/** specs/03 §1 scenarios.yaml(2026-08-24, C3a 確定形式)を満たす Scenario フィクスチャ */
function makeScenario(id: string): Scenario {
  return {
    id,
    title_en: `Scenario ${id}`,
    context_en: `Context for ${id}.`,
    refs: ["https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview"],
  };
}

/** form 収載問題 60 問(配分 16-11-12-12-9、scenario sc-1..sc-4 を巡回)+ 非収載 5 問 */
function makeBank(): BankInput {
  const questions: Question[] = [];
  const formIds: string[] = [];
  const scen = ["sc-1", "sc-2", "sc-3", "sc-4"];
  let i = 0;
  for (const [d, , fq] of DOMAINS) {
    for (let k = 0; k < fq; k++) {
      const q = makeQuestion(d, k + 1, {
        scenario_id: scen[i++ % scen.length],
        eligible_modes: ["mock", "practice"],
        srs_eligible: false,
      });
      questions.push(q);
      formIds.push(q.id);
    }
    questions.push(makeQuestion(d, 100));
  }
  const form: MockForm = { id: "form-a", exam: "ccar-f", scenario_ids: [...scen], question_ids: formIds };
  return {
    syllabus: makeSyllabus(),
    questions,
    forms: [form],
    scenarios: scen.map(makeScenario),
  };
}

describe("validateBank(純粋関数)", () => {
  it("valid fixture は errors/warnings ともに空", () => {
    expect(validateBank(makeBank())).toEqual({ errors: [], warnings: [] });
  });

  it("空バンク(syllabus のみ・questions 0・forms 0・scenarios 無し)は緑", () => {
    const r = validateBank({ syllabus: makeSyllabus(), questions: [], forms: [], scenarios: null });
    expect(r).toEqual({ errors: [], warnings: [] });
  });

  it("form 無し・scenario 参照無しなら scenarios.yaml 不在を許容", () => {
    const r = validateBank({ syllabus: makeSyllabus(), questions: [makeQuestion("f-d1", 1)], forms: [], scenarios: null });
    expect(r.errors).toEqual([]);
  });

  const bad: [string, (b: BankInput) => void, RegExp][] = [
    ["id 重複(ファイル横断)", (b) => { b.questions = [...b.questions, { ...b.questions[0] }]; }, /id 重複/],
    ["exam が syllabus と不一致", (b) => { (b.questions[0] as { exam: string }).exam = "ccar-p"; }, /exam=ccar-p/],
    ["domain_id が syllabus に無い", (b) => { b.syllabus.domains = b.syllabus.domains.slice(1); }, /domain_id f-d1 が syllabus に無い/],
    ["primary_topic_id が syllabus に無い", (b) => { (b.questions[0] as { primary_topic_id: string }).primary_topic_id = "f-d1-t1-99"; }, /primary_topic_id f-d1-t1-99 が syllabus に無い/],
    ["secondary_topic_ids に存在しない topic", (b) => { (b.questions[0] as { secondary_topic_ids: string[] }).secondary_topic_ids = ["f-d1-t1-99"]; }, /secondary_topic_ids f-d1-t1-99 が syllabus に無い/],
    ["primary_topic_id が他 domain の topic", (b) => { (b.questions[0] as { primary_topic_id: string }).primary_topic_id = "f-d2-t1-01"; }, /primary_topic_id f-d2-t1-01 は f-d2 の topic/],
    ["secondary_topic_ids に他 domain の topic", (b) => { (b.questions[0] as { secondary_topic_ids: string[] }).secondary_topic_ids = ["f-d2-t1-01"]; }, /secondary_topic_ids f-d2-t1-01 は f-d2 の topic/],
    ["refs が空", (b) => { (b.questions[0] as { refs: string[] }).refs = []; }, /refs が空/],
    ["scenario 参照ありで scenarios.yaml 無し", (b) => { b.scenarios = null; }, /scenarios\.yaml が無いが scenario_id が参照されている/],
    ["question.scenario_id が scenarios に無い", (b) => { b.scenarios = b.scenarios!.filter((s) => s.id !== "sc-4"); }, /scenario_id sc-4 が scenarios\.yaml に無い/],
    ["form.scenario_ids が scenarios に無い", (b) => { b.scenarios = b.scenarios!.filter((s) => s.id !== "sc-4"); }, /form-a: scenario_ids の sc-4 が scenarios\.yaml に無い/],
    ["form の問題数が 60 でない", (b) => { b.forms = [{ ...b.forms[0], question_ids: b.forms[0].question_ids.slice(1) }]; }, /問題数 59/],
    ["form の exam が不一致", (b) => { b.forms = [{ ...b.forms[0], exam: "ccar-p" }]; }, /form-a: exam=ccar-p/],
    ["form 間で問題重複", (b) => { b.forms = [b.forms[0], { ...b.forms[0], id: "form-b" }]; }, /form-b: f-d1-q001 は form-a にも収載/],
    ["form 収載問題が questions に無い", (b) => { b.questions = b.questions.filter((q) => q.id !== "f-d1-q001"); }, /form-a: f-d1-q001 が questions に無い/],
    ["form 収載問題に mock が無い", (b) => { (b.questions[0] as { eligible_modes: string[] }).eligible_modes = ["practice"]; }, /eligible_modes に mock が無い/],
    ["form 収載問題の srs_eligible が true(B-D0-3-2)", (b) => { (b.questions[0] as { srs_eligible: boolean }).srs_eligible = true; }, /form-a: f-d1-q001 の srs_eligible が false でない/],
    ["form 収載問題の scenario_id が null", (b) => { (b.questions[0] as { scenario_id: string | null }).scenario_id = null; }, /scenario_id が null/],
    ["scenario_id が form.scenario_ids に無い", (b) => { b.scenarios = [...b.scenarios!, makeScenario("sc-9")]; (b.questions[0] as { scenario_id: string }).scenario_id = "sc-9"; }, /scenario_id sc-9 が form\.scenario_ids に無い/],
    ["form.scenario_ids に未使用シナリオ", (b) => { b.scenarios = [...b.scenarios!, makeScenario("sc-9")]; b.forms = [{ ...b.forms[0], scenario_ids: [...b.forms[0].scenario_ids, "sc-9"] }]; }, /sc-9 を使う問題が無い/],
    ["ドメイン配分が syllabus と不一致", (b) => {
      // f-d1 の 1 問を f-d5 の非収載問題と入れ替える(60 問は維持、配分は 15/…/10)
      const ids = [...b.forms[0].question_ids];
      ids[0] = "f-d5-q100";
      (b.questions.find((q) => q.id === "f-d5-q100") as { eligible_modes: string[]; scenario_id: string }).eligible_modes = ["mock"];
      (b.questions.find((q) => q.id === "f-d5-q100") as { scenario_id: string }).scenario_id = "sc-1";
      b.forms = [{ ...b.forms[0], question_ids: ids }];
    }, /f-d1 の配分 15\(固定配分=16\)/],
    ["syllabus の form_questions が固定配分と不一致(合計 60 は維持)", (b) => {
      b.syllabus.domains[0].form_questions = 15;
      b.syllabus.domains[4].form_questions = 10;
    }, /f-d1 の form_questions=15 が固定配分\(16\)と不一致/],
    ["form のシナリオ数が 4 でない", (b) => {
      for (const q of b.questions) if (q.scenario_id === "sc-4") (q as { scenario_id: string }).scenario_id = "sc-1";
      b.forms = [{ ...b.forms[0], scenario_ids: ["sc-1", "sc-2", "sc-3"] }];
    }, /form-a: シナリオ数 3\(4 本必須\)/],
    ["form id 重複", (b) => { b.forms = [b.forms[0], { ...b.forms[0] }]; }, /form id 重複: form-a/],
  ];
  for (const [name, mutate, re] of bad) {
    it(`invalid: ${name}`, () => {
      const b = makeBank();
      mutate(b);
      const r = validateBank(b);
      expect(r.errors.join("\n")).toMatch(re);
    });
  }

  it("重み乖離 ±30% 超は warning(error ではない)", () => {
    const questions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => makeQuestion("f-d1", n));
    const r = validateBank({ syllabus: makeSyllabus(), questions, forms: [], scenarios: null });
    expect(r.errors).toEqual([]);
    expect(r.warnings.join("\n")).toMatch(/f-d1: 問題数 10 が weight 27% 相当/);
    expect(r.warnings.join("\n")).toMatch(/f-d2: 問題数 0/);
  });

  it("各シナリオ 15 問は検証しない(Step 0 で OFF 確定)", () => {
    const b = makeBank();
    // 4 シナリオは維持したまま sc-1 に 57 問、他は各 1 問に寄せても error にならない
    const keep = new Set<string>();
    for (const q of b.questions) {
      if (!q.scenario_id) continue;
      if (q.scenario_id !== "sc-1" && !keep.has(q.scenario_id)) keep.add(q.scenario_id);
      else (q as { scenario_id: string }).scenario_id = "sc-1";
    }
    expect(validateBank(b).errors).toEqual([]);
  });
});

describe("loadBankForValidation / runValidateBank(I/O と exit code)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "validate-bank-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeBank(b: BankInput, opts: { syllabus?: boolean; scenarios?: boolean; forms?: boolean } = {}) {
    if (opts.syllabus !== false) writeFileSync(path.join(dir, "syllabus.yaml"), toYaml(b.syllabus));
    if (b.questions.length > 0) {
      mkdirSync(path.join(dir, "questions"));
      for (const [d] of DOMAINS) {
        const qs = b.questions.filter((q) => q.domain_id === d);
        if (qs.length > 0) writeFileSync(path.join(dir, "questions", `${d}.json`), JSON.stringify(qs));
      }
    }
    if (opts.forms !== false && b.forms.length > 0)
      writeFileSync(path.join(dir, "mock_forms.yaml"), toYaml({ forms: b.forms }));
    if (opts.scenarios !== false && b.scenarios)
      writeFileSync(path.join(dir, "scenarios.yaml"), toYaml({ scenarios: b.scenarios }));
  }

  it("完全なバンク ⇒ exit 0", () => {
    writeBank(makeBank());
    const r = runValidateBank(dir);
    expect(r.exitCode).toBe(0);
    expect(r.stdout.join("\n")).toMatch(/validate-bank OK \(questions 65 \/ forms 1, warnings 0\)/);
  });

  it("空バンク(syllabus のみ)⇒ exit 0", () => {
    writeBank({ syllabus: makeSyllabus(), questions: [], forms: [], scenarios: null });
    const r = runValidateBank(dir);
    expect(r.exitCode).toBe(0);
    expect(r.stdout.join("\n")).toMatch(/questions 0 \/ forms 0/);
  });

  it("syllabus.yaml 欠落 ⇒ exit 1", () => {
    writeBank({ syllabus: makeSyllabus(), questions: [], forms: [], scenarios: null }, { syllabus: false });
    const r = runValidateBank(dir);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.join("\n")).toMatch(/syllabus\.yaml が無い/);
  });

  it("syllabus.yaml が不正(weight 合計 ≠ 100)⇒ exit 1", () => {
    const s = makeSyllabus();
    s.domains[0].weight = 10;
    writeBank({ syllabus: s, questions: [], forms: [], scenarios: null });
    const r = runValidateBank(dir);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.join("\n")).toMatch(/weight 合計が 100 でない/);
  });

  it("scenario 参照先欠落(scenarios.yaml 無し)⇒ exit 1", () => {
    writeBank(makeBank(), { scenarios: false });
    const r = runValidateBank(dir);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.join("\n")).toMatch(/scenarios\.yaml が無いが/);
  });

  it("warning のみ ⇒ exit 0 かつ stderr に WARN", () => {
    const questions = [1, 2, 3, 4, 5].map((n) => makeQuestion("f-d1", n));
    writeBank({ syllabus: makeSyllabus(), questions, forms: [], scenarios: null });
    const r = runValidateBank(dir);
    expect(r.exitCode).toBe(0);
    expect(r.stderr.join("\n")).toMatch(/validate-bank WARN/);
    expect(r.stdout.join("\n")).toMatch(/warnings 5\)/); // f-d1 は +270%、他 4 域は -100%
  });

  it("schema 違反のファイルが複数あっても全件集める(throw しない)", () => {
    const b = makeBank();
    writeBank(b);
    writeFileSync(path.join(dir, "questions", "f-d1.json"), JSON.stringify([{ id: "broken" }]));
    writeFileSync(path.join(dir, "questions", "f-d2.json"), "{ not json");
    const loaded = loadBankForValidation(dir);
    expect(loaded.input).not.toBeNull();
    expect(loaded.errors.some((e) => e.startsWith("questions/f-d1.json:"))).toBe(true);
    expect(loaded.errors.some((e) => e.startsWith("questions/f-d2.json:"))).toBe(true);
    expect(runValidateBank(dir).exitCode).toBe(1);
  });

  it("mock_forms.yaml が不正 ⇒ exit 1", () => {
    writeBank(makeBank());
    writeFileSync(path.join(dir, "mock_forms.yaml"), toYaml({ forms: [{ id: "form-a" }] }));
    const r = runValidateBank(dir);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.join("\n")).toMatch(/mock_forms\.yaml:/);
  });

  it("F のフォーム構造は 60 問・4 シナリオ", () => {
    expect(FORM_STRUCTURE["ccar-f"]).toEqual({ size: 60, scenarioCount: 4 });
  });
});

// --- D6-3: 全 exam の検証(specs/06 §バンク静的検証)---
// P の fixture は実際の P と同じ形(7 ドメイン・weight 17/13/19/16/14/14/7・form_questions 11-8-12-10-9-9-4。
// specs/03 §1, §mock_forms §CCAR-P の構造。T-pmock)
const P_WEIGHTS = [17, 13, 19, 16, 14, 14, 7];
const P_FORM_QUESTIONS = [11, 8, 12, 10, 9, 9, 4];

function makePSyllabus(): Syllabus {
  return {
    exam: "ccar-p",
    version: 1,
    source: "content/ccar-p/SOURCES.md",
    domains: P_WEIGHTS.map((weight, i) => {
      const id = `p-d${i + 1}`;
      return {
        id,
        name: `Domain ${id}`,
        weight,
        form_questions: P_FORM_QUESTIONS[i],
        task_statements: [
          { id: `${id}-t1`, name: `Task ${id}`, topics: [{ id: `${id}-t1-01`, name: "Topic", scope_ja: "範囲" }] },
        ],
      };
    }),
  };
}

function makePQuestion(domain: string, n: number, over: Partial<Question> = {}): Question {
  // P の MCQ は全問 4〜5 択(03 §1 P の MCQ の不変条件。D6-9 で Zod 強制)
  return makeQuestion(domain, n, { exam: "ccar-p", primary_topic_id: `${domain}-t1-01`, choices: FOUR_CHOICES, ...over } as Partial<Question>);
}

// P のフォーム収載問題は 4〜5 択(03 §mock_forms §CCAR-P の構造)
const FOUR_CHOICES = ["A", "B", "C", "D"].map((label) => ({ label, text_en: label.toLowerCase() }));

/** 構造化解説フィールドを埋める(03 §1: binding_constraint_ja + 正解でない選択肢すべてに plausible_ja / not_best_ja) */
function withStructured(q: Question): Question {
  if (q.type === "flash") return q;
  return {
    ...q,
    binding_constraint_ja: "決め手になる制約",
    choices: q.choices.map((c) => (q.answer.includes(c.label) ? c : { ...c, plausible_ja: "別条件なら正解", not_best_ja: "ここでは劣る" })),
  } as Question;
}

/** P form 収載 63 問(配分 11-8-12-10-9-9-4、全問 scenario_id null、構造化解説フィールドあり)+ 非収載 7 問。1 問は mcq_multi */
function makePBank(): BankInput {
  const questions: Question[] = [];
  const formIds: string[] = [];
  P_FORM_QUESTIONS.forEach((fq, i) => {
    const d = `p-d${i + 1}`;
    for (let k = 0; k < fq; k++) {
      const q = withStructured(makePQuestion(d, k + 1, { eligible_modes: ["mock", "practice"], srs_eligible: false, choices: FOUR_CHOICES }));
      questions.push(q);
      formIds.push(q.id);
    }
    questions.push(makePQuestion(d, 100));
  });
  // 問題形式の件数は検証しない(03 §mock_forms §CCAR-P)。mcq_multi が混ざっても OK
  questions[0] = withStructured({
    ...questions[0],
    type: "mcq_multi",
    stem_en: "Which TWO options are correct? (Select TWO.)",
    choices: [
      { label: "A", text_en: "a" },
      { label: "B", text_en: "b" },
      { label: "C", text_en: "c" },
      { label: "D", text_en: "d" },
      { label: "E", text_en: "e" },
    ],
    answer: ["A", "C"],
  } as Question);
  return {
    syllabus: makePSyllabus(),
    questions,
    forms: [{ id: "form-a", exam: "ccar-p", scenario_ids: [], question_ids: formIds }],
    scenarios: null,
  };
}

describe("validateBank(CCAR-P の固定フォーム。T-pmock)", () => {
  it("63 問・配分 11-8-12-10-9-9-4・全問 scenario_id null・scenarios.yaml 無しは緑", () => {
    expect(validateBank(makePBank())).toEqual({ errors: [], warnings: [] });
  });

  const bad: [string, (b: BankInput) => void, RegExp][] = [
    ["問題数が 63 でない", (b) => { b.forms = [{ ...b.forms[0], question_ids: b.forms[0].question_ids.slice(1) }]; }, /form-a: 問題数 62\(63 問必須\)/],
    ["scenario_ids を持つ", (b) => { b.forms = [{ ...b.forms[0], scenario_ids: ["sc-1"] }]; }, /form-a: 独立問題形式のため scenario_ids は空/],
    ["収載問題の scenario_id が非 null", (b) => {
      b.scenarios = [makeScenario("sc-1")];
      (b.questions[0] as { scenario_id: string }).scenario_id = "sc-1";
    }, /form-a: p-d1-q001 の scenario_id が null でない\(独立問題形式\)/],
    ["ドメイン配分が固定配分と不一致", (b) => {
      const ids = [...b.forms[0].question_ids];
      ids[0] = "p-d7-q100";
      (b.questions.find((q) => q.id === "p-d7-q100") as { eligible_modes: string[]; srs_eligible: boolean }).eligible_modes = ["mock", "practice"];
      (b.questions.find((q) => q.id === "p-d7-q100") as { srs_eligible: boolean }).srs_eligible = false;
      b.forms = [{ ...b.forms[0], question_ids: ids }];
    }, /form-a: p-d1 の配分 10\(固定配分=11\)/],
    ["syllabus の form_questions が固定配分と不一致", (b) => {
      b.syllabus.domains[0].form_questions = 10;
      b.syllabus.domains[6].form_questions = 5;
    }, /syllabus: p-d1 の form_questions=10 が固定配分\(11\)と不一致/],
    ["選択肢が 3 個", (b) => {
      (b.questions[1] as { choices: { label: string; text_en: string }[] }).choices = [
        { label: "A", text_en: "a" },
        { label: "B", text_en: "b" },
        { label: "C", text_en: "c" },
      ];
    }, /form-a: p-d1-q002 の選択肢 3 個\(4〜5 個\)/],
    ["選択肢が 6 個", (b) => {
      (b.questions[1] as { choices: { label: string; text_en: string }[] }).choices = ["A", "B", "C", "D", "E", "F"].map((label) => ({ label, text_en: label }));
    }, /form-a: p-d1-q002 の選択肢 6 個/],
    ["flash を収載", (b) => {
      b.questions = b.questions.map((q, i) => (i === 1 ? ({ ...q, type: "flash", choices: null, answer: null, answer_en: "a" } as Question) : q));
    }, /form-a: p-d1-q002 は flash/],
    ["収載問題の srs_eligible が true", (b) => { (b.questions[1] as { srs_eligible: boolean }).srs_eligible = true; }, /form-a: p-d1-q002 の srs_eligible が false でない/],
    // D6-9: P のフォーム収載問題は構造化解説フィールド必須(03 §mock_forms §CCAR-P、fail closed)
    ["収載問題に binding_constraint_ja が無い", (b) => {
      const rest = { ...b.questions[1] } as Question & { binding_constraint_ja?: string };
      delete rest.binding_constraint_ja;
      (b.questions as Question[])[1] = rest;
    }, /form-a: p-d1-q002 に binding_constraint_ja が無い/],
    ["収載問題の正解でない選択肢に plausible_ja / not_best_ja が無い", (b) => {
      const q = b.questions[1] as { choices: { label: string; text_en: string; plausible_ja?: string; not_best_ja?: string }[] };
      q.choices = q.choices.map((c) => (c.label === "C" ? { label: c.label, text_en: c.text_en } : c));
    }, /form-a: p-d1-q002 の選択肢 C に plausible_ja \/ not_best_ja が無い/],
    ["収載問題の mcq_multi の正解でない選択肢に not_best_ja が無い", (b) => {
      const q = b.questions[0] as { choices: { label: string; text_en: string; plausible_ja?: string; not_best_ja?: string }[] };
      q.choices = q.choices.map((c) => (c.label === "E" ? { label: c.label, text_en: c.text_en, plausible_ja: "x" } : c));
    }, /form-a: p-d1-q001 の選択肢 E に plausible_ja \/ not_best_ja が無い/],
  ];
  for (const [name, mutate, re] of bad) {
    it(`invalid: ${name}`, () => {
      const b = makePBank();
      mutate(b);
      expect(validateBank(b).errors.join("\n")).toMatch(re);
    });
  }
});

describe("runValidateAll(content/<exam>/ を exam ごとに検証)", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "validate-all-"));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function write(exam: string, files: { syllabus?: Syllabus; questions?: Question[]; forms?: MockForm[]; scenarios?: Scenario[] }) {
    const dir = path.join(root, exam);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "SOURCES.md"), "# sources\n");
    if (files.syllabus) writeFileSync(path.join(dir, "syllabus.yaml"), toYaml(files.syllabus));
    if (files.questions) {
      mkdirSync(path.join(dir, "questions"));
      writeFileSync(path.join(dir, "questions", "all.json"), JSON.stringify(files.questions));
    }
    if (files.forms) writeFileSync(path.join(dir, "mock_forms.yaml"), toYaml({ forms: files.forms }));
    if (files.scenarios) writeFileSync(path.join(dir, "scenarios.yaml"), toYaml({ scenarios: files.scenarios }));
  }
  const writeF = () => {
    const b = makeBank();
    write("ccar-f", { syllabus: b.syllabus, questions: [...b.questions], forms: [...b.forms], scenarios: [...(b.scenarios ?? [])] });
  };

  it("F 完全 + P 空(SOURCES.md のみ)⇒ exit 0、F は OK・P は SKIP", () => {
    writeF();
    write("ccar-p", {});
    const r = runValidateAll(root);
    expect(r.exitCode).toBe(0);
    const out = r.stdout.join("\n");
    expect(out).toMatch(/validate-bank OK \[ccar-f\] \(questions 65 \/ forms 1, warnings 0\)/);
    expect(out).toMatch(/validate-bank SKIP \[ccar-p\]/);
  });

  it("P ディレクトリが無くても SKIP", () => {
    writeF();
    const r = runValidateAll(root);
    expect(r.exitCode).toBe(0);
    expect(r.stdout.join("\n")).toMatch(/SKIP \[ccar-p\]/);
  });

  it("P fixture(7 ドメイン syllabus + 問題、form 無し)⇒ OK [ccar-p]", () => {
    writeF();
    write("ccar-p", {
      syllabus: makePSyllabus(),
      questions: P_WEIGHTS.flatMap((_, i) => [1, 2].map((n) => makePQuestion(`p-d${i + 1}`, n))),
    });
    const r = runValidateAll(root);
    expect(r.stderr).toEqual(expect.not.arrayContaining([expect.stringMatching(/NG/)]));
    expect(r.exitCode).toBe(0);
    expect(r.stdout.join("\n")).toMatch(/validate-bank OK \[ccar-p\] \(questions 14 \/ forms 0/);
  });

  it("P の syllabus.exam がディレクトリと不一致 ⇒ exit 1", () => {
    writeF();
    write("ccar-p", { syllabus: makeSyllabus() });
    const r = runValidateAll(root);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.join("\n")).toMatch(/NG \[ccar-p\] syllabus\.yaml: exam=ccar-f が content\/ccar-p\/ と不一致/);
  });

  it("P に questions があるが syllabus 無し ⇒ exit 1(空扱いにしない)", () => {
    writeF();
    write("ccar-p", { questions: [makePQuestion("p-d1", 1)] });
    const r = runValidateAll(root);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.join("\n")).toMatch(/NG \[ccar-p\] syllabus\.yaml/);
  });

  it("P の question.exam が ccar-f ⇒ exit 1", () => {
    writeF();
    write("ccar-p", { syllabus: makePSyllabus(), questions: [makePQuestion("p-d1", 1, { exam: "ccar-f" })] });
    expect(runValidateAll(root).exitCode).toBe(1);
  });

  it("P の form(63 問・確定配分・独立問題形式)⇒ OK [ccar-p](T-pmock)", () => {
    writeF();
    const b = makePBank();
    write("ccar-p", { syllabus: b.syllabus, questions: [...b.questions], forms: [...b.forms] });
    const r = runValidateAll(root);
    expect(r.stderr).toEqual([]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout.join("\n")).toMatch(/validate-bank OK \[ccar-p\] \(questions 70 \/ forms 1, warnings 0\)/);
  });

  it("P の form が F の構造(60 問・シナリオ付き)⇒ exit 1", () => {
    writeF();
    const qs = Array.from({ length: 60 }, (_, i) =>
      makePQuestion("p-d1", i + 1, { eligible_modes: ["mock", "practice"], srs_eligible: false, scenario_id: "sc-1" }),
    );
    write("ccar-p", {
      syllabus: makePSyllabus(),
      questions: qs,
      forms: [{ id: "form-a", exam: "ccar-p", scenario_ids: ["sc-1"], question_ids: qs.map((q) => q.id) }],
      scenarios: [makeScenario("sc-1")],
    });
    const r = runValidateAll(root);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.join("\n")).toMatch(/NG \[ccar-p\] mock_forms\.yaml:.*63 件/);
  });

  it("P 側の違反は F の結果に影響しない(F は OK 行のまま)", () => {
    writeF();
    write("ccar-p", { questions: [makePQuestion("p-d1", 1)] });
    const r = runValidateAll(root);
    expect(r.stdout.join("\n")).toMatch(/OK \[ccar-f\]/);
    expect(r.stderr.join("\n")).not.toMatch(/\[ccar-f\]/);
  });

  it("全 exam が空 ⇒ exit 1(content root の取り違え検出)", () => {
    write("ccar-f", {});
    const r = runValidateAll(root);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.join("\n")).toMatch(/全 exam が空/);
  });
});

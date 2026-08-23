import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stringify as toYaml } from "yaml";
import { MOCK_FORM_SIZE, type MockForm, type Question, type Syllabus } from "../src/lib/bank/schema";
import { loadBankForValidation, runValidateBank, validateBank, type BankInput } from "./validate-bank";

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
    scenarios: scen.map((id) => ({ id })),
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
    ["form 収載問題の scenario_id が null", (b) => { (b.questions[0] as { scenario_id: string | null }).scenario_id = null; }, /scenario_id が null/],
    ["scenario_id が form.scenario_ids に無い", (b) => { b.scenarios = [...b.scenarios!, { id: "sc-9" }]; (b.questions[0] as { scenario_id: string }).scenario_id = "sc-9"; }, /scenario_id sc-9 が form\.scenario_ids に無い/],
    ["form.scenario_ids に未使用シナリオ", (b) => { b.scenarios = [...b.scenarios!, { id: "sc-9" }]; b.forms = [{ ...b.forms[0], scenario_ids: [...b.forms[0].scenario_ids, "sc-9"] }]; }, /sc-9 を使う問題が無い/],
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

  it("MOCK_FORM_SIZE は 60", () => {
    expect(MOCK_FORM_SIZE).toBe(60);
  });
});

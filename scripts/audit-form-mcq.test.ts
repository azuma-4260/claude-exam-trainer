// audit-form-mcq の監査ロジックのテスト(B-C3a-1 恒久化。フォーム収載 MCQ の固有不変条件)
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseArgs, runAuditFormMcq } from "./audit-form-mcq";

const URL_A = "https://docs.claude.com/en/docs/claude-code/memory";
const URL_B = "https://www.anthropic.com/engineering/building-effective-agents";
const URL_OUT = "https://example.com/not-in-ledger";

const SYLLABUS = `
exam: ccar-f
version: 1
source: content/ccar-f/SOURCES.md
domains:
  - id: f-d1
    name: "D1"
    weight: 100
    form_questions: 60
    task_statements:
      - id: f-d1-t1
        name: "TS1"
        topics:
          - { id: f-d1-t1-01, name: "T1", scope_ja: "範囲" }
`;

const SOURCES = `# S\n\n## 10. refs ソース台帳\n\n| # | ref URL | 正規 URL | 対応 |\n|---|---|---|---|\n| 1 | ${URL_A} | x | 1.1 |\n| 2 | ${URL_B} | x | 1.1 |\n`;

const SCENARIOS = `
scenarios:
  - id: sc-x
    title_en: "X"
    context_en: "context"
    refs: ["${URL_A}"]
`;

function mcq(n: number, over: Record<string, unknown> = {}): Record<string, unknown> {
  const labels = ["A", "B", "C", "D"];
  return {
    id: `f-d1-q${String(n).padStart(3, "0")}`,
    exam: "ccar-f",
    domain_id: "f-d1",
    primary_topic_id: "f-d1-t1-01",
    secondary_topic_ids: [],
    type: "mcq_single",
    scenario_id: "sc-x",
    eligible_modes: ["mock", "practice"],
    srs_eligible: false,
    stem_en: "Which option is correct for this scenario question?",
    choices: labels.map((l) => ({ label: l, text_en: `choice ${l}` })),
    answer: [labels[n % 4]],
    answer_en: null,
    explanation_ja: "正解の根拠。他の選択肢が誤りである理由。",
    refs: [URL_A],
    difficulty: 2,
    status: "flagged",
    rev: 1,
    ...over,
  };
}

/** 60 問 + form-a を書き込む。patch で任意の 1 問を上書きできる */
function writeBank(dir: string, patch: (qs: Record<string, unknown>[]) => void = () => {}): void {
  const qs = Array.from({ length: 60 }, (_, i) => mcq(i + 1));
  patch(qs);
  writeFileSync(path.join(dir, "questions", "form-a.json"), JSON.stringify(qs));
  const ids = qs.map((q) => q.id);
  const forms = `forms:\n  - id: form-a\n    exam: ccar-f\n    scenario_ids: [sc-x]\n    question_ids: [${ids.join(", ")}]\n`;
  writeFileSync(path.join(dir, "mock_forms.yaml"), forms);
}

let tmp: string;
let dir: string;
beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "audit-form-"));
  dir = path.join(tmp, "content");
  mkdirSync(path.join(dir, "questions"), { recursive: true });
  writeFileSync(path.join(dir, "syllabus.yaml"), SYLLABUS);
  writeFileSync(path.join(dir, "SOURCES.md"), SOURCES);
  writeFileSync(path.join(dir, "scenarios.yaml"), SCENARIOS);
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("runAuditFormMcq", () => {
  it("固定値・status・refs がすべて正しければ errors なし(60 問監査)", () => {
    writeBank(dir);
    const r = runAuditFormMcq(dir, { formId: null, status: "flagged" });
    expect(r.errors).toEqual([]);
    expect(r.total).toBe(60);
  });

  it("srs_eligible=true の混入を検出する(B-D0-3-2 (2) の緩和)", () => {
    writeBank(dir, (qs) => {
      qs[3] = mcq(4, { srs_eligible: true });
    });
    const r = runAuditFormMcq(dir, { formId: null, status: "flagged" });
    expect(r.errors.some((e) => e.includes("f-d1-q004") && e.includes("srs_eligible"))).toBe(true);
  });

  it("eligible_modes の集合不一致を検出する", () => {
    writeBank(dir, (qs) => {
      qs[0] = mcq(1, { eligible_modes: ["mock"] });
    });
    const r = runAuditFormMcq(dir, { formId: null, status: "flagged" });
    expect(r.errors.some((e) => e.includes("f-d1-q001") && e.includes("eligible_modes"))).toBe(true);
  });

  it("status 不一致(active 期待に flagged)を検出する", () => {
    writeBank(dir);
    const r = runAuditFormMcq(dir, { formId: null, status: "active" });
    expect(r.errors.filter((e) => e.includes("status flagged(期待 active)"))).toHaveLength(60);
  });

  it("台帳外の refs を検出する", () => {
    writeBank(dir, (qs) => {
      qs[9] = mcq(10, { refs: [URL_OUT] });
    });
    const r = runAuditFormMcq(dir, { formId: null, status: "flagged" });
    expect(r.errors.some((e) => e.includes("f-d1-q010") && e.includes(URL_OUT))).toBe(true);
  });

  it("正解ラベルの偏りを warning にする(errors にはしない)", () => {
    writeBank(dir, (qs) => {
      for (let i = 0; i < 30; i++) qs[i] = mcq(i + 1, { answer: ["A"] });
    });
    const r = runAuditFormMcq(dir, { formId: null, status: "flagged" });
    expect(r.errors).toEqual([]);
    expect(r.warnings.some((w) => w.includes("正解ラベル A"))).toBe(true);
  });

  it("--form 指定が存在しない form ならエラー", () => {
    writeBank(dir);
    const r = runAuditFormMcq(dir, { formId: "form-z", status: "flagged" });
    expect(r.errors.some((e) => e.includes("form-z"))).toBe(true);
  });

  it("mock_forms.yaml 不在は明示エラー", () => {
    rmSync(path.join(dir, "mock_forms.yaml"), { force: true });
    const r = runAuditFormMcq(dir, { formId: null, status: "flagged" });
    expect(r.errors.some((e) => e.includes("mock_forms.yaml が無い"))).toBe(true);
  });
});

describe("parseArgs", () => {
  it("既定は status=active・全 form", () => {
    const { opts } = parseArgs([]);
    expect(opts).toEqual({ formId: null, status: "active" });
  });

  it("--form / --status / --dir を解釈する", () => {
    const { dir: d, opts } = parseArgs(["--dir", "/tmp/x", "--form", "form-a", "--status", "flagged"]);
    expect(d).toBe(path.resolve("/tmp/x"));
    expect(opts).toEqual({ formId: "form-a", status: "flagged" });
  });

  it("未知の引数は fail closed", () => {
    expect(() => parseArgs(["--nope"])).toThrow("未知の引数");
  });
});

import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadBankFrom } from "./load";

// D1-3: バンク読込(content/ が空でも完全形で動き、存在すれば Zod 単一ソースで検証する)

const base = {
  id: "f-d2-q001", exam: "ccar-f", domain_id: "f-d2", primary_topic_id: "f-d2-t1-03", secondary_topic_ids: [],
  type: "flash", scenario_id: null, eligible_modes: ["drill"], srs_eligible: true,
  stem_en: "What is the default transport for a local MCP server?", choices: null, answer: null, answer_en: "stdio",
  explanation_ja: "ローカルは stdio。", refs: ["https://docs.claude.com/en/docs/mcp"], difficulty: 1, status: "active", rev: 1,
};

describe("loadBankFrom", () => {
  it("ディレクトリが無い / 空なら空バンク", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "bank-"));
    const bank = loadBankFrom(dir);
    expect(bank.questions).toEqual([]);
    expect(bank.forms).toEqual([]);
    expect(bank.byId.size).toBe(0);
    expect(loadBankFrom(path.join(dir, "missing")).questions).toEqual([]);
  });

  it("questions/*.json を読み byId を作る。壊れた問題は拒否", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "bank-"));
    mkdirSync(path.join(dir, "questions"));
    writeFileSync(path.join(dir, "questions", "d2.json"), JSON.stringify([base, { ...base, id: "f-d2-q002" }]));
    const bank = loadBankFrom(dir);
    expect(bank.byId.get("f-d2-q002")?.rev).toBe(1);
    writeFileSync(path.join(dir, "questions", "bad.json"), JSON.stringify([{ ...base, id: "bad" }]));
    expect(() => loadBankFrom(dir)).toThrow();
  });

  it("id 重複はファイルを跨いでも拒否", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "bank-"));
    mkdirSync(path.join(dir, "questions"));
    writeFileSync(path.join(dir, "questions", "a.json"), JSON.stringify([base]));
    writeFileSync(path.join(dir, "questions", "b.json"), JSON.stringify([base]));
    expect(() => loadBankFrom(dir)).toThrow(/重複/);
  });

  it("mock_forms.yaml を読む(60 問未満は拒否)", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "bank-"));
    const ids = Array.from({ length: 60 }, (_, i) => `f-d1-q${String(100 + i).padStart(3, "0")}`);
    writeFileSync(path.join(dir, "mock_forms.yaml"), `forms:\n  - id: form-a\n    exam: ccar-f\n    scenario_ids: [sc-1]\n    question_ids: [${ids.join(", ")}]\n`);
    expect(loadBankFrom(dir).forms[0]?.id).toBe("form-a");
    writeFileSync(path.join(dir, "mock_forms.yaml"), `forms:\n  - id: form-a\n    exam: ccar-f\n    scenario_ids: [sc-1]\n    question_ids: [f-d1-q100]\n`);
    expect(() => loadBankFrom(dir)).toThrow();
  });
});

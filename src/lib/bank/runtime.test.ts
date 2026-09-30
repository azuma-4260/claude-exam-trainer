import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mcq, pmcq, pSyllabus, syllabus } from "@/lib/queue/test-fixtures";
import { combineExamBanks, loadExamBank, scopeBank } from "./runtime";

// T-exam: 実行時の多試験バンク(exam ごとのディレクトリを和集合にし、新規出題はスコープで絞る)

const f1 = mcq("f-d1-q001");
const p1 = pmcq("p-d1-q001");
const multi = () =>
  combineExamBanks([
    { exam: "ccar-f", questions: [f1], forms: [], syllabus, scenarios: null },
    { exam: "ccar-p", questions: [p1], forms: [], syllabus: pSyllabus, scenarios: null },
  ]);

describe("combineExamBanks", () => {
  it("全 exam の和集合(byId は exam をまたいで引ける)", () => {
    const m = multi();
    expect(m.all.questions.map((q) => q.id)).toEqual(["f-d1-q001", "p-d1-q001"]);
    expect(m.all.byId.get("p-d1-q001")).toBe(p1);
    expect(m.get("ccar-p").syllabus).toBe(pSyllabus);
  });

  it("ディレクトリの exam と question.exam の不一致は拒否(BANK_DIR の取り違え等)", () => {
    expect(() => combineExamBanks([{ exam: "ccar-p", questions: [f1], forms: [], syllabus: null, scenarios: null }])).toThrow(
      /f-d1-q001/,
    );
  });

  it("欠けている exam は空バンク扱い", () => {
    const m = combineExamBanks([{ exam: "ccar-f", questions: [f1], forms: [], syllabus, scenarios: null }]);
    expect(m.get("ccar-p")).toEqual({ exam: "ccar-p", questions: [], forms: [], syllabus: null, scenarios: null });
  });
});

describe("scopeBank(出題プール段 0)", () => {
  it("questions / byId はスコープ内 exam のみ。forms は holdout 判定のため全 exam", () => {
    const s = scopeBank(multi(), "ccar-f");
    expect(s.bank.questions.map((q) => q.id)).toEqual(["f-d1-q001"]);
    expect(s.bank.byId.has("p-d1-q001")).toBe(false);
    expect(s.syllabi).toEqual([syllabus]);
    const both = scopeBank(multi(), "both");
    expect(both.bank.questions).toHaveLength(2);
    expect(both.syllabi).toEqual([syllabus, pSyllabus]);
  });
});

describe("loadExamBank(content/<exam>)", () => {
  it("syllabus のみ・問題なしの exam ディレクトリも読める(空の問題集合、syllabus あり)", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "bank-"));
    const prev = process.env.BANK_DIR;
    try {
      mkdirSync(path.join(root, "ccar-p"));
      copyFileSync(path.join(process.cwd(), "content", "ccar-p", "syllabus.yaml"), path.join(root, "ccar-p", "syllabus.yaml"));
      process.env.BANK_DIR = root;
      const p = loadExamBank("ccar-p");
      expect(p.questions).toEqual([]);
      expect(p.forms).toEqual([]);
      expect(p.syllabus?.exam).toBe("ccar-p");
    } finally {
      if (prev === undefined) delete process.env.BANK_DIR;
      else process.env.BANK_DIR = prev;
      rmSync(root, { recursive: true, force: true });
    }
  });

  // 実バンクの P は CP2 / CP3 で問題が入るため件数に依存しない(空バンクは上の fixture で担保)
  it("P を読める(全問 exam = ccar-p、form は T-pmock 確定まで無し、syllabus は P)", () => {
    const p = loadExamBank("ccar-p");
    expect(p.questions.every((q) => q.exam === "ccar-p")).toBe(true);
    expect(p.forms).toEqual([]);
    expect(p.syllabus?.exam).toBe("ccar-p");
  });

  it("F は従来どおり読める(全問 exam = ccar-f、syllabus あり)", () => {
    const f = loadExamBank("ccar-f");
    expect(f.questions.length).toBeGreaterThan(0);
    expect(f.questions.every((q) => q.exam === "ccar-f")).toBe(true);
    expect(f.syllabus?.exam).toBe("ccar-f");
  });
});

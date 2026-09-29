import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bankDir } from "./load";

// BANK_DIR override は development 限定(検証支援)。production では必ず無視する。
// D6-3: BANK_DIR はコンテンツルート(<BANK_DIR>/<exam>/ を読む)
describe("bankDir の BANK_DIR override", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("未指定なら content/<exam> を返す(既定は ccar-f)", () => {
    vi.stubEnv("BANK_DIR", "");
    expect(bankDir()).toBe(path.join(process.cwd(), "content", "ccar-f"));
    expect(bankDir("ccar-p")).toBe(path.join(process.cwd(), "content", "ccar-p"));
  });

  it("development では <BANK_DIR>/<exam> を使う", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BANK_DIR", "/tmp/fixture-bank");
    expect(bankDir()).toBe(path.resolve("/tmp/fixture-bank/ccar-f"));
    expect(bankDir("ccar-p")).toBe(path.resolve("/tmp/fixture-bank/ccar-p"));
  });

  it("development で BANK_DIR が exam ディレクトリ自体(旧用法)なら throw", () => {
    vi.stubEnv("NODE_ENV", "development");
    const withSyllabus = mkdtempSync(path.join(tmpdir(), "bank-root-"));
    writeFileSync(path.join(withSyllabus, "syllabus.yaml"), "exam: ccar-f\n");
    vi.stubEnv("BANK_DIR", withSyllabus);
    expect(() => bankDir()).toThrow(/コンテンツルート/);
    const withQuestions = mkdtempSync(path.join(tmpdir(), "bank-root-"));
    mkdirSync(path.join(withQuestions, "questions"));
    vi.stubEnv("BANK_DIR", withQuestions);
    expect(() => bankDir("ccar-p")).toThrow(/コンテンツルート/);
  });

  it("production では BANK_DIR を無視する", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BANK_DIR", "/tmp/fixture-bank");
    expect(bankDir()).toBe(path.join(process.cwd(), "content", "ccar-f"));
  });
});

import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bankDir } from "./load";

// BANK_DIR override は development 限定(検証支援)。production では必ず無視する
describe("bankDir の BANK_DIR override", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("未指定なら content/<exam> を返す", () => {
    vi.stubEnv("BANK_DIR", "");
    expect(bankDir()).toBe(path.join(process.cwd(), "content", "ccar-f"));
  });

  it("development では BANK_DIR の絶対パスを使う", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BANK_DIR", "/tmp/fixture-bank/ccar-f");
    expect(bankDir()).toBe(path.resolve("/tmp/fixture-bank/ccar-f"));
  });

  it("production では BANK_DIR を無視する", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BANK_DIR", "/tmp/fixture-bank/ccar-f");
    expect(bankDir()).toBe(path.join(process.cwd(), "content", "ccar-f"));
  });
});

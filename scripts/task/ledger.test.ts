import { describe, expect, it } from "vitest";
import { buildLedger, parseLedgerFile, formatLedgerFile, LedgerError } from "./ledger";

describe("台帳 parser", () => {
  it("done + evidence を読む(引用符・コメント・空行を許容)", () => {
    const e = parseLedgerFile("A", '# c\nstate: done\nevidence: "CI run 1"  # ok\n\nrecorded: 2026-08-23\n');
    expect(e).toEqual({ state: "done", evidence: "CI run 1", recorded: "2026-08-23" });
  });
  it("merged は evidence 不要", () => {
    expect(parseLedgerFile("A", "state: merged\n").state).toBe("merged");
  });
  it("done に evidence 無しは失敗", () => {
    expect(() => parseLedgerFile("A", "state: done\n")).toThrow(LedgerError);
  });
  it("未知 state / 未知キー / 解釈不能行 / キー重複は失敗", () => {
    expect(() => parseLedgerFile("A", "state: wip\n")).toThrow(/state/);
    expect(() => parseLedgerFile("A", "state: merged\nowner: x\n")).toThrow(/未知のキー/);
    expect(() => parseLedgerFile("A", "state: merged\n- foo\n")).toThrow(/解釈できない/);
    expect(() => parseLedgerFile("A", "state: merged\nstate: done\n")).toThrow(/重複/);
  });
  it("未知 ID のファイル / .yaml 以外は失敗", () => {
    expect(() => buildLedger(["Z.yaml"], () => "state: merged\n", new Set(["A"]))).toThrow(/未知の ID/);
    expect(() => buildLedger(["A.yml"], () => "state: merged\n", new Set(["A"]))).toThrow(/想定外/);
  });
  it("format → parse が往復する", () => {
    const e = { state: "done" as const, evidence: 'x "q"', recorded: "2026-08-23" };
    expect(parseLedgerFile("A", formatLedgerFile(e))).toEqual({ ...e, evidence: "x 'q'" });
  });
});

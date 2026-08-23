import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { loadGraph, parseCanonical, parseDerived, isMilestone, GraphError } from "./graph";

const real = readFileSync(new URL("../../specs/09_task-plan.md", import.meta.url), "utf8");

// 最小 fixture: §3 に M0、§4 に A / B、§5 に同内容
function fixture(opts: { s3?: string; s4?: string; s5?: string } = {}): string {
  const s3 = opts.s3 ?? "| ID | 日付 | イベント | depends | DoD |\n|---|---|---|---|---|\n| M0 | 8/24 | x | A, B | y |\n";
  const s4 = opts.s4 ?? "### Phase 0\n\n| ID | Tr | タスク | depends | spec | DoD |\n|---|---|---|---|---|---|\n| A | D | a | – | 03 | d |\n| B | D | b | A | 03 | d |\n";
  const s5 = opts.s5 ?? "```\nA ← (なし)\nB ← A\nM0 ← A, B\n```\n";
  return `# 09\n\n## 1. 原則\n\nx\n\n## 3. マイルストーン\n\n${s3}\n## 4. 依存表\n\n${s4}\n## 5. 依存グラフ\n\n${s5}\n## 6. 配分\n\n| 日 | a |\n|---|---|\n| 8/23 | S-1 |\n`;
}

describe("現物 specs/09_task-plan.md", () => {
  it("§3 が 9、§4 が 46、計 55 ノードで §5 と一致する", () => {
    const g = loadGraph(real);
    const ids = [...g.keys()];
    expect(ids.filter(isMilestone)).toHaveLength(9);
    expect(ids.filter((x) => !isMilestone(x))).toHaveLength(46);
    expect(g.size).toBe(55);
    expect(parseDerived(real).size).toBe(55);
  });
  it("既知の依存が読める", () => {
    const g = loadGraph(real);
    expect(g.get("D0-3")).toEqual(["D0-2", "C1", "O-2a"]);
    expect(g.get("S-1")).toEqual([]);
    expect(g.get("M1")).toContain("C2");
  });
});

describe("fixture による検証", () => {
  it("整合した fixture は通る", () => {
    expect(loadGraph(fixture(), 3).size).toBe(3);
  });
  it("§3 と §4 を結合する(§3 だけ / §4 だけでは揃わない)", () => {
    expect(parseCanonical(fixture()).has("M0")).toBe(true);
    expect(parseCanonical(fixture()).has("A")).toBe(true);
  });
  it("未知 ID 参照は失敗", () => {
    const s4 = "| ID | Tr | タスク | depends | spec | DoD |\n|---|---|---|---|---|---|\n| A | D | a | Z | 03 | d |\n| B | D | b | A | 03 | d |\n";
    expect(() => loadGraph(fixture({ s4 }), 3)).toThrow(GraphError);
  });
  it("ID 重複は失敗", () => {
    const s4 = "| ID | Tr | タスク | depends | spec | DoD |\n|---|---|---|---|---|---|\n| A | D | a | – | 03 | d |\n| A | D | b | – | 03 | d |\n";
    expect(() => loadGraph(fixture({ s4 }), 3)).toThrow(/重複/);
  });
  it("循環は失敗", () => {
    const s4 = "| ID | Tr | タスク | depends | spec | DoD |\n|---|---|---|---|---|---|\n| A | D | a | B | 03 | d |\n| B | D | b | A | 03 | d |\n";
    const s5 = "```\nA ← B\nB ← A\nM0 ← A, B\n```\n";
    expect(() => loadGraph(fixture({ s4, s5 }), 3)).toThrow(/循環/);
  });
  it("§5 の欠落・過剰・辺の不一致は失敗", () => {
    expect(() => loadGraph(fixture({ s5: "```\nA ← (なし)\nM0 ← A, B\n```\n" }), 3)).toThrow(/欠落/);
    expect(() => loadGraph(fixture({ s5: "```\nA ← (なし)\nB ← A\nC ← A\nM0 ← A, B\n```\n" }), 3)).toThrow(/過剰/);
    expect(() => loadGraph(fixture({ s5: "```\nA ← (なし)\nB ← (なし)\nM0 ← A, B\n```\n" }), 3)).toThrow(/不一致/);
  });
  it("ノード数不一致は失敗", () => {
    expect(() => loadGraph(fixture(), 54)).toThrow(/ノード数/);
  });
  it("§3 に M-* 以外があれば失敗", () => {
    const s3 = "| ID | 日付 | イベント | depends | DoD |\n|---|---|---|---|---|\n| X1 | 8/24 | x | – | y |\n";
    expect(() => loadGraph(fixture({ s3 }), 3)).toThrow(/M-\* 以外/);
  });
});

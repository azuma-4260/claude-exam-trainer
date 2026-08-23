import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadGraph } from "./graph";
import { EXCLUSIVE_LOCKS, PAIRED_DEPENDENTS, PAIRS, lockOf } from "./pair";

const real09 = readFileSync(new URL("../../specs/09_task-plan.md", import.meta.url), "utf8");

describe("pair 定数", () => {
  const g = loadGraph(real09);
  it("PAIRS / EXCLUSIVE_LOCKS の ID はすべて 09 に存在し、D-y は T-x に依存する", () => {
    for (const [t, d] of PAIRS) {
      expect(g.has(t), t).toBe(true);
      expect(g.has(d), d).toBe(true);
      expect(g.get(d), `${d} depends`).toContain(t);
    }
    for (const ids of EXCLUSIVE_LOCKS.values()) for (const id of ids) expect(g.has(id), id).toBe(true);
  });
  it("09 §7 の paired task 列挙と一致する(5 組、T-rev は含まない)", () => {
    const s7 = real09.split("## 7.")[1];
    const listed = [...s7.matchAll(/(T-[a-z]+)\/(D\d-\d)/g)].map((m) => [m[1], m[2]] as const);
    expect(new Map(listed)).toEqual(new Map(PAIRS));
    expect(PAIRS.has("T-rev")).toBe(false);
  });
  it("逆引きと lockOf", () => {
    expect(PAIRED_DEPENDENTS.get("D1-2")).toBe("T-holdout");
    expect(lockOf("D0-4")).toBe("migration");
    expect(lockOf("D1-2")).toBeNull();
  });
});

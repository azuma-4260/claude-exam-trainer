import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createEmptyCard } from "ts-fsrs";

// README / specs/06: ts-fsrs は 5.4.1 exact pin(再現ソースは package-lock.json)
describe("依存バージョンの固定", () => {
  it("package.json と package-lock.json の ts-fsrs が 5.4.1 exact である", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
    expect(pkg.dependencies["ts-fsrs"]).toBe("5.4.1");
    expect(lock.packages["node_modules/ts-fsrs"].version).toBe("5.4.1");
  });

  it("ランタイムの ts-fsrs で Card を生成できる", () => {
    expect(createEmptyCard().reps).toBe(0);
  });
});

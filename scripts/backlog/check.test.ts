import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkBacklogDir } from "./check";
import { parseBacklogFile } from "./schema";

const known = new Set(["D0-1", "D1-1", "D1-2", "D1-3", "D0-3"]);

const valid = `---
id: B-D1-2-1
origin: D1-2
created: 2026-08-25
status: open
related_tasks: [D1-3]
related_specs: ["03#出題プールの判定順序"]
related_paths: [src/lib/pool.ts]
related_backlog: [B-D1-1-2]
stop_condition: none
decisions:
  - { at: 2026-08-26, by: D1-3, action: defer, note: "D1-3 の範囲外" }
---
# 解放バッジの表示が spec と違う

再現手順 ...
`;

describe("parseBacklogFile", () => {
  it("valid fixture を受理し title を取る", () => {
    const item = parseBacklogFile("B-D1-2-1.md", valid, known);
    expect(item.title).toBe("解放バッジの表示が spec と違う");
    expect(item.related_tasks).toEqual(["D1-3"]);
    expect(item.decisions?.[0].action).toBe("defer");
  });
  it("absorb した他ブランチ項目を related_backlog で参照する通常経路が通る", () => {
    const t = valid.replace("related_backlog: [B-D1-1-2]", "related_backlog: [B-D1-6-3]");
    expect(() => parseBacklogFile("B-D1-2-1.md", t, known)).not.toThrow();
  });
  const bad: [string, (s: string) => string, RegExp][] = [
    ["id とファイル名不一致", (s) => s, /ファイル名/],
    ["origin が id と違う", (s) => s.replace("origin: D1-2", "origin: D1-1"), /origin/],
    ["未知の related_tasks", (s) => s.replace("[D1-3]", "[Z-9]"), /09 に無い/],
    ["不正な status", (s) => s.replace("status: open", "status: wip"), /status/],
    ["absorbed-by の未知 ID", (s) => s.replace("status: open", "status: absorbed-by Q-1"), /09 に無い/],
    ["promoted-to の未知 ID", (s) => s.replace("status: open", "status: promoted-to D9-9"), /09 に無い/],
    ["日付形式", (s) => s.replace("created: 2026-08-25", "created: 8/25"), /created/],
    ["stop_condition 列挙外", (s) => s.replace("stop_condition: none", "stop_condition: db"), /stop_condition/],
    ["decision の action 列挙外", (s) => s.replace("action: defer", "action: claim"), /action/],
    ["未知キー", (s) => s.replace("stop_condition: none", "stop_condition: none\nowner: me"), /owner/],
    ["related_backlog の形式", (s) => s.replace("[B-D1-1-2]", "[D1-1]"), /related_backlog/],
    ["front matter なし", () => "# no front matter\n", /front matter/],
    ["related_paths が絶対パス", (s) => s.replace("[src/lib/pool.ts]", "[/tmp/x]"), /related_paths/],
    ["related_paths に ..", (s) => s.replace("[src/lib/pool.ts]", "[../x]"), /related_paths/],
  ];
  for (const [name, mutate, re] of bad) {
    it(`invalid: ${name}`, () => {
      const file = name === "id とファイル名不一致" ? "B-D1-2-2.md" : "B-D1-2-1.md";
      expect(() => parseBacklogFile(file, mutate(valid), known)).toThrow(re);
    });
  }
});

describe("checkBacklogDir", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "backlog-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  it("README.md は無視し、壊れたファイルは errors に集める", () => {
    writeFileSync(path.join(dir, "README.md"), "# 説明\n");
    writeFileSync(path.join(dir, "B-D1-2-1.md"), valid);
    writeFileSync(path.join(dir, "B-D1-2-2.md"), valid);
    const r = checkBacklogDir(dir, known);
    expect(r.items.map((i) => i.id)).toEqual(["B-D1-2-1"]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/B-D1-2-2/);
  });
  it("ディレクトリが無ければ空", () => {
    mkdirSync(path.join(dir, "x"));
    expect(checkBacklogDir(path.join(dir, "none"), known)).toEqual({ items: [], errors: [] });
  });
});

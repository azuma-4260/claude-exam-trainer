// report の純関数テスト + 一時 git repo での集約テスト(check.test.ts と同じ fixture 方式)
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { judgeAll, takeSnapshot, type Verdict } from "./check";
import { loadGraph } from "./graph";
import { buildReport, findBottlenecks, parseNodeMeta, parseSchedule, isoJst, parseSessionState, selectCandidates, todayJst } from "./report";

const real09 = readFileSync(new URL("../../specs/09_task-plan.md", import.meta.url), "utf8");
const graph = loadGraph(real09);
const known = new Set(graph.keys());
const meta = parseNodeMeta(real09);
const schedule = parseSchedule(real09, known);

describe("09 の表の解析", () => {
  it("§4 の Tr / spec 列、§3 は M", () => {
    expect(meta.get("D0-4")).toEqual({ track: "D", spec: "03 §2, 06 §本番/開発 DB の分離と data-protection cutover" });
    expect(meta.get("T-srs")?.track).toBe("T");
    expect(meta.get("O-2b")?.track).toBe("O");
    expect(meta.get("M1")).toEqual({ track: "M", spec: "09 §3" });
    expect(meta.size).toBe(graph.size);
  });
  it("§6 の予定日(範囲行は開始日、装飾つき ID も拾う)", () => {
    expect(schedule.get("D0-4")).toBe("2026-08-24");
    expect(schedule.get("O-1")).toBe("2026-08-23"); // ~~O-1~~
    expect(schedule.get("T-mock")).toBe("2026-08-29"); // 8/29–9/4
    expect(schedule.get("D5-2")).toBe("2026-09-14"); // (D5-2)
    expect(schedule.get("M3")).toBe("2026-09-06");
  });
  it("isoJst は +09:00 で出す", () => {
    expect(isoJst(new Date("2026-08-24T16:05:06Z"))).toBe("2026-08-25T01:05:06+09:00");
  });
  it("todayJst は TZ に依存しない", () => {
    expect(todayJst(new Date("2026-08-24T16:00:00Z"))).toBe("2026-08-25"); // JST 01:00
    expect(todayJst(new Date("2026-08-24T14:59:00Z"))).toBe("2026-08-24");
  });
});

function verdictsOf(ready: string[], extra: Partial<Record<string, Verdict["status"]>> = {}): Map<string, Verdict> {
  const m = new Map<string, Verdict>();
  for (const id of graph.keys()) m.set(id, { id, status: "BLOCKED", blockedBy: [{ id: "X", status: "BLOCKED" }] });
  for (const id of ready) m.set(id, { id, status: "READY" });
  for (const [id, st] of Object.entries(extra)) m.set(id, { id, status: st! });
  return m;
}

describe("selectCandidates", () => {
  it("期限超過 → 当日 → 以降の順、同日はクリティカルパス優先、O/M/paired D-y は除外", () => {
    const v = verdictsOf(["D0-4", "D0-5", "T-srs", "D1-6", "O-2b", "M0", "D1-2", "D0-6"], { "D0-1": "DONE" });
    const r = selectCandidates({ verdicts: v, graph, meta, schedule, today: "2026-08-25" });
    expect(r.candidates.map((c) => c.id)).toEqual(["D0-4", "D0-5", "D0-6", "T-srs", "D1-6"]);
    expect(r.candidates[0].reason).toMatch(/期限超過・クリティカルパス/);
    expect(r.candidates.find((c) => c.id === "D1-6")?.reason).toBe("以降");
    expect(r.excluded).toEqual(
      expect.arrayContaining([
        { id: "O-2b", reason: "owner-track" },
        { id: "M0", reason: "milestone" },
        { id: "D1-2", reason: "paired-dependent" },
      ]),
    );
  });
  it("paired の T-x は相方 D-y の depends が未 DONE なら paired-blocked", () => {
    // T-write → D1-3 は D1-2, D0-5 にも依存
    const v = verdictsOf(["T-write"], { "D0-5": "DONE" });
    expect(selectCandidates({ verdicts: v, graph, meta, schedule, today: "2026-08-25" }).excluded).toEqual([{ id: "T-write", reason: "paired-blocked" }]);
    const v2 = verdictsOf(["T-write"], { "D0-5": "DONE", "D1-2": "DONE" });
    expect(selectCandidates({ verdicts: v2, graph, meta, schedule, today: "2026-08-25" }).candidates.map((c) => c.id)).toEqual(["T-write"]);
  });
  it("当日が先頭になる", () => {
    const v = verdictsOf(["D1-6", "D2-1"]);
    const r = selectCandidates({ verdicts: v, graph, meta, schedule, today: "2026-08-26" });
    expect(r.candidates.map((c) => [c.id, c.reason])).toEqual([["D1-6", "当日"], ["D2-1", "以降"]]);
  });
  it("migration lock: D0-4 が IN_PROGRESS なら C6 は lock-conflict", () => {
    const v = verdictsOf(["C6"], { "D0-4": "IN_PROGRESS" });
    const r = selectCandidates({ verdicts: v, graph, meta, schedule, today: "2026-09-14" });
    expect(r.excluded).toContainEqual({ id: "C6", reason: "lock-conflict" });
  });
  it("凍結: 9/20 以降、または O-6 / M5 DONE で候補なし", () => {
    const v = verdictsOf(["D5-1"]);
    expect(selectCandidates({ verdicts: v, graph, meta, schedule, today: "2026-09-19" }).candidates).toHaveLength(1);
    expect(selectCandidates({ verdicts: v, graph, meta, schedule, today: "2026-09-20" }).excluded).toEqual([{ id: "D5-1", reason: "frozen" }]);
    const v2 = verdictsOf(["D5-1"], { "O-6": "DONE" });
    expect(selectCandidates({ verdicts: v2, graph, meta, schedule, today: "2026-09-19" }).candidates).toHaveLength(0);
  });
});

describe("parseSessionState", () => {
  it("state ごとの必須フィールドと ID 一致を検証する", () => {
    expect(parseSessionState('{"id":"D1-2","state":"implementing"}', "D1-2").state).toBe("implementing");
    expect(parseSessionState('{"id":"D1-2","state":"committed","head":"abc"}', "D1-2").head).toBe("abc");
    expect(() => parseSessionState('{"state":"awaiting-approval"}', "D1-2")).toThrow(/id/);
    expect(() => parseSessionState('{"id":"D1-2","state":"awaiting-approval","head":"a"}', "D1-2")).toThrow(/hash/);
    expect(() => parseSessionState('{"id":"D1-2","state":"done"}', "D1-2")).toThrow(/未知/);
    expect(() => parseSessionState('{"id":"D1-1","state":"implementing"}', "D1-2")).toThrow(/一致しない/);
    expect(() => parseSessionState("nope", "D1-2")).toThrow();
  });
});

describe("findBottlenecks", () => {
  it("blocker がオーナー系のみのタスクを列挙し、混在は除く", () => {
    const v = new Map<string, Verdict>([
      ["D0-3", { id: "D0-3", status: "BLOCKED", blockedBy: [{ id: "O-2a", status: "BLOCKED" }, { id: "C1", status: "BLOCKED" }] }],
      ["O-2b", { id: "O-2b", status: "BLOCKED", blockedBy: [{ id: "D0-3", status: "MERGED_PENDING" }] }],
      ["M1", { id: "M1", status: "BLOCKED", blockedBy: [{ id: "M0", status: "MILESTONE_PENDING" }] }],
    ]);
    const b = findBottlenecks(v);
    expect(b.map((x) => x.id)).toEqual(["O-2b", "M1"]);
    expect(b[0].ownerAction).toMatch(/CI 緑/);
    expect(b[1].ownerAction).toMatch(/DoD/);
  });
});

// ---------- 一時 repo での集約 ----------
function sh(cwd: string, cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
const g = (cwd: string, ...args: string[]) => sh(cwd, "git", args);
const commitAll = (cwd: string, msg: string) => {
  g(cwd, "add", "-A");
  g(cwd, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", msg);
};
const backlogFile = (id: string, origin: string, status = "open") => `---
id: ${id}
origin: ${origin}
created: 2026-08-25
status: ${status}
related_tasks: [D1-3]
related_specs: []
related_paths: []
stop_condition: none
---
# ${id} の件
`;

let tmp: string, repo: string;
beforeEach(() => {
  tmp = realpathSync(mkdtempSync(path.join(os.tmpdir(), "task-report-")));
  const origin = path.join(tmp, "origin.git");
  repo = path.join(tmp, "repo");
  g(tmp, "init", "-q", "--bare", "-b", "main", origin);
  g(tmp, "clone", "-q", origin, repo);
  g(repo, "checkout", "-q", "-b", "main");
  mkdirSync(path.join(repo, "specs"));
  mkdirSync(path.join(repo, "tasks/status"), { recursive: true });
  mkdirSync(path.join(repo, "tasks/backlog"), { recursive: true });
  writeFileSync(path.join(repo, "specs/09_task-plan.md"), real09);
  writeFileSync(path.join(repo, ".gitignore"), ".claude/worktrees\n");
  for (const id of ["S-1", "O-1", "O-2a", "O-3", "O-4", "O-5", "D0-1", "D0-2"]) {
    writeFileSync(path.join(repo, `tasks/status/${id}.yaml`), 'state: done\nevidence: "x"\n');
  }
  writeFileSync(path.join(repo, "tasks/backlog/B-D0-1-1.md"), backlogFile("B-D0-1-1", "D0-1", "closed"));
  commitAll(repo, "init");
  g(repo, "push", "-q", "origin", "main");
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("buildReport(一時 repo)", () => {
  it("origin/main + worktree 実ファイル + ref のみブランチを集約し、破損は warnings、session 状態を読む", () => {
    // worktree あり(未コミットの起票 + session state)
    const wt = path.join(repo, ".claude/worktrees/D0-4");
    g(repo, "worktree", "add", "-q", wt, "-b", "task/D0-4", "origin/main");
    writeFileSync(path.join(wt, "tasks/backlog/B-D0-4-1.md"), backlogFile("B-D0-4-1", "D0-4"));
    writeFileSync(path.join(wt, "tasks/backlog/B-D0-4-2.md"), "---\nid: B-D0-4-2\n---\nbroken\n");
    writeFileSync(path.join(wt, ".task-session-state"), JSON.stringify({ id: "D0-4", state: "awaiting-approval", head: "h", hash: "abc" }));
    // ref のみ(コミット済み起票、worktree 削除)
    const wt2 = path.join(repo, ".claude/worktrees/D0-5");
    g(repo, "worktree", "add", "-q", wt2, "-b", "task/D0-5", "origin/main");
    writeFileSync(path.join(wt2, "tasks/backlog/B-D0-5-1.md"), backlogFile("B-D0-5-1", "D0-5"));
    writeFileSync(path.join(wt2, "tasks/backlog/B-D0-4-1.md"), backlogFile("B-D0-4-1", "D0-4", "closed")); // 列挙順が後の ref-only が同 id を持っても worktree 版が勝つ
    writeFileSync(path.join(wt2, ".task-session-state"), JSON.stringify({ id: "D0-5", state: "awaiting-approval" })); // 必須欠落
    commitAll(wt2, "起票");
    g(repo, "worktree", "remove", "--force", wt2);

    const r = buildReport(repo, { now: new Date("2026-08-24T03:00:00Z") });
    expect(r.today).toBe("2026-08-24");
    expect(r.backlog.map((b) => [b.id, b.source.kind])).toEqual([
      ["B-D0-1-1", "origin/main"],
      ["B-D0-4-1", "worktree"],
      ["B-D0-5-1", "branch"],
    ]);
    expect(r.backlog.find((b) => b.id === "B-D0-4-1")?.status).toBe("open");
    expect(r.warnings.some((w) => w.includes("B-D0-4-2"))).toBe(true);
    const w = r.worktrees.find((x) => x.id === "D0-4")!;
    expect(w.dirty).toBe(true);
    expect(w.changedPaths).toContain("tasks/backlog/B-D0-4-1.md");
    expect(w.changedPaths).toContain(".task-session-state"); // 未追跡も列挙(この fixture は ignore していない)
    expect(w.session?.state).toBe("awaiting-approval");
    expect(w.session?.hash).toBe("abc");
    expect(r.worktrees.find((x) => x.id === "D0-5")).toBeUndefined();
    expect(r.nodes.find((n) => n.id === "D0-4")?.status).toBe("IN_PROGRESS");
    expect(r.candidates.map((c) => c.id)).toEqual(["C0", "D0-6", "T-srs"]); // C0 は 8/23 予定 = 期限超過
    expect(r.sharedCheckout.branch).toBe("main");
  });

  it("origin/main 上のバックログ破損は fail closed", () => {
    writeFileSync(path.join(repo, "tasks/backlog/B-D0-1-2.md"), "---\nid: B-D0-1-2\n---\n");
    commitAll(repo, "broken");
    g(repo, "push", "-q", "origin", "main");
    expect(() => buildReport(repo)).toThrow(/B-D0-1-2/);
  });

  it("judgeAll と同じ判定を nodes に載せる", () => {
    const r = buildReport(repo, { now: new Date("2026-08-24T03:00:00Z") });
    const v = judgeAll(takeSnapshot(repo));
    for (const n of r.nodes) expect(n.status).toBe(v.get(n.id)!.status);
  });
});

// 統合テスト: 一時 git repo(bare origin + clone)で task:check / task:start の実 I/O を検証する
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { judgeAll, takeSnapshot, formatReport } from "./check";
import { startTask, StartError } from "./start";

const real09 = readFileSync(new URL("../../specs/09_task-plan.md", import.meta.url), "utf8");

function sh(cwd: string, cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
const g = (cwd: string, ...args: string[]) => sh(cwd, "git", args);

let tmp: string;
let origin: string;
let repo: string; // main worktree

function commitAll(cwd: string, msg: string): void {
  g(cwd, "add", "-A");
  g(cwd, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", msg);
}

function writeLedger(cwd: string, id: string, state: string, evidence?: string): void {
  mkdirSync(path.join(cwd, "tasks/status"), { recursive: true });
  writeFileSync(path.join(cwd, `tasks/status/${id}.yaml`), `state: ${state}\n${evidence ? `evidence: "${evidence}"\n` : ""}`);
}

/** origin/main を更新(clone 側で commit → push) */
function pushMain(cwd: string, msg: string): void {
  commitAll(cwd, msg);
  g(cwd, "push", "-q", "origin", "main");
}

beforeEach(() => {
  tmp = realpathSync(mkdtempSync(path.join(os.tmpdir(), "task-check-")));
  origin = path.join(tmp, "origin.git");
  repo = path.join(tmp, "repo");
  g(tmp, "init", "-q", "--bare", "-b", "main", origin);
  g(tmp, "clone", "-q", origin, repo);
  g(repo, "checkout", "-q", "-b", "main");
  mkdirSync(path.join(repo, "specs"));
  writeFileSync(path.join(repo, "specs/09_task-plan.md"), real09);
  writeFileSync(path.join(repo, "package.json"), '{"name":"t","private":true}\n');
  writeFileSync(path.join(repo, "package-lock.json"), '{"name":"t","lockfileVersion":3,"requires":true,"packages":{"":{"name":"t"}}}\n');
  writeFileSync(path.join(repo, ".env.local"), "X=1\n");
  mkdirSync(path.join(repo, ".vercel"));
  writeFileSync(path.join(repo, ".vercel/project.json"), "{}\n");
  writeFileSync(path.join(repo, ".gitignore"), ".env*\n.vercel\n.claude/worktrees\nnode_modules\n");
  for (const id of ["S-1", "O-1", "O-2a", "O-3", "O-4", "O-5", "D0-1", "D0-2"]) writeLedger(repo, id, "done", "bootstrap");
  pushMain(repo, "init");
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("task:check", () => {
  it("初期状態: D0-4 / D0-5 / D0-6 / T-srs / C0 が READY、DONE は 8 件", () => {
    const v = judgeAll(takeSnapshot(repo));
    const ready = [...v.values()].filter((x) => x.status === "READY").map((x) => x.id).sort();
    expect(ready).toEqual(["C0", "D0-4", "D0-5", "D0-6", "T-srs"]);
    expect([...v.values()].filter((x) => x.status === "DONE")).toHaveLength(8);
    expect(v.get("D0-3")!.status).toBe("BLOCKED");
    expect(v.get("D0-3")!.blockedBy).toEqual([{ id: "C1", status: "BLOCKED" }]);
  });

  it("他 worktree の task/* は IN_PROGRESS、依存先は BLOCKED、自分の worktree は self", () => {
    g(repo, "worktree", "add", "-q", path.join(repo, ".claude/worktrees/T-srs"), "-b", "task/T-srs", "origin/main");
    g(repo, "worktree", "add", "-q", path.join(repo, ".claude/worktrees/D0-4"), "-b", "task/D0-4", "origin/main");
    const v = judgeAll(takeSnapshot(repo));
    expect(v.get("T-srs")!.status).toBe("IN_PROGRESS");
    expect(v.get("T-srs")!.self).toBe(false);
    expect(v.get("D1-1")!.blockedBy).toEqual([{ id: "T-srs", status: "IN_PROGRESS" }]);
    expect(v.get("T-holdout")!.blockedBy).toEqual([{ id: "D0-4", status: "IN_PROGRESS" }]);
    // T-srs の worktree から見ると self
    const v2 = judgeAll(takeSnapshot(path.join(repo, ".claude/worktrees/T-srs")));
    expect(v2.get("T-srs")!.self).toBe(true);
  });

  it("worktree が無く ref だけ残っていても IN_PROGRESS", () => {
    g(repo, "branch", "task/C0", "origin/main");
    const v = judgeAll(takeSnapshot(repo));
    expect(v.get("C0")).toMatchObject({ status: "IN_PROGRESS", worktree: null });
  });

  it("merged は MERGED_PENDING で依存先を解放しない", () => {
    writeLedger(repo, "C0", "merged");
    pushMain(repo, "C0 merged");
    const v = judgeAll(takeSnapshot(repo));
    expect(v.get("C0")!.status).toBe("MERGED_PENDING");
    expect(v.get("C1")!.blockedBy).toEqual([{ id: "C0", status: "MERGED_PENDING" }]);
  });

  it("M-* は depends 全 DONE で MILESTONE_PENDING、記録後に DONE", () => {
    // M6 ← M5 のみ。M5 を done にすると M6 が MILESTONE_PENDING
    writeLedger(repo, "M5", "done", "owner");
    pushMain(repo, "M5");
    let v = judgeAll(takeSnapshot(repo));
    expect(v.get("M6")!.status).toBe("MILESTONE_PENDING");
    writeLedger(repo, "M6", "done", "owner");
    pushMain(repo, "M6");
    v = judgeAll(takeSnapshot(repo));
    expect(v.get("M6")!.status).toBe("DONE");
  });

  it("ローカルの未 push 台帳は無視する(origin/main だけを見る)", () => {
    writeLedger(repo, "C0", "done", "local only");
    commitAll(repo, "not pushed");
    expect(judgeAll(takeSnapshot(repo)).get("C0")!.status).toBe("READY");
  });

  it("claude/* ブランチは警告として報告される", () => {
    g(repo, "branch", "claude/foo", "origin/main");
    const s = takeSnapshot(repo);
    expect(s.foreignBranches).toEqual(["claude/foo"]);
    expect(formatReport(s, judgeAll(s))).toContain("規約外ブランチ");
  });

  it("fail closed: 未知 ID の台帳 / 壊れた YAML / evidence 無し done / 09 不整合 / 複合ブランチ", () => {
    writeLedger(repo, "ZZ-9", "done", "x");
    pushMain(repo, "bad id");
    expect(() => takeSnapshot(repo)).toThrow(/未知の ID/);
    rmSync(path.join(repo, "tasks/status/ZZ-9.yaml"));

    writeFileSync(path.join(repo, "tasks/status/C0.yaml"), "state: done\n");
    pushMain(repo, "no evidence");
    expect(() => takeSnapshot(repo)).toThrow(/evidence/);

    writeFileSync(path.join(repo, "tasks/status/C0.yaml"), "state: [done]\nfoo\n");
    pushMain(repo, "broken");
    expect(() => takeSnapshot(repo)).toThrow();
    rmSync(path.join(repo, "tasks/status/C0.yaml"));

    writeFileSync(path.join(repo, "specs/09_task-plan.md"), real09.replace("D0-3 ← D0-2, C1, O-2a", "D0-3 ← D0-2, O-2a"));
    pushMain(repo, "09 mismatch");
    expect(() => takeSnapshot(repo)).toThrow(/不一致/);
    writeFileSync(path.join(repo, "specs/09_task-plan.md"), real09);
    pushMain(repo, "09 restore");

    g(repo, "branch", "task/T-srs+D1-1", "origin/main");
    expect(() => takeSnapshot(repo)).toThrow(/複合 ID/);
  });

  it("fail closed: origin 不在", () => {
    g(repo, "remote", "remove", "origin");
    expect(() => takeSnapshot(repo)).toThrow();
  });
});

describe("task:start", () => {
  const opts = { install: false };

  it("READY なら worktree + task/<ID> を作り、環境ファイルを mode 600 で配布する", () => {
    const wt = startTask(repo, "T-srs", opts);
    expect(wt).toBe(path.join(repo, ".claude/worktrees/T-srs"));
    expect(g(repo, "rev-parse", "--abbrev-ref", "task/T-srs")).toBe("task/T-srs");
    for (const f of [".env.local", ".vercel/project.json"]) {
      const st = statSync(path.join(wt, f));
      expect(st.mode & 0o777).toBe(0o600);
    }
    // upstream を origin/main に向けない
    expect(() => g(repo, "config", "--get", "branch.task/T-srs.merge")).toThrow();
  });

  it("同じ ID の二重着手は失敗(ref 既存)", () => {
    startTask(repo, "T-srs", opts);
    expect(() => startTask(repo, "T-srs", opts)).toThrow(/IN_PROGRESS/);
  });

  it("READY でない(BLOCKED / DONE / merged)は失敗", () => {
    expect(() => startTask(repo, "D1-1", opts)).toThrow(/BLOCKED/);
    expect(() => startTask(repo, "D0-2", opts)).toThrow(/DONE/);
    writeLedger(repo, "C0", "merged");
    pushMain(repo, "m");
    expect(() => startTask(repo, "C0", opts)).toThrow(/MERGED_PENDING/);
  });

  it("複合 ID / 未知 ID は失敗", () => {
    expect(() => startTask(repo, "T-srs+D1-1", opts)).toThrow(StartError);
    expect(() => startTask(repo, "ZZ-1", opts)).toThrow(/09 に無い/);
  });

  it("ローカル main が origin/main とずれていると失敗", () => {
    writeFileSync(path.join(repo, "x.txt"), "x");
    commitAll(repo, "ahead");
    expect(() => startTask(repo, "T-srs", opts)).toThrow(/一致しない/);
  });

  it("配布元欠落なら worktree と ref をロールバック", () => {
    rmSync(path.join(repo, ".env.local"));
    expect(() => startTask(repo, "T-srs", opts)).toThrow(/ロールバック済み/);
    expect(existsSync(path.join(repo, ".claude/worktrees/T-srs"))).toBe(false);
    expect(g(repo, "branch", "--list", "task/T-srs")).toBe("");
    // ロールバック後は再着手できる
    writeFileSync(path.join(repo, ".env.local"), "X=1\n");
    expect(() => startTask(repo, "T-srs", opts)).not.toThrow();
  });

  it("npm ci 失敗でもロールバックされる", () => {
    rmSync(path.join(repo, "package-lock.json"));
    pushMain(repo, "drop lock");
    expect(() => startTask(repo, "C0", { install: true })).toThrow(/ロールバック済み/);
    expect(g(repo, "branch", "--list", "task/C0")).toBe("");
  }, 60_000);

  it("npm ci 成功時は worktree が残る", () => {
    const wt = startTask(repo, "C0", { install: true });
    expect(existsSync(wt)).toBe(true);
    expect(g(repo, "branch", "--list", "task/C0")).toContain("task/C0");
  }, 60_000);
});

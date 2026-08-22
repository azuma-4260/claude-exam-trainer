// git への I/O 層。すべて同期 spawn。失敗は例外(fail closed)。
import { execFileSync } from "node:child_process";
import { LEDGER_DIR } from "./ledger";

export class GitError extends Error {}

export function git(cwd: string, args: string[], opts: { allowFail?: boolean } = {}): string {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
  } catch (e) {
    if (opts.allowFail) return "";
    const err = e as { stderr?: string; message: string };
    throw new GitError(`git ${args.join(" ")} 失敗: ${(err.stderr ?? err.message).trim()}`);
  }
}

export interface Worktree {
  path: string;
  branch: string | null; // refs/heads/ を除いた名前。detached は null
}

/** `git worktree list --porcelain` の parse。先頭が main worktree */
export function listWorktrees(cwd: string): Worktree[] {
  const out = git(cwd, ["worktree", "list", "--porcelain"]);
  const result: Worktree[] = [];
  let cur: Worktree | null = null;
  for (const line of out.split("\n")) {
    if (line.startsWith("worktree ")) {
      cur = { path: line.slice("worktree ".length), branch: null };
      result.push(cur);
    } else if (line.startsWith("branch ") && cur) {
      cur.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    }
  }
  return result;
}

export function listBranches(cwd: string, patterns: string[]): string[] {
  const out = git(cwd, ["for-each-ref", "--format=%(refname:short)", ...patterns.map((p) => `refs/heads/${p}`)]);
  return out ? out.split("\n").filter(Boolean) : [];
}

export function mainWorktreeRoot(cwd: string): string {
  const wts = listWorktrees(cwd);
  if (wts.length === 0) throw new GitError("worktree 一覧が空");
  return wts[0].path;
}

export function currentToplevel(cwd: string): string {
  return git(cwd, ["rev-parse", "--show-toplevel"]);
}

export function fetchOrigin(cwd: string): void {
  git(cwd, ["fetch", "--quiet", "origin"]);
}

export function revParse(cwd: string, ref: string): string | null {
  const out = git(cwd, ["rev-parse", "--verify", "--quiet", ref], { allowFail: true });
  return out || null;
}

/** origin/main 上の台帳ファイル一覧(tasks/status/ 直下、相対名) */
export function ledgerFilesOnOriginMain(cwd: string): string[] {
  if (!revParse(cwd, "origin/main")) throw new GitError("origin/main が存在しない(git fetch origin を確認)");
  const out = git(cwd, ["ls-tree", "--name-only", "origin/main", `${LEDGER_DIR}/`], { allowFail: true });
  if (!out) return [];
  return out.split("\n").filter(Boolean).map((p) => p.slice(LEDGER_DIR.length + 1));
}

export function readOnOriginMain(cwd: string, path: string): string {
  return git(cwd, ["show", `origin/main:${path}`]);
}

// 着手コマンド: fetch → main 同期確認 → READY 判定 → task/<ID> worktree 作成(= 着手権)→ 環境準備。
// 準備に失敗したら worktree と ref をロールバックする。
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { judgeAll, takeSnapshot, formatVerdict, TASK_PREFIX } from "./check";
import { git, mainWorktreeRoot, revParse } from "./git";

export const ENV_FILES = [".env.local", ".vercel/project.json"];

export interface StartOptions {
  /** npm ci を実行するか(テストで無効化可) */
  install?: boolean;
  /** 環境ファイルのコピーを要求するか(既定 true。無ければ失敗) */
  requireEnv?: boolean;
}

export class StartError extends Error {}

function copySecret(srcRoot: string, dstRoot: string, rel: string): void {
  const src = path.join(srcRoot, rel);
  const dst = path.join(dstRoot, rel);
  if (!existsSync(src) || !statSync(src).isFile()) throw new StartError(`配布元が無い: ${src}`);
  mkdirSync(path.dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  chmodSync(dst, 0o600);
  const a = statSync(src);
  const b = statSync(dst);
  if (!b.isFile() || a.size !== b.size || (b.mode & 0o777) !== 0o600) {
    throw new StartError(`配布検証に失敗: ${rel}`);
  }
}

export function rollback(cwd: string, wtPath: string, branch: string): string[] {
  const failed: string[] = [];
  try {
    git(cwd, ["worktree", "remove", "--force", wtPath]);
  } catch {
    failed.push(`git worktree remove --force ${wtPath}`);
  }
  try {
    git(cwd, ["branch", "-D", branch]);
  } catch {
    failed.push(`git branch -D ${branch}`);
  }
  return failed;
}

/** 成功時は作成した worktree のパスを返す */
export function startTask(cwd: string, id: string, opts: StartOptions = {}): string {
  if (!/^[A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)?$/.test(id)) throw new StartError(`ID の形式が不正: ${id}(複合 ID は禁止)`);
  const snap = takeSnapshot(cwd); // fetch 込み
  if (!snap.graph.has(id)) throw new StartError(`09 に無い ID: ${id}`);

  const mainRoot = mainWorktreeRoot(cwd);
  const localMain = revParse(cwd, "refs/heads/main");
  const originMain = revParse(cwd, "refs/remotes/origin/main");
  if (!localMain || !originMain) throw new StartError("main / origin/main を解決できない");
  if (localMain !== originMain) {
    throw new StartError(`ローカル main (${localMain.slice(0, 7)}) が origin/main (${originMain.slice(0, 7)}) と一致しない。main worktree で git pull --ff-only してから再実行`);
  }

  const v = judgeAll(snap).get(id)!;
  if (v.status !== "READY") throw new StartError(`着手不可:\n${formatVerdict(v)}`);

  const branch = TASK_PREFIX + id;
  const wtPath = path.join(mainRoot, ".claude", "worktrees", id);
  // -b は既存 ref があれば git 側で失敗する = アトミックなロック取得
  git(cwd, ["worktree", "add", "--no-track", wtPath, "-b", branch, "origin/main"]);

  try {
    if (opts.requireEnv !== false) for (const f of ENV_FILES) copySecret(mainRoot, wtPath, f);
    if (opts.install !== false) {
      execFileSync("npm", ["ci", "--no-audit", "--no-fund", "--silent"], { cwd: wtPath, stdio: ["ignore", "pipe", "pipe"] });
    }
  } catch (e) {
    const failed = rollback(cwd, wtPath, branch);
    const msg = (e as { stderr?: Buffer; message: string }).stderr?.toString().trim() || (e as Error).message;
    if (failed.length > 0) {
      throw new StartError(`準備失敗: ${msg}\nロールバックも失敗。ロック ${branch} が残っています。手動で実行:\n  ${failed.join("\n  ")}`);
    }
    throw new StartError(`準備失敗(worktree と ${branch} はロールバック済み): ${msg}`);
  }
  return wtPath;
}

if (process.argv[1] && /start\.ts$/.test(process.argv[1])) {
  const id = process.argv[2];
  if (!id) {
    console.error("使い方: npm run task:start <ID>");
    process.exit(1);
  }
  try {
    const wt = startTask(process.cwd(), id);
    console.log(`着手: ${id}\n  worktree: ${wt}\n  branch:   ${TASK_PREFIX}${id}\n次: cd "${wt}" でこの worktree を開く(別 Claude Code セッションで開く場合はそのパスを指定)`);
  } catch (e) {
    console.error(`task:start 失敗: ${(e as Error).message}`);
    process.exit(1);
  }
}

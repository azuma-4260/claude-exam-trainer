// タスク状態の判定。判定順: DONE → MERGED_PENDING → IN_PROGRESS → BLOCKED → MILESTONE_PENDING → READY
import { loadGraph, isMilestone, type Graph } from "./graph";
import { buildLedger, LEDGER_DIR, type Ledger } from "./ledger";
import {
  fetchOrigin,
  ledgerFilesOnOriginMain,
  listBranches,
  listWorktrees,
  readOnOriginMain,
  currentToplevel,
  type Worktree,
} from "./git";

export type Status = "DONE" | "MERGED_PENDING" | "IN_PROGRESS" | "BLOCKED" | "MILESTONE_PENDING" | "READY";

export interface Verdict {
  id: string;
  status: Status;
  /** IN_PROGRESS: worktree パス(ref のみで worktree 無しなら null)。self は自分の worktree */
  worktree?: string | null;
  self?: boolean;
  /** BLOCKED: 未 DONE の depends とその状態 */
  blockedBy?: { id: string; status: Status }[];
}

export interface Snapshot {
  graph: Graph;
  ledger: Ledger;
  taskBranches: string[]; // task/* の short name
  worktrees: Worktree[];
  foreignBranches: string[]; // 規約外(claude/*)
  selfToplevel: string;
}

export const TASK_PREFIX = "task/";

/** 純関数: スナップショットから全ノードの判定を返す */
export function judgeAll(s: Snapshot): Map<string, Verdict> {
  const memo = new Map<string, Verdict>();
  const wtByBranch = new Map<string, Worktree>();
  for (const w of s.worktrees) if (w.branch) wtByBranch.set(w.branch, w);

  const judge = (id: string): Verdict => {
    const cached = memo.get(id);
    if (cached) return cached;
    let v: Verdict;
    const entry = s.ledger.get(id);
    const branch = TASK_PREFIX + id;
    if (entry?.state === "done") v = { id, status: "DONE" };
    else if (entry?.state === "merged") v = { id, status: "MERGED_PENDING" };
    else if (s.taskBranches.includes(branch)) {
      const wt = wtByBranch.get(branch);
      v = { id, status: "IN_PROGRESS", worktree: wt?.path ?? null, self: wt?.path === s.selfToplevel };
    } else {
      const blockedBy = (s.graph.get(id) ?? [])
        .map((d) => judge(d))
        .filter((d) => d.status !== "DONE")
        .map((d) => ({ id: d.id, status: d.status }));
      if (blockedBy.length > 0) v = { id, status: "BLOCKED", blockedBy };
      else if (isMilestone(id)) v = { id, status: "MILESTONE_PENDING" };
      else v = { id, status: "READY" };
    }
    memo.set(id, v);
    return v;
  };
  for (const id of s.graph.keys()) judge(id);
  return memo;
}

/** git から Snapshot を構築(fetch 込み)。例外は fail closed として呼び出し側で非 0 終了 */
export function takeSnapshot(cwd: string, opts: { fetch?: boolean } = {}): Snapshot {
  if (opts.fetch !== false) fetchOrigin(cwd);
  const md = readOnOriginMain(cwd, "specs/09_task-plan.md");
  const graph = loadGraph(md);
  const files = ledgerFilesOnOriginMain(cwd);
  const ledger = buildLedger(files, (f) => readOnOriginMain(cwd, `${LEDGER_DIR}/${f}`), new Set(graph.keys()));
  const taskBranches = listBranches(cwd, ["task/"]);
  for (const b of taskBranches) {
    const id = b.slice(TASK_PREFIX.length);
    if (!graph.has(id)) throw new Error(`規約違反のブランチ ${b}: 09 に無い ID(複合 ID は禁止)`);
  }
  return {
    graph,
    ledger,
    taskBranches,
    worktrees: listWorktrees(cwd),
    foreignBranches: listBranches(cwd, ["claude/"]),
    selfToplevel: currentToplevel(cwd),
  };
}

export function formatVerdict(v: Verdict): string {
  switch (v.status) {
    case "IN_PROGRESS":
      return `${v.id}: IN_PROGRESS @ ${v.worktree ?? "(worktree なし・ref のみ)"}${v.self ? " (この worktree)" : ""}`;
    case "BLOCKED":
      return `${v.id}: BLOCKED\n` + v.blockedBy!.map((b) => `  depends: ${b.id} (${b.status})`).join("\n");
    case "MERGED_PENDING":
      return `${v.id}: MERGED_PENDING(main にマージ済み。CI 緑を確認して state: done を記録するまで着手禁止)`;
    case "MILESTONE_PENDING":
      return `${v.id}: MILESTONE_PENDING(depends は全 DONE。オーナーが DoD を確認し tasks/status/${v.id}.yaml を done で記録)`;
    default:
      return `${v.id}: ${v.status}`;
  }
}

export function formatReport(s: Snapshot, verdicts: Map<string, Verdict>, only?: string): string {
  const lines: string[] = [];
  if (only) {
    const v = verdicts.get(only);
    if (!v) throw new Error(`未知の ID: ${only}`);
    lines.push(formatVerdict(v));
  } else {
    for (const v of verdicts.values()) lines.push(formatVerdict(v).split("\n")[0]);
    const pick = (st: Status) => [...verdicts.values()].filter((v) => v.status === st).map((v) => v.id);
    lines.push("", `READY: ${pick("READY").join(", ") || "(なし)"}`);
    lines.push(`IN_PROGRESS: ${pick("IN_PROGRESS").join(", ") || "(なし)"}`);
    lines.push(`MERGED_PENDING: ${pick("MERGED_PENDING").join(", ") || "(なし)"}`);
    lines.push(`MILESTONE_PENDING: ${pick("MILESTONE_PENDING").join(", ") || "(なし)"}`);
  }
  if (s.foreignBranches.length > 0) {
    lines.push("", `警告: 規約外ブランチ(不明な進行中作業の可能性): ${s.foreignBranches.join(", ")}`);
    lines.push("  → task/<ID> に rename するかマージ・削除してください");
  }
  return lines.join("\n");
}

function main(): void {
  const id = process.argv[2];
  const snap = takeSnapshot(process.cwd());
  const verdicts = judgeAll(snap);
  console.log(formatReport(snap, verdicts, id));
  if (id && verdicts.get(id)?.status !== "READY") process.exitCode = 2;
}

if (process.argv[1] && /check\.ts$/.test(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(`task:check 失敗(fail closed): ${(e as Error).message}`);
    process.exit(1);
  }
}

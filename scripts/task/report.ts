// 読み取り専用レポート `npm run task:report -- --json`(specs/10 §2)。
// check.ts の takeSnapshot / judgeAll を再利用し、自動選択候補・承認ボトルネック・並列 worktree・
// バックログ集約・セッション状態を 1 つの JSON にまとめる。どの worktree・ブランチ・ファイルも変更しない。
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { judgeAll, takeSnapshot, TASK_PREFIX, type Snapshot, type Status, type Verdict } from "./check";
import { isMilestone } from "./graph";
import { git, mainWorktreeRoot } from "./git";
import { lockOf, PAIRED_DEPENDENTS, PAIRS } from "./pair";
import { BACKLOG_DIR, parseBacklogFile, type BacklogItem } from "../backlog/schema";

export const FREEZE_DATE = "2026-09-20";
const PLAN_YEAR = 2026;

export type ExcludeReason = "owner-track" | "milestone" | "paired-dependent" | "paired-blocked" | "lock-conflict" | "frozen";

export interface NodeInfo {
  id: string;
  status: Status;
  track: string;
  spec: string;
  depends: string[];
  blockedBy: { id: string; status: Status }[];
  worktree: string | null;
}
export interface Candidate { id: string; rank: number; scheduled: string | null; reason: string }
export interface Bottleneck { id: string; blockedBy: { id: string; status: Status }[]; ownerAction: string }
export interface SessionState { id?: string; state?: string; reason?: string; head?: string; hash?: string }
export interface WorktreeInfo {
  id: string;
  path: string;
  branch: string;
  dirty: boolean;
  changedPaths: string[];
  commitsAhead: number;
  session: SessionState | null;
}
export interface BacklogSource { kind: "origin/main" | "branch" | "worktree"; ref: string; path?: string }
export type BacklogEntry = Pick<BacklogItem, "id" | "status" | "related_tasks" | "related_specs" | "related_paths" | "stop_condition" | "title"> & {
  origin: string;
  source: BacklogSource;
};
export interface Report {
  generatedAt: string;
  today: string;
  nodes: NodeInfo[];
  candidates: Candidate[];
  excluded: { id: string; reason: ExcludeReason }[];
  bottlenecks: Bottleneck[];
  worktrees: WorktreeInfo[];
  backlog: BacklogEntry[];
  sharedCheckout: { path: string; branch: string | null; dirty: boolean };
  warnings: string[];
}

// ---------- 09 の表の解析(loadGraph は変更しない。ここは表示用の列だけ) ----------

export interface NodeMeta { track: string; spec: string }

function cleanCell(s: string): string {
  return s.replace(/[*~`]/g, "").trim();
}

/** §3 / §4 から ID → {track, spec} を抜く。§3 は track "M"、spec "09 §3" */
export function parseNodeMeta(md: string): Map<string, NodeMeta> {
  const out = new Map<string, NodeMeta>();
  const sec = (n: number) => new RegExp(`^## ${n}\\.[^\\n]*\\n([\\s\\S]*?)(?=^## \\d+\\.|(?![\\s\\S]))`, "m").exec(md)?.[1] ?? "";
  for (const line of sec(3).split("\n")) {
    const c = line.startsWith("|") ? line.split("|").slice(1, -1).map(cleanCell) : [];
    if (c.length >= 4 && isMilestone(c[0])) out.set(c[0], { track: "M", spec: "09 §3" });
  }
  for (const line of sec(4).split("\n")) {
    const c = line.startsWith("|") ? line.split("|").slice(1, -1).map(cleanCell) : [];
    if (c.length >= 6 && /^[A-Z]/.test(c[0]) && c[0] !== "ID") out.set(c[0], { track: c[1], spec: c[4] });
  }
  return out;
}

/** §6 の表から ID → 予定日(YYYY-MM-DD。範囲行は開始日)。ID は known に含まれるものだけ拾う */
export function parseSchedule(md: string, known: ReadonlySet<string>): Map<string, string> {
  const out = new Map<string, string>();
  const s6 = /^## 6\.[^\n]*\n([\s\S]*?)(?=^## \d+\.|(?![\s\S]))/m.exec(md)?.[1] ?? "";
  for (const line of s6.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1);
    const d = /^(\d{1,2})\/(\d{1,2})/.exec(cells[0]?.trim() ?? "");
    if (!d) continue;
    const date = `${PLAN_YEAR}-${d[1].padStart(2, "0")}-${d[2].padStart(2, "0")}`;
    const rest = cells.slice(1).join(" ").replace(/[*~`()]/g, " ");
    for (const m of rest.matchAll(/[A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)?/g)) {
      const id = m[0];
      if (known.has(id) && !out.has(id)) out.set(id, date);
    }
  }
  return out;
}

/** Asia/Tokyo の ISO 8601(+09:00)。実行環境の TZ に依存しない */
export function isoJst(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+09:00`;
}

/** Asia/Tokyo の今日(YYYY-MM-DD)。実行環境の TZ に依存しない */
export function todayJst(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// ---------- 純関数: 候補・ボトルネック ----------

export interface SelectInput {
  verdicts: Map<string, Verdict>;
  graph: Map<string, string[]>;
  meta: Map<string, NodeMeta>;
  schedule: Map<string, string>;
  today: string;
}

export function selectCandidates(inp: SelectInput): { candidates: Candidate[]; excluded: { id: string; reason: ExcludeReason }[] } {
  const { verdicts, graph, meta, schedule, today } = inp;
  const status = (id: string) => verdicts.get(id)?.status;
  const frozen = today >= FREEZE_DATE || status("O-6") === "DONE" || status("M5") === "DONE";
  const inProgress = [...verdicts.values()].filter((v) => v.status === "IN_PROGRESS").map((v) => v.id);
  const heldLocks = new Set(inProgress.map(lockOf).filter((x): x is string => x !== null));
  const excluded: { id: string; reason: ExcludeReason }[] = [];
  const ready: string[] = [];
  for (const v of verdicts.values()) {
    if (v.status !== "READY") continue;
    const track = meta.get(v.id)?.track ?? "";
    let reason: ExcludeReason | null = null;
    if (frozen) reason = "frozen";
    else if (isMilestone(v.id)) reason = "milestone";
    else if (track === "O" || v.id.startsWith("O-")) reason = "owner-track";
    else if (PAIRED_DEPENDENTS.has(v.id)) reason = "paired-dependent";
    else if (PAIRS.has(v.id) && (graph.get(PAIRS.get(v.id)!) ?? []).some((d) => d !== v.id && status(d) !== "DONE")) reason = "paired-blocked";
    else if (lockOf(v.id) && heldLocks.has(lockOf(v.id)!)) reason = "lock-conflict";
    if (reason) excluded.push({ id: v.id, reason });
    else ready.push(v.id);
  }
  // クリティカルパス: 直近の未 DONE マイルストーンの depends
  const nextMilestone = [...graph.keys()].filter(isMilestone).sort().find((m) => status(m) !== "DONE");
  const critical = new Set(nextMilestone ? graph.get(nextMilestone) ?? [] : []);
  const bucket = (id: string) => {
    const d = schedule.get(id);
    if (!d) return 3;
    return d < today ? 0 : d === today ? 1 : 2;
  };
  ready.sort((a, b) => {
    const ba = bucket(a), bb = bucket(b);
    if (ba !== bb) return ba - bb;
    const da = schedule.get(a) ?? "9999", db = schedule.get(b) ?? "9999";
    if (da !== db) return da < db ? -1 : 1;
    const ca = critical.has(a) ? 0 : 1, cb = critical.has(b) ? 0 : 1;
    if (ca !== cb) return ca - cb;
    return a < b ? -1 : 1;
  });
  const label = ["期限超過", "当日", "以降", "§6 未掲載"];
  const candidates = ready.map((id, i) => ({
    id,
    rank: i + 1,
    scheduled: schedule.get(id) ?? null,
    reason: label[bucket(id)] + (critical.has(id) ? "・クリティカルパス" : ""),
  }));
  return { candidates, excluded };
}

export function findBottlenecks(verdicts: Map<string, Verdict>): Bottleneck[] {
  const out: Bottleneck[] = [];
  for (const v of verdicts.values()) {
    if (v.status !== "BLOCKED" || !v.blockedBy?.length) continue;
    const ownerOnly = v.blockedBy.every((b) => b.id.startsWith("O-") || b.status === "MILESTONE_PENDING" || b.status === "MERGED_PENDING");
    if (!ownerOnly) continue;
    const actions = v.blockedBy.map((b) => {
      if (b.status === "MERGED_PENDING") return `${b.id}: CI 緑を確認して tasks/status/${b.id}.yaml を done で記録`;
      if (b.status === "MILESTONE_PENDING") return `${b.id}: DoD を確認して tasks/status/${b.id}.yaml を done で記録`;
      return `${b.id}: オーナー手作業を完了して tasks/status/${b.id}.yaml を done で記録`;
    });
    out.push({ id: v.id, blockedBy: v.blockedBy, ownerAction: actions.join(" / ") });
  }
  return out;
}

// ---------- I/O 層(読み取りのみ) ----------

const SESSION_REQUIRED: Record<string, (keyof SessionState)[]> = {
  implementing: ["id"],
  "awaiting-approval": ["id", "head", "hash"],
  committed: ["id", "head"],
  stopped: ["id", "reason"],
};

/** specs/10 §4 の形状検証。列挙外・必須欠落・ID 不一致は null + warning */
export function parseSessionState(text: string, expectId: string): SessionState {
  const j = JSON.parse(text) as Record<string, unknown>;
  if (typeof j !== "object" || j === null || typeof j.state !== "string") throw new Error("state が無い");
  const req = SESSION_REQUIRED[j.state];
  if (!req) throw new Error(`未知の state ${j.state}`);
  for (const k of req) if (typeof j[k] !== "string" || j[k] === "") throw new Error(`${j.state} に ${k} が無い`);
  if (j.id !== expectId) throw new Error(`id ${String(j.id)} が worktree の ${expectId} と一致しない`);
  return j as SessionState;
}

function readSessionState(wtPath: string, expectId: string, warnings: string[]): SessionState | null {
  const f = path.join(wtPath, ".task-session-state");
  if (!existsSync(f)) return null;
  try {
    return parseSessionState(readFileSync(f, "utf8"), expectId);
  } catch (e) {
    warnings.push(`${f}: 解釈できない(${(e as Error).message})`);
    return null;
  }
}

function worktreeInfos(snap: Snapshot, warnings: string[]): WorktreeInfo[] {
  const out: WorktreeInfo[] = [];
  for (const w of snap.worktrees) {
    if (!w.branch?.startsWith(TASK_PREFIX)) continue;
    // 変更パス = 追跡ファイルの差分(rename は新パス)+ 未追跡。仕様 §2「並列 worktree」
    const tracked = git(w.path, ["diff", "--name-only", "HEAD"]);
    const untracked = git(w.path, ["ls-files", "--others", "--exclude-standard"]);
    const changedPaths = [...new Set([...tracked.split("\n"), ...untracked.split("\n")].filter(Boolean))].sort();
    const ahead = Number(git(w.path, ["rev-list", "--count", "origin/main..HEAD"]));
    out.push({
      id: w.branch.slice(TASK_PREFIX.length),
      path: w.path,
      branch: w.branch,
      dirty: changedPaths.length > 0,
      changedPaths,
      commitsAhead: ahead,
      session: readSessionState(w.path, w.branch.slice(TASK_PREFIX.length), warnings),
    });
  }
  return out;
}

function toEntry(item: BacklogItem, source: BacklogSource): BacklogEntry {
  const { id, origin, status, related_tasks, related_specs, related_paths, stop_condition, title } = item;
  return { id, origin, status, related_tasks, related_specs, related_paths, stop_condition, title, source };
}

/** origin/main → 各 task/* ブランチ(worktree 優先)の順で集約。同 id は後勝ち(worktree > branch > origin/main) */
function collectBacklog(cwd: string, snap: Snapshot, known: ReadonlySet<string>, warnings: string[]): BacklogEntry[] {
  const byId = new Map<string, BacklogEntry>();
  // 同 id は worktree > branch > origin/main の順で採用(列挙順に依存しない)
  const rank: Record<BacklogSource["kind"], number> = { "origin/main": 0, branch: 1, worktree: 2 };
  const put = (e: BacklogEntry) => {
    const cur = byId.get(e.id);
    if (!cur || rank[e.source.kind] >= rank[cur.source.kind]) byId.set(e.id, e);
  };
  const listOnRef = (ref: string): string[] => {
    const out = git(cwd, ["ls-tree", "--name-only", ref, `${BACKLOG_DIR}/`]); // ディレクトリ不在は exit 0 で空。ref 不在は伝播
    return out ? out.split("\n").filter((p) => p.endsWith(".md") && !p.endsWith("README.md")).map((p) => path.basename(p)) : [];
  };
  // 1. origin/main(破損は fail closed)
  for (const f of listOnRef("origin/main")) {
    const item = parseBacklogFile(f, git(cwd, ["show", `origin/main:${BACKLOG_DIR}/${f}`]), known);
    put(toEntry(item, { kind: "origin/main", ref: "origin/main" }));
  }
  // 2. task/* ブランチの未マージ分(origin/main との差分 + worktree の未追跡)。worktree があれば実ファイル
  const wtByBranch = new Map(snap.worktrees.filter((w) => w.branch).map((w) => [w.branch!, w.path]));
  const changedFiles = (cwd2: string, ref: string): string[] => {
    const out = git(cwd2, ["diff", "--name-only", "--diff-filter=AM", "origin/main", ref, "--", `${BACKLOG_DIR}/`]); // git 失敗は伝播
    return out ? out.split("\n").map((p) => path.basename(p)).filter((f) => f.endsWith(".md") && f !== "README.md") : [];
  };
  for (const branch of snap.taskBranches) {
    const wt = wtByBranch.get(branch);
    if (wt) {
      const untracked = git(wt, ["ls-files", "--others", "--exclude-standard", "--", `${BACKLOG_DIR}/`]);
      const files = new Set([
        ...changedFiles(wt, "HEAD"),
        ...git(wt, ["diff", "--name-only", "HEAD", "--", `${BACKLOG_DIR}/`]).split("\n").filter(Boolean).map((p) => path.basename(p)),
        ...(untracked ? untracked.split("\n").filter(Boolean).map((p) => path.basename(p)) : []),
      ]);
      for (const f of [...files].sort()) {
        if (!f.endsWith(".md") || f === "README.md") continue;
        const full = path.join(wt, BACKLOG_DIR, f);
        if (!existsSync(full)) continue;
        const text = readFileSync(full, "utf8");
        try {
          const item = parseBacklogFile(f, text, known);
          put(toEntry(item, { kind: "worktree", ref: branch, path: wt }));
        } catch (e) {
          warnings.push(`${branch} (worktree) の ${BACKLOG_DIR}/${f}: ${(e as Error).message}`);
        }
      }
    } else {
      for (const f of changedFiles(cwd, branch)) {
        const text = git(cwd, ["show", `${branch}:${BACKLOG_DIR}/${f}`]); // git 失敗は伝播(fail closed)
        try {
          const item = parseBacklogFile(f, text, known);
          put(toEntry(item, { kind: "branch", ref: branch }));
        } catch (e) {
          warnings.push(`${branch} の ${BACKLOG_DIR}/${f}: ${(e as Error).message}`);
        }
      }
    }
  }
  return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
}

export function buildReport(cwd: string, opts: { fetch?: boolean; now?: Date } = {}): Report {
  const warnings: string[] = [];
  const snap = takeSnapshot(cwd, { fetch: opts.fetch });
  const verdicts = judgeAll(snap);
  const md = git(cwd, ["show", "origin/main:specs/09_task-plan.md"]);
  const meta = parseNodeMeta(md);
  const known = new Set(snap.graph.keys());
  const schedule = parseSchedule(md, known);
  const today = todayJst(opts.now);
  const nodes: NodeInfo[] = [...verdicts.values()].map((v) => ({
    id: v.id,
    status: v.status,
    track: meta.get(v.id)?.track ?? "?",
    spec: meta.get(v.id)?.spec ?? "",
    depends: snap.graph.get(v.id) ?? [],
    blockedBy: v.blockedBy ?? [],
    worktree: v.worktree ?? null,
  }));
  const { candidates, excluded } = selectCandidates({ verdicts, graph: snap.graph, meta, schedule, today });
  const shared = mainWorktreeRoot(cwd);
  const sharedBranch = snap.worktrees[0]?.branch ?? null;
  const sharedDirty = git(shared, ["status", "--porcelain", "--untracked-files=all"]) !== "";
  if (sharedBranch !== "main") warnings.push(`共有 checkout が main ではない: ${sharedBranch ?? "(detached)"}`);
  if (sharedDirty) warnings.push("共有 checkout に未コミット変更がある(他セッションの作業の可能性。触らない)");
  for (const b of snap.foreignBranches) warnings.push(`規約外ブランチ: ${b}`);
  return {
    generatedAt: isoJst(opts.now ?? new Date()),
    today,
    nodes,
    candidates,
    excluded,
    bottlenecks: findBottlenecks(verdicts),
    worktrees: worktreeInfos(snap, warnings),
    backlog: collectBacklog(cwd, snap, known, warnings),
    sharedCheckout: { path: shared, branch: sharedBranch, dirty: sharedDirty },
    warnings,
  };
}

export function formatReportText(r: Report): string {
  const L: string[] = [];
  L.push(`today(JST): ${r.today}`);
  L.push(`候補: ${r.candidates.map((c) => `${c.rank}. ${c.id}(${c.reason}${c.scheduled ? " " + c.scheduled : ""})`).join(" / ") || "(なし)"}`);
  if (r.excluded.length) L.push(`除外: ${r.excluded.map((e) => `${e.id}[${e.reason}]`).join(", ")}`);
  L.push(`オーナー待ち: ${r.bottlenecks.map((b) => `${b.id} ← ${b.ownerAction}`).join(" / ") || "(なし)"}`);
  L.push(`worktree: ${r.worktrees.map((w) => `${w.id}@${w.session?.state ?? "状態不明"}${w.dirty ? "(dirty)" : ""}`).join(", ") || "(なし)"}`);
  L.push(`backlog: ${r.backlog.map((b) => `${b.id}[${b.status}|${b.source.kind}]`).join(", ") || "(なし)"}`);
  L.push(`共有 checkout: ${r.sharedCheckout.branch ?? "detached"}${r.sharedCheckout.dirty ? "(dirty)" : ""}`);
  for (const w of r.warnings) L.push(`警告: ${w}`);
  return L.join("\n");
}

if (process.argv[1] && /report\.ts$/.test(process.argv[1])) {
  try {
    const r = buildReport(process.cwd());
    console.log(process.argv.includes("--json") ? JSON.stringify(r, null, 2) : formatReportText(r));
  } catch (e) {
    console.error(`task:report 失敗(fail closed): ${(e as Error).message}`);
    process.exit(1);
  }
}

// specs/09_task-plan.md から依存グラフを構築し、§3+§4(正本)と §5(導出)の 1:1 を検証する。
// 純関数のみ。I/O は呼び出し側が担う。

export type Graph = Map<string, string[]>; // ID → depends

export const ID_RE = /^[A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)?$/;
export const isMilestone = (id: string): boolean => /^M\d+$/.test(id);

export class GraphError extends Error {}

/** `##` 見出しで本文を節に分け、節番号(1, 2, ...)→ 本文 を返す */
function sections(md: string): Map<number, string> {
  const out = new Map<number, string>();
  const re = /^## (\d+)\.[^\n]*\n([\s\S]*?)(?=^## \d+\.|(?![\s\S]))/gm;
  for (const m of md.matchAll(re)) out.set(Number(m[1]), m[2]);
  return out;
}

function cleanCell(s: string): string {
  return s.replace(/[*~`]/g, "").trim();
}

function parseDepends(cell: string): string[] {
  const c = cleanCell(cell);
  if (c === "" || c === "–" || c === "-" || c === "(なし)") return [];
  return c.split(",").map((x) => x.trim()).filter(Boolean);
}

/** 表の行から (ID, depends) を抜く。ID 列は 0、depends 列は 3(§3 / §4 とも) */
function parseTableRows(body: string, label: string): Graph {
  const g: Graph = new Map();
  for (const line of body.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1);
    if (cells.length < 4) continue;
    const id = cleanCell(cells[0]);
    if (id === "ID" || !ID_RE.test(id)) continue;
    if (g.has(id)) throw new GraphError(`${label}: ID 重複 ${id}`);
    g.set(id, parseDepends(cells[3]));
  }
  return g;
}

/** §3 マイルストーン表 + §4 Phase 表 = 正本グラフ */
export function parseCanonical(md: string): Graph {
  const sec = sections(md);
  const s3 = sec.get(3);
  const s4 = sec.get(4);
  if (!s3 || !s4) throw new GraphError("09 に §3 / §4 が見つからない");
  const m = parseTableRows(s3, "§3");
  const t = parseTableRows(s4, "§4");
  for (const id of m.keys()) {
    if (!isMilestone(id)) throw new GraphError(`§3 に M-* 以外の ID: ${id}`);
  }
  const g: Graph = new Map();
  for (const [k, v] of [...t, ...m]) {
    if (g.has(k)) throw new GraphError(`§3/§4 で ID 重複 ${k}`);
    g.set(k, v);
  }
  return g;
}

/** §5 のコードブロック(`X ← A, B`)= 導出グラフ */
export function parseDerived(md: string): Graph {
  const s5 = sections(md).get(5);
  if (!s5) throw new GraphError("09 に §5 が見つからない");
  const block = /```\n([\s\S]*?)```/.exec(s5);
  if (!block) throw new GraphError("§5 にコードブロックがない");
  const g: Graph = new Map();
  for (const raw of block[1].split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^(\S+) ← (.*)$/.exec(line);
    if (!m) throw new GraphError(`§5 の行を解釈できない: ${line}`);
    if (g.has(m[1])) throw new GraphError(`§5: ID 重複 ${m[1]}`);
    g.set(m[1], parseDepends(m[2]));
  }
  return g;
}

function assertNoCycle(g: Graph): void {
  const state = new Map<string, 1 | 2>(); // 1=訪問中 2=完了
  const visit = (id: string, path: string[]) => {
    const s = state.get(id);
    if (s === 2) return;
    if (s === 1) throw new GraphError(`循環依存: ${[...path, id].join(" → ")}`);
    state.set(id, 1);
    for (const d of g.get(id) ?? []) visit(d, [...path, id]);
    state.set(id, 2);
  };
  for (const id of g.keys()) visit(id, []);
}

/**
 * 正本と導出を照合し、整合していれば正本グラフを返す。
 * 不整合・未知 ID・循環・ノード数不一致はすべて GraphError(fail closed)。
 */
export function loadGraph(md: string, expectedNodes = 56): Graph {
  const canon = parseCanonical(md);
  const derived = parseDerived(md);
  for (const [id, deps] of canon) {
    for (const d of deps) if (!canon.has(d)) throw new GraphError(`未知の depends: ${id} ← ${d}`);
  }
  for (const id of canon.keys()) if (!derived.has(id)) throw new GraphError(`§5 に欠落: ${id}`);
  for (const id of derived.keys()) if (!canon.has(id)) throw new GraphError(`§5 に過剰: ${id}`);
  for (const [id, deps] of canon) {
    const a = [...deps].sort().join(",");
    const b = [...(derived.get(id) ?? [])].sort().join(",");
    if (a !== b) throw new GraphError(`§3/§4 と §5 の depends 不一致: ${id} (${a}) vs (${b})`);
  }
  if (canon.size !== expectedNodes) throw new GraphError(`ノード数 ${canon.size} ≠ 期待 ${expectedNodes}`);
  assertNoCycle(canon);
  return canon;
}

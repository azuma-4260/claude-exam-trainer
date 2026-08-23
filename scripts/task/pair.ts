// paired task と「同時 1 本」制約の機械可読定数(specs/10 §3)。
// 09 §7 / tasks/README の規約の写し。テストで 09 の記述・グラフと一致することを固定する。

/** テストタスク T-x → 同じ worktree で納品する実装タスク D-y */
export const PAIRS: ReadonlyMap<string, string> = new Map([
  ["T-srs", "D1-1"],
  ["T-holdout", "D1-2"],
  ["T-write", "D1-3"],
  ["T-queue", "D1-4"],
  ["T-mock", "D3-1"],
]);

/** paired の実装側 D-y → T-x(単独着手禁止の判定に使う) */
export const PAIRED_DEPENDENTS: ReadonlyMap<string, string> = new Map([...PAIRS].map(([t, d]) => [d, t]));

/** 同時に 1 本しか進められないタスク群(lock 名 → ID 集合) */
export const EXCLUSIVE_LOCKS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["migration", new Set(["D0-4", "C6"])],
]);

export function lockOf(id: string): string | null {
  for (const [name, ids] of EXCLUSIVE_LOCKS) if (ids.has(id)) return name;
  return null;
}

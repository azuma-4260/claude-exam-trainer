// バックログ静的検証 `npm run backlog:check [dir]`(specs/10 §1)。違反は fail closed(非 0)。
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { loadGraph } from "../task/graph";
import { BACKLOG_DIR, parseBacklogFile, type BacklogItem } from "./schema";

export interface CheckResult {
  items: BacklogItem[];
  errors: string[];
}

/** dir 直下の *.md(README.md 除く)を検証。I/O はここだけ */
export function checkBacklogDir(dir: string, known: ReadonlySet<string>): CheckResult {
  const items: BacklogItem[] = [];
  const errors: string[] = [];
  if (!existsSync(dir)) return { items, errors };
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith(".md") || f === "README.md") continue;
    try {
      items.push(parseBacklogFile(f, readFileSync(path.join(dir, f), "utf8"), known));
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  return { items, errors };
}

function main(): void {
  const root = process.cwd();
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, BACKLOG_DIR);
  const graph = loadGraph(readFileSync(path.join(root, "specs/09_task-plan.md"), "utf8"));
  const { items, errors } = checkBacklogDir(dir, new Set(graph.keys()));
  for (const e of errors) console.error(`backlog:check NG ${e}`);
  if (errors.length > 0) {
    console.error(`backlog:check 失敗: ${errors.length} 件`);
    process.exit(1);
  }
  console.log(`backlog:check OK (${items.length} 件)`);
}

if (process.argv[1] && /backlog[\\/]check\.ts$/.test(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(`backlog:check 失敗(fail closed): ${(e as Error).message}`);
    process.exit(1);
  }
}

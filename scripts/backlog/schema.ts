// tasks/backlog/B-<origin>-<n>.md の front matter スキーマ(specs/10 §1 と 1:1)。
// Zod が単一ソース。型は z.infer で導出し、validator も report も同じ schema を使う。
import { z } from "zod";
import { parse as parseYaml } from "yaml";
import { ID_RE } from "../task/graph";

export const BACKLOG_DIR = "tasks/backlog";
export const BACKLOG_ID_RE = /^B-([A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)?)-(\d+)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const STOP_CONDITIONS = ["none", "schema", "transition", "scoring", "srs", "mock", "auth", "prod-data"] as const;
export const DECISION_ACTIONS = ["absorb", "defer", "escalate", "close"] as const;

const taskId = z.string().regex(ID_RE, "タスク ID の形式ではない");
const backlogId = z.string().regex(BACKLOG_ID_RE, "B-<ID>-<n> の形式ではない");
const dateStr = z.string().regex(DATE_RE, "YYYY-MM-DD ではない");

export const statusSchema = z.union([
  z.literal("open"),
  z.literal("closed"),
  z.string().regex(/^absorbed-by [A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)?$/, "absorbed-by <ID> の形式ではない"),
  z.string().regex(/^promoted-to [A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)?$/, "promoted-to <ID> の形式ではない"),
]);

export const decisionSchema = z
  .object({
    at: dateStr,
    by: taskId,
    action: z.enum(DECISION_ACTIONS),
    note: z.string().min(1),
  })
  .strict();

export const backlogFrontMatterSchema = z
  .object({
    id: backlogId,
    origin: taskId,
    created: dateStr,
    status: statusSchema,
    related_tasks: z.array(taskId),
    related_specs: z.array(z.string().regex(/^\d{2}#.+$/, "<spec番号>#<見出し> ではない")),
    related_paths: z.array(
      z.string().min(1).refine((p) => !p.startsWith("/") && !p.split("/").includes(".."), "リポジトリ相対パスではない"),
    ),
    related_backlog: z.array(backlogId).optional(),
    stop_condition: z.enum(STOP_CONDITIONS),
    decisions: z.array(decisionSchema).optional(),
  })
  .strict();

export type BacklogFrontMatter = z.infer<typeof backlogFrontMatterSchema>;

export interface BacklogItem extends BacklogFrontMatter {
  /** 本文の先頭見出し(無ければ本文 1 行目) */
  title: string;
  body: string;
}

export class BacklogError extends Error {}

/** status に埋め込まれたタスク ID(open/closed は null) */
export function statusTarget(status: string): string | null {
  const m = /^(?:absorbed-by|promoted-to) (\S+)$/.exec(status);
  return m ? m[1] : null;
}

/** front matter + 本文を parse して schema で検証する。known は 09 のノード集合 */
export function parseBacklogFile(fileName: string, text: string, known: ReadonlySet<string>): BacklogItem {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) throw new BacklogError(`${fileName}: front matter(--- ... ---)がない`);
  let raw: unknown;
  try {
    raw = parseYaml(m[1]);
  } catch (e) {
    throw new BacklogError(`${fileName}: YAML を解釈できない: ${(e as Error).message}`);
  }
  const r = backlogFrontMatterSchema.safeParse(raw);
  if (!r.success) {
    const issues = r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    throw new BacklogError(`${fileName}: ${issues}`);
  }
  const fm = r.data;
  if (`${fm.id}.md` !== fileName) throw new BacklogError(`${fileName}: id ${fm.id} とファイル名が一致しない`);
  const originInId = BACKLOG_ID_RE.exec(fm.id)![1];
  if (originInId !== fm.origin) throw new BacklogError(`${fileName}: id の発生元 ${originInId} と origin ${fm.origin} が一致しない`);
  for (const id of [fm.origin, ...fm.related_tasks, ...(fm.decisions ?? []).map((d) => d.by)]) {
    if (!known.has(id)) throw new BacklogError(`${fileName}: 09 に無いタスク ID ${id}`);
  }
  const target = statusTarget(fm.status);
  if (target && !known.has(target)) throw new BacklogError(`${fileName}: status の ID ${target} が 09 に無い`);
  const body = m[2].trim();
  const heading = /^#+\s*(.+)$/m.exec(body);
  const title = heading ? heading[1].trim() : (body.split("\n")[0] ?? "").trim();
  return { ...fm, title, body };
}

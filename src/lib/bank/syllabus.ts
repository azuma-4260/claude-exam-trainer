import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { scenariosFileSchema, syllabusFileSchema, type Scenario, type Syllabus } from "./schema";

/**
 * syllabus.yaml / scenarios.yaml の読込(specs/03 §1)。schema.ts を単一ソースとして検証する。
 * - syllabus.yaml は常に必須(validate-bank が欠落を fail にする)
 * - scenarios.yaml は未整備(ファイル無し)なら null。必須性の判定は validate-bank の責務
 */

export function loadSyllabus(dir: string): Syllabus {
  const p = path.join(dir, "syllabus.yaml");
  if (!existsSync(p)) throw new Error(`syllabus.yaml が無い: ${p}`);
  return syllabusFileSchema.parse(parseYaml(readFileSync(p, "utf8")));
}

export function loadScenarios(dir: string): Scenario[] | null {
  const p = path.join(dir, "scenarios.yaml");
  if (!existsSync(p)) return null;
  return scenariosFileSchema.parse(parseYaml(readFileSync(p, "utf8")) ?? { scenarios: [] }).scenarios;
}

/** syllabus 内の全 topic id → domain id */
export function topicDomainMap(s: Syllabus): Map<string, string> {
  const m = new Map<string, string>();
  for (const d of s.domains) for (const t of d.task_statements) for (const tc of t.topics) m.set(tc.id, d.id);
  return m;
}

/**
 * compare-export — 本番 F データの保全検証(specs/06 §F 本番データの保全 v1.3、09 D6-1 DoD / M9)。
 *
 *   npm run compare-export -- <before.json> <after.json> [--exam ccar-f]
 *
 * before / after はどちらも /api/export の出力(全体 export でも ?exam= の出力でもよい)。
 * 両方に同じ規則(filterExportByExam、specs/03 §3)で exam の行を抽出し、テーブルごとに PK 順へ並べて
 * 件数だけでなく行の中身まで一致することを確認する。study_setting は比較しない
 * (D6-1 以前の export には存在せず、スコープ切替で変わる設定行のため)。差分があれば非 0 終了。
 */
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { examSchema, type Exam } from "../src/lib/bank/schema";
import { filterExportByExam, type ExamExportData, type ExportData } from "../src/lib/export/filter";

type Row = Record<string, unknown>;

const TABLES = ["srs_state", "attempt", "exam_session", "exam_session_answer", "question_flag"] as const;

/** 各テーブルの PK(並べ替えと差分表示に使う) */
const PK: Record<(typeof TABLES)[number], string[]> = {
  srs_state: ["questionId"],
  attempt: ["attemptId"],
  exam_session: ["id"],
  exam_session_answer: ["sessionId", "questionId"],
  question_flag: ["id"],
};

const keyOf = (table: (typeof TABLES)[number], row: Row) => PK[table].map((k) => String(row[k])).join("|");

export type CompareResult = {
  ok: boolean;
  tables: { table: string; before: number; after: number; missing: string[]; added: string[]; changed: string[] }[];
};

export function compareExamExports(before: ExportData, after: ExportData, exam: Exam): CompareResult {
  const b: ExamExportData = filterExportByExam(before, exam);
  const a: ExamExportData = filterExportByExam(after, exam);
  const tables = TABLES.map((table) => {
    const bm = new Map(b[table].map((r) => [keyOf(table, r), r]));
    const am = new Map(a[table].map((r) => [keyOf(table, r), r]));
    const missing = [...bm.keys()].filter((k) => !am.has(k)).sort();
    const added = [...am.keys()].filter((k) => !bm.has(k)).sort();
    const changed = [...bm.keys()].filter((k) => am.has(k) && !isDeepStrictEqual(bm.get(k), am.get(k))).sort();
    return { table, before: b[table].length, after: a[table].length, missing, added, changed };
  });
  const ok = tables.every((t) => t.before === t.after && t.missing.length + t.added.length + t.changed.length === 0);
  return { ok, tables };
}

export function formatCompare(r: CompareResult, exam: Exam): string {
  const lines = [`compare-export(${exam})`];
  for (const t of r.tables) {
    const diff = t.missing.length + t.added.length + t.changed.length;
    lines.push(`  ${t.table}: before ${t.before} / after ${t.after}${diff === 0 ? " 一致" : ""}`);
    for (const k of t.missing.slice(0, 10)) lines.push(`    - 消えた行: ${k}`);
    for (const k of t.added.slice(0, 10)) lines.push(`    + 増えた行: ${k}`);
    for (const k of t.changed.slice(0, 10)) lines.push(`    ~ 中身が変わった行: ${k}`);
  }
  lines.push(r.ok ? "OK: 件数・行の中身とも一致" : "NG: 差分あり");
  return lines.join("\n");
}

function parseArgs(argv: string[]): { before: string; after: string; exam: Exam } {
  const files: string[] = [];
  let exam: Exam = "ccar-f";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--exam") exam = examSchema.parse(argv[++i]);
    else files.push(argv[i]);
  }
  if (files.length !== 2) throw new Error("使い方: compare-export <before.json> <after.json> [--exam ccar-f|ccar-p]");
  return { before: files[0], after: files[1], exam };
}

const readExport = (file: string): ExportData => {
  const data = JSON.parse(readFileSync(file, "utf8")) as ExportData;
  for (const k of TABLES) {
    if (!Array.isArray(data[k])) throw new Error(`${file} に ${k} 配列が無い(/api/export の出力か確認する)`);
  }
  return data;
};

if (process.argv[1] && /compare-export\.ts$/.test(process.argv[1])) {
  try {
    const { before, after, exam } = parseArgs(process.argv.slice(2));
    const r = compareExamExports(readExport(before), readExport(after), exam);
    console.log(formatCompare(r, exam));
    process.exit(r.ok ? 0 : 1);
  } catch (e) {
    console.error(`compare-export 失敗: ${(e as Error).message}`);
    process.exit(1);
  }
}

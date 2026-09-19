// audit-choice-balance の監査ロジックのテスト(正解だけが長い / 独特の記法を含む偏りの検出)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AGGREGATE_MIN_ITEMS,
  auditQuestionChoices,
  LENGTH_RATIO_MAX,
  parseArgs,
  runAuditChoiceBalance,
} from "./audit-choice-balance";
import type { Question } from "../src/lib/bank/schema";

const REF = "https://docs.claude.com/en/docs/build-with-claude/handling-stop-reasons";

function mcq(id: string, texts: readonly [string, string, string, string], answer = "D", status = "active"): Question {
  return {
    id,
    exam: "ccar-f",
    domain_id: "f-d1",
    primary_topic_id: "f-d1-t1-01",
    secondary_topic_ids: [],
    type: "mcq_single",
    scenario_id: null,
    eligible_modes: ["mock", "practice"],
    srs_eligible: true,
    stem_en: "Which option is correct?",
    choices: (["A", "B", "C", "D"] as const).map((label, i) => ({ label, text_en: texts[i] })),
    answer: [answer],
    answer_en: null,
    explanation_ja: "解説。",
    refs: [REF],
    difficulty: 2,
    status,
    rev: 1,
  } as Question;
}

const BALANCED: readonly [string, string, string, string] = [
  "Return the partial itinerary to the traveler, treating it like end_turn.",
  "Parse the partial text for a tool call, then execute whatever it finds.",
  "Add an iteration cap so the loop cannot run away, and stop there.",
  "Treat the output as truncated, then continue or retry with more tokens.",
];

describe("auditQuestionChoices", () => {
  it("長さ・記法が揃っていれば error なし", () => {
    const r = auditQuestionChoices(mcq("f-d1-q501", BALANCED));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it("正解が最長誤答の LENGTH_RATIO_MAX 倍を超えると error", () => {
    const long = "x".repeat(Math.ceil(70 * LENGTH_RATIO_MAX) + 1);
    const r = auditQuestionChoices(mcq("f-d1-q501", ["a".repeat(60), "b".repeat(70), "c".repeat(65), long]));
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/正解 D の文字数/);
    expect(r.longestIsCorrect).toBe(true);
  });

  it("正解だけがコロン / カンマ / 括弧を含むと記法クラスごとに error", () => {
    const r = auditQuestionChoices(
      mcq("f-d1-q501", ["Do the first thing here now", "Do the second thing here now", "Do the third thing here now", "Do this: retry (again), then stop"]),
    );
    expect(r.errors.filter((e) => /colon/.test(e))).toHaveLength(1);
    expect(r.errors.filter((e) => /comma/.test(e))).toHaveLength(1);
    expect(r.errors.filter((e) => /paren/.test(e))).toHaveLength(1);
  });

  it("同じ記法クラスを含む誤答が 1 つでもあれば記法 error にならない", () => {
    const r = auditQuestionChoices(
      mcq("f-d1-q501", ["Do the first thing: then stop here", "Do the second thing here now", "Do the third thing here now", "Do this: retry and then stop"]),
    );
    expect(r.errors).toEqual([]);
  });

  it("正解だけが極端に短いと warning(error ではない)", () => {
    const r = auditQuestionChoices(mcq("f-d1-q501", ["a".repeat(100), "b".repeat(100), "c".repeat(100), "d".repeat(40)]));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toHaveLength(1);
    expect(r.longestIsCorrect).toBe(false);
  });

  it("mcq_multi は各正解を誤答と比較する", () => {
    const q = {
      ...mcq("f-d1-q502", ["a".repeat(60), "b".repeat(200), "c".repeat(60), "d".repeat(60)]),
      type: "mcq_multi",
      stem_en: "Which two? (Select TWO)",
      answer: ["B", "D"],
    } as Question;
    const r = auditQuestionChoices(q);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/正解 B/);
  });
});

describe("runAuditChoiceBalance", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "audit-choice-"));
    mkdirSync(path.join(dir, "questions"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  function write(name: string, qs: Question[]): void {
    writeFileSync(path.join(dir, "questions", name), JSON.stringify(qs, null, 2) + "\n");
  }

  it("最長の選択肢が正解である比率が上限を超えると aggregate error", () => {
    const qs: Question[] = [];
    for (let i = 0; i < AGGREGATE_MIN_ITEMS; i++) {
      // 正解は最長だが 1.25 倍以内(per-item error は出ない)
      qs.push(mcq(`f-d1-q${500 + i}`, ["a".repeat(80), "b".repeat(80), "c".repeat(80), "d".repeat(90)]));
    }
    write("d1-mcq.json", qs);
    const r = runAuditChoiceBalance(dir, { status: "active", file: null });
    expect(r.total).toBe(AGGREGATE_MIN_ITEMS);
    expect(r.longestIsCorrect).toBe(AGGREGATE_MIN_ITEMS);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/最長の選択肢が正解/);
  });

  it("件数が AGGREGATE_MIN_ITEMS 未満なら aggregate 検査は省く", () => {
    write("d1-mcq.json", [mcq("f-d1-q501", ["a".repeat(80), "b".repeat(80), "c".repeat(80), "d".repeat(90)])]);
    const r = runAuditChoiceBalance(dir, { status: "active", file: null });
    expect(r.errors).toEqual([]);
  });

  it("--status に一致しない問題と flash は対象外", () => {
    write("d1-mcq.json", [
      mcq("f-d1-q501", ["a".repeat(10), "b".repeat(10), "c".repeat(10), "d".repeat(100)], "D", "flagged"),
      mcq("f-d1-q502", BALANCED),
    ]);
    const r = runAuditChoiceBalance(dir, { status: "active", file: null });
    expect(r.total).toBe(1);
    expect(r.errors).toEqual([]);
  });

  it("--file で 1 ファイルに絞れる。存在しないファイル名は error", () => {
    write("d1-mcq.json", [mcq("f-d1-q501", ["a".repeat(10), "b".repeat(10), "c".repeat(10), "d".repeat(100)])]);
    write("d2-mcq.json", [mcq("f-d1-q503", BALANCED)]);
    const ok = runAuditChoiceBalance(dir, { status: "active", file: "d2-mcq.json" });
    expect(ok.total).toBe(1);
    expect(ok.errors).toEqual([]);
    const ng = runAuditChoiceBalance(dir, { status: "active", file: "d1-mcq.json" });
    expect(ng.errors.some((e) => /f-d1-q501/.test(e))).toBe(true);
    const missing = runAuditChoiceBalance(dir, { status: "active", file: "nope.json" });
    expect(missing.errors[0]).toMatch(/--file nope.json/);
  });
});

describe("parseArgs", () => {
  it("既定値と --dir / --file / --status", () => {
    const d = parseArgs([]);
    expect(d.opts).toEqual({ status: "active", file: null });
    const p = parseArgs(["--dir", "/tmp/x", "--file", "d1-mcq.json", "--status", "flagged"]);
    expect(p.dir).toBe(path.resolve("/tmp/x"));
    expect(p.opts).toEqual({ status: "flagged", file: "d1-mcq.json" });
    expect(() => parseArgs(["--bogus"])).toThrow(/未知の引数/);
  });
});

// audit-practice-mcq の監査ロジックのテスト(B-C3a-1 恒久化。C3a 帯 q101〜 / C5 帯 q501〜 の固有不変条件)
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bandOf, parseArgs, runAuditPracticeMcq } from "./audit-practice-mcq";

const URL_A = "https://docs.claude.com/en/docs/claude-code/memory";
const URL_OUT = "https://example.com/not-in-ledger";

const SYLLABUS = `
exam: ccar-f
version: 1
source: content/ccar-f/SOURCES.md
domains:
${[1, 2, 3, 4, 5]
  .map(
    (d) => `  - id: f-d${d}
    name: "D${d}"
    weight: 20
    form_questions: 12
    task_statements:
      - id: f-d${d}-t1
        name: "TS"
        topics:
          - { id: f-d${d}-t1-01, name: "T", scope_ja: "範囲" }`,
  )
  .join("\n")}
`;

const SOURCES = `# S\n\n## 10. refs ソース台帳\n\n| # | ref URL | 正規 URL | 対応 |\n|---|---|---|---|\n| 1 | ${URL_A} | x | 1.1 |\n`;

const SCENARIOS = `
scenarios:
  - id: sc-x
    title_en: "X"
    context_en: "context"
    refs: ["${URL_A}"]
  - id: sc-y
    title_en: "Y"
    context_en: "context"
    refs: ["${URL_A}"]
`;

const LABELS = ["A", "B", "C", "D"];

function mcq(domain: number, n: number, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `f-d${domain}-q${String(n).padStart(3, "0")}`,
    exam: "ccar-f",
    domain_id: `f-d${domain}`,
    primary_topic_id: `f-d${domain}-t1-01`,
    secondary_topic_ids: [],
    type: "mcq_single",
    scenario_id: null,
    eligible_modes: ["mock", "practice"],
    srs_eligible: true,
    stem_en: "Which option is correct for this question?",
    choices: LABELS.map((l) => ({ label: l, text_en: `choice ${l}` })),
    answer: [LABELS[n % 4]],
    answer_en: null,
    explanation_ja: "正解の根拠。他の選択肢が誤りである理由。",
    refs: [URL_A],
    difficulty: 2,
    status: "active",
    rev: 1,
    ...over,
  };
}

/** C3a 帯: 5 ドメイン × 3 問 = 15(scenario は sc-x / sc-y を交互) */
function c3aBank(): Record<string, unknown>[] {
  const qs: Record<string, unknown>[] = [];
  for (let d = 1; d <= 5; d++)
    for (let i = 0; i < 3; i++)
      qs.push(mcq(d, 101 + i, { eligible_modes: ["practice"], scenario_id: i % 2 === 0 ? "sc-x" : "sc-y" }));
  return qs;
}

const C5_COUNTS = [3, 2, 2, 2, 1];

/** C5 帯: 配分 3/2/2/2/1 = 10。正解ラベルは通し番号で A〜D に分散(偏り warning を出さない) */
function c5Bank(over: (d: number, n: number) => Record<string, unknown> = () => ({})): Record<string, unknown>[] {
  const qs: Record<string, unknown>[] = [];
  let seq = 0;
  C5_COUNTS.forEach((count, i) => {
    for (let k = 0; k < count; k++) qs.push(mcq(i + 1, 501 + k, { answer: [LABELS[seq++ % 4]], ...over(i + 1, 501 + k) }));
  });
  return qs;
}

let tmp: string;
let dir: string;
beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "audit-practice-"));
  dir = path.join(tmp, "content");
  mkdirSync(path.join(dir, "questions"), { recursive: true });
  writeFileSync(path.join(dir, "syllabus.yaml"), SYLLABUS);
  writeFileSync(path.join(dir, "SOURCES.md"), SOURCES);
  writeFileSync(path.join(dir, "scenarios.yaml"), SCENARIOS);
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

const write = (name: string, cards: unknown[]) => writeFileSync(path.join(dir, "questions", name), JSON.stringify(cards));

const base = () => ({ counts: C5_COUNTS, status: "active" });

describe("bandOf", () => {
  it("q101〜q199 は C3a、q501〜q599 は C5、それ以外は null", () => {
    expect(bandOf("f-d1-q101")?.key).toBe("c3a");
    expect(bandOf("f-d1-q199")?.key).toBe("c3a");
    expect(bandOf("f-d2-q501")?.key).toBe("c5");
    expect(bandOf("f-d2-q599")?.key).toBe("c5");
    expect(bandOf("f-d1-q001")).toBeNull();
    expect(bandOf("f-d1-q201")).toBeNull();
    expect(bandOf("f-d1-q401")).toBeNull();
  });
});

describe("runAuditPracticeMcq", () => {
  it("C3a 15 問 + C5 配分どおりなら errors なし(flash・form 収載は無視)", () => {
    write("mcq.json", [...c3aBank(), ...c5Bank()]);
    write("other.json", [
      mcq(1, 1, { type: "flash", choices: null, answer: null, answer_en: "x", eligible_modes: ["drill"], stem_en: "What is X?" }),
      mcq(1, 201, { scenario_id: "sc-x", srs_eligible: false }),
    ]);
    const r = runAuditPracticeMcq(dir, base());
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.total).toBe(25);
  });

  it("C5 配分の過不足(--counts と不一致)を検出する", () => {
    write("mcq.json", [...c3aBank(), ...c5Bank()]);
    const r = runAuditPracticeMcq(dir, { ...base(), counts: [3, 2, 2, 2, 2] });
    expect(r.errors).toEqual(["f-d5: c5 帯 live 件数 1(期待 2)"]);
  });

  it("C5 の固定値違反(eligible_modes / scenario_id / srs_eligible)を検出する", () => {
    write("mcq.json", [
      ...c3aBank(),
      ...c5Bank((d, n) =>
        d === 1 && n === 501
          ? { eligible_modes: ["practice"], scenario_id: "sc-x", srs_eligible: false }
          : {},
      ),
    ]);
    const r = runAuditPracticeMcq(dir, base());
    expect(r.errors.filter((e) => e.startsWith("f-d1-q501"))).toHaveLength(3);
  });

  it("C3a の件数下限・シナリオ数・ドメイン下限・mode を検出する", () => {
    // d5 を 1 問に減らし(合計 13 < 15、d5 < 2)、全問 sc-x にする(distinct 1)
    const qs: Record<string, unknown>[] = c3aBank()
      .filter((q) => !(q.id === "f-d5-q102" || q.id === "f-d5-q103"))
      .map((q) => ({ ...q, scenario_id: "sc-x" }));
    qs[0] = { ...qs[0], eligible_modes: ["mock", "practice"] };
    write("mcq.json", [...qs, ...c5Bank()]);
    const r = runAuditPracticeMcq(dir, base());
    expect(r.errors).toContain("c3a 帯: live 件数 13(期待 15〜20)");
    expect(r.errors).toContain("c3a 帯: distinct scenario_id 1(期待 2: [sc-x])");
    expect(r.errors).toContain("c3a 帯: f-d5 が 1 問(各ドメイン 2 問以上)");
    expect(r.errors.some((e) => e.startsWith("f-d1-q101") && e.includes("eligible_modes"))).toBe(true);
  });

  it("retired は連番には含めるが live 件数・lifecycle からは除外する", () => {
    // C3a: d1 に q104 を追加して q101 を retired(live 15 のまま)。C5: d1 q501 を retired にして q504 を追加
    const c3a = c3aBank().map((q) => (q.id === "f-d1-q101" ? { ...q, status: "retired", rev: 2 } : q));
    c3a.push(mcq(1, 104, { eligible_modes: ["practice"], scenario_id: "sc-y" }));
    const c5 = c5Bank((d, n) => (d === 1 && n === 501 ? { status: "retired" } : {}));
    c5.push(mcq(1, 504));
    write("mcq.json", [...c3a, ...c5]);
    const r = runAuditPracticeMcq(dir, base());
    expect(r.errors).toEqual([]);
    expect(r.total).toBe(25);
  });

  it("帯内の欠番(連番でない)を検出する", () => {
    write("mcq.json", [...c3aBank(), ...c5Bank((d, n) => (d === 1 && n === 503 ? { id: "f-d1-q505" } : {}))]);
    const r = runAuditPracticeMcq(dir, base());
    expect(r.errors.some((e) => e.startsWith("f-d1 c5 帯: question id が連番でない"))).toBe(true);
  });

  it("--batch-ids 指定時は新規バッチだけ status/rev を検査し、C3a は active のまま live 扱いにする", () => {
    const batch = c5Bank(() => ({ status: "flagged" }));
    write("mcq.json", [...c3aBank(), ...batch]);
    const ids = new Set(batch.map((q) => q.id as string));
    const ok = runAuditPracticeMcq(dir, { ...base(), status: "flagged", batchIds: ids });
    expect(ok.errors).toEqual([]);
    expect(ok.total).toBe(25);
    // rev=2 の新規バッチは拒否
    write("mcq.json", [...c3aBank(), ...c5Bank((d, n) => (d === 2 && n === 501 ? { status: "flagged", rev: 2 } : { status: "flagged" }))]);
    const ng = runAuditPracticeMcq(dir, { ...base(), status: "flagged", batchIds: ids });
    expect(ng.errors).toEqual(["f-d2-q501: rev 2(新規バッチは 1 を期待)"]);
    // 存在しない ID
    const missing = runAuditPracticeMcq(dir, { ...base(), status: "flagged", batchIds: new Set([...ids, "f-d1-q599"]) });
    expect(missing.errors).toContain("--batch-ids の f-d1-q599 が C3a / C5 帯の MCQ に存在しない");
  });

  it("--batch-ids 未指定時は live 全件の status を検査する(flagged 混在で失敗)", () => {
    write("mcq.json", [...c3aBank(), ...c5Bank((d, n) => (d === 1 && n === 502 ? { status: "flagged" } : {}))]);
    const r = runAuditPracticeMcq(dir, base());
    expect(r.errors).toEqual(["f-d1-q502: status flagged(期待 active)"]);
  });

  it("台帳外 refs と正解ラベル偏り(warning)を検出する", () => {
    write("mcq.json", [...c3aBank(), ...c5Bank((d, n) => (d === 1 && n === 501 ? { refs: [URL_OUT], answer: ["A"] } : { answer: ["A"] }))]);
    const r = runAuditPracticeMcq(dir, base());
    expect(r.errors).toEqual([`f-d1-q501: refs ${URL_OUT} がソース台帳に無い`]);
    expect(r.warnings).toEqual(["c5 帯: mcq_single の正解ラベル A が 10/10(100% > 35%)"]);
  });
});

describe("parseArgs", () => {
  it("--counts は必須で 5 値、--batch-ids は空を拒否、既定 status は active", () => {
    expect(() => parseArgs([])).toThrow("--counts は必須");
    expect(() => parseArgs(["--counts", "19,13,14,14"])).toThrow("5 値");
    expect(() => parseArgs(["--counts", "19,13,14,14,x"])).toThrow("--counts が不正");
    expect(() => parseArgs(["--counts", "19,13,14,14,10", "--batch-ids", ""])).toThrow("--batch-ids が空");
    expect(() => parseArgs(["--counts", "19,13,14,14,10", "--nope"])).toThrow("未知の引数");
    const { opts } = parseArgs(["--counts", "19,13,14,14,10", "--status", "flagged", "--batch-ids", "f-d1-q501, f-d1-q502"]);
    expect(opts.counts).toEqual([19, 13, 14, 14, 10]);
    expect(opts.status).toBe("flagged");
    expect([...(opts.batchIds ?? [])]).toEqual(["f-d1-q501", "f-d1-q502"]);
    expect(parseArgs(["--counts", "1,1,1,1,1"]).opts.status).toBe("active");
  });
});

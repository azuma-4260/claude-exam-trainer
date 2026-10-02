// audit-flash の監査ロジックのテスト(C2 プラン §3。type=flash のみを domain_id 集計で監査)
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkStemForm, parseArgs, parseLedgerUrls, runAuditFlash, stemSentences } from "./audit-flash";

const URL_A = "https://docs.claude.com/en/docs/claude-code/memory";
const URL_B = "https://www.anthropic.com/engineering/building-effective-agents";

const SYLLABUS = `
exam: ccar-f
version: 1
source: content/ccar-f/SOURCES.md
domains:
  - id: f-d1
    name: "D1"
    weight: 100
    form_questions: 60
    task_statements:
      - id: f-d1-t1
        name: "TS1"
        topics:
          - { id: f-d1-t1-01, name: "T1", scope_ja: "範囲" }
          - { id: f-d1-t1-02, name: "T2", scope_ja: "範囲" }
`;

const SOURCES = `# S\n\n## 10. refs ソース台帳\n\n| # | ref URL | 正規 URL | 対応 |\n|---|---|---|---|\n| 1 | ${URL_A} | x | 1.1 |\n| 2 | ${URL_B} | x | 1.1 |\n`;

function card(n: number, topic: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `f-d1-q${String(n).padStart(3, "0")}`,
    exam: "ccar-f",
    domain_id: "f-d1",
    primary_topic_id: topic,
    secondary_topic_ids: [],
    type: "flash",
    scenario_id: null,
    eligible_modes: ["drill"],
    srs_eligible: true,
    stem_en: "What is the purpose of CLAUDE.md files in a project?",
    choices: null,
    answer: null,
    answer_en: "They store persistent project memory.\nLoaded at session start.",
    explanation_ja: "CLAUDE.md はプロジェクトの永続メモリである。セッション開始時に読み込まれる。",
    refs: [URL_A],
    difficulty: 1,
    status: "flagged",
    rev: 1,
    ...over,
  };
}

let tmp: string;
let dir: string;
beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "audit-flash-"));
  dir = path.join(tmp, "content");
  mkdirSync(path.join(dir, "questions"), { recursive: true });
  writeFileSync(path.join(dir, "syllabus.yaml"), SYLLABUS);
  writeFileSync(path.join(dir, "SOURCES.md"), SOURCES);
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

const write = (name: string, cards: unknown[]) =>
  writeFileSync(path.join(dir, "questions", name), JSON.stringify(cards));

describe("runAuditFlash", () => {
  it("全項目を満たすバンクは green", () => {
    write("d1-agentic.json", [card(1, "f-d1-t1-01"), card(2, "f-d1-t1-02", { refs: [URL_B] })]);
    const r = runAuditFlash(dir, { counts: [2], status: "flagged" });
    expect(r.errors).toEqual([]);
    expect(r.total).toBe(2);
  });

  it("件数・連番・status・台帳外 refs・topic 未被覆を検出する", () => {
    write("d1-agentic.json", [
      card(1, "f-d1-t1-01", { status: "active", refs: ["https://example.com/x"] }),
      card(3, "f-d1-t1-01"), // 欠番(q002 でない)
    ]);
    const errs = runAuditFlash(dir, { counts: [3], status: "flagged" }).errors;
    expect(errs.some((e) => e.includes("件数 2"))).toBe(true);
    expect(errs.some((e) => e.includes("連番"))).toBe(true);
    expect(errs.some((e) => e.includes("status active"))).toBe(true);
    expect(errs.some((e) => e.includes("ソース台帳に無い"))).toBe(true);
    expect(errs.some((e) => e.includes("f-d1-t1-02"))).toBe(true); // 未被覆 topic
  });

  it("予約帯q101〜のMCQと同居してもflash IDと件数を正しく監査する(ファイル名非依存)", () => {
    // flash が 2 ファイルに分かれていても domain_id で集約されて green
    write("d1-flash.json", [card(1, "f-d1-t1-01")]);
    write("extra-flash.json", [card(2, "f-d1-t1-02", { refs: [URL_B] })]);
    // 他タスク(C3a 等)の MCQ ファイルは監査対象外(件数にも数えない)
    write("d1-practice.json", [
      card(101, "f-d1-t1-01", {
        id: "f-d1-q101",
        type: "mcq_single",
        choices: [
          { label: "A", text_en: "a" },
          { label: "B", text_en: "b" },
        ],
        answer: ["A"],
        answer_en: null,
        eligible_modes: ["practice"],
        srs_eligible: false,
        status: "active",
      }),
    ]);
    const r = runAuditFlash(dir, { counts: [2], status: "flagged" });
    expect(r.errors).toEqual([]);
    expect(r.total).toBe(2);
  });

  it("C5では既存active/rev更新とMCQを許容し、新規batchだけflagged/rev=1を検査する", () => {
    write("all.json", [
      card(1, "f-d1-t1-01", { status: "active", rev: 2 }),
      card(101, "f-d1-t1-01", {
        id: "f-d1-q101",
        type: "mcq_single",
        choices: [
          { label: "A", text_en: "a" },
          { label: "B", text_en: "b" },
        ],
        answer: ["A"],
        answer_en: null,
        eligible_modes: ["practice"],
        srs_eligible: false,
        status: "active",
      }),
      card(2, "f-d1-t1-02"),
    ]);
    const r = runAuditFlash(dir, { counts: [2], status: "flagged", batchIds: new Set(["f-d1-q002"]) });
    expect(r.errors).toEqual([]);
    expect(r.total).toBe(2);
  });

  it("全件監査では editorial fix 後の rev++ を許容する", () => {
    write("all.json", [
      card(1, "f-d1-t1-01", { status: "active", rev: 2 }),
      card(2, "f-d1-t1-02", { status: "active", rev: 3 }),
    ]);
    const r = runAuditFlash(dir, { counts: [2], status: "active" });
    expect(r.errors).toEqual([]);
    expect(r.total).toBe(2);
  });

  it("新規batchでは rev=1 を要求する", () => {
    write("all.json", [
      card(1, "f-d1-t1-01", { status: "active", rev: 2 }),
      card(2, "f-d1-t1-02", { rev: 2 }),
    ]);
    const r = runAuditFlash(dir, {
      counts: [2],
      status: "flagged",
      batchIds: new Set(["f-d1-q002"]),
    });
    expect(r.errors).toContain("f-d1-q002: rev 2(新規バッチは 1 を期待)");
  });

  it("retired は全 question ID 連番には残すが live 件数・topic 被覆から除外する", () => {
    write("all.json", [
      card(1, "f-d1-t1-02", { status: "retired", rev: 2 }),
      card(2, "f-d1-t1-01", { status: "active" }),
    ]);
    const r = runAuditFlash(dir, { counts: [1], status: "active" });
    expect(r.total).toBe(1);
    expect(r.errors.some((e) => e.includes("f-d1-t1-02"))).toBe(true);
    expect(r.errors.some((e) => e.includes("連番"))).toBe(false);
  });

  it("形式違反・counts のドメイン過不足・スキーマ違反ファイルの fail closed を検出する", () => {
    write("d1-agentic.json", [
      card(1, "f-d1-t1-01", {
        stem_en: "First sentence. Second sentence.",
        answer_en: "l1\nl2\nl3\nl4",
        explanation_ja: "一文だけ。",
      }),
    ]);
    // domain_id と id/topic の不整合は Zod スキーマ(単一ソース)がファイル単位で弾く
    write("broken.json", [card(2, "f-d1-t1-02", { domain_id: "f-d2" })]);
    const errs = runAuditFlash(dir, { counts: [2, 0], status: "flagged" }).errors;
    expect(errs.some((e) => e.includes("stem_en の形式違反: 最終文が問いでない"))).toBe(true);
    expect(errs.some((e) => e.includes("answer_en が 4 行"))).toBe(true);
    expect(errs.some((e) => e.includes("explanation_ja が 1 文"))).toBe(true);
    expect(errs.some((e) => e.includes("broken.json: 読込/スキーマ失敗"))).toBe(true);
    expect(errs.some((e) => e.includes("f-d1: flash 件数 1(期待 2)"))).toBe(true);
    expect(errs.some((e) => e.includes("f-d2: flash 件数 0(期待 0)"))).toBe(false);
  });

  it("--status active で flagged を検出する(Step 4 後の再監査)", () => {
    write("d1-agentic.json", [card(1, "f-d1-t1-01"), card(2, "f-d1-t1-02")]);
    const errs = runAuditFlash(dir, { counts: null, status: "active" }).errors;
    expect(errs.filter((e) => e.includes("status flagged(期待 active)")).length).toBe(2);
  });
});

describe("checkStemForm(specs/07 Step 2: 状況設定 0〜3 文 + 問い 1 文)", () => {
  it.each([
    ["1 文の疑問文", "What does CLAUDE.md do?"],
    ["状況設定 2 文 + 疑問文", "A team runs six subagents on every request. Simple questions cost as much as deep ones. Why should it select subagents dynamically?"],
    ["Describe で終わる 3 文", "You ask Claude Code for a parser. Each fix breaks another case. Describe the test-driven iteration loop."],
    ["1 文の指示文", "Name the three appropriate escalation triggers for a support agent."],
    ["閉じ引用符つきの疑問文", 'A reviewer keeps asking the same thing. How should you answer "Why did the run fail?"'],
  ])("OK: %s", (_label, stem) => {
    expect(checkStemForm(stem)).toBeNull();
  });
  it.each([
    ["5 文", "One. Two. Three. Four. What next?", "5 文"],
    ["途中に ?", "Is this a question? What next?", "問いが複数"],
    ["1 文で文末記号なし", "A stem without terminal punctuation", "文末記号で終わらない"],
    ["複数文で末尾に文末記号なし", "A team runs a pipeline. It is slow. Why is it slow", "文末記号で終わらない"],
    ["宣言文で終わる複数文", "A team runs a pipeline. It is slow. The fix is caching.", "最終文が問いでない"],
    ["許容外動詞の指示文", "A team runs a pipeline. Fix the slow step.", "最終文が問いでない"],
    ["空", "   ", "空"],
  ])("NG: %s", (_label, stem, reason) => {
    expect(checkStemForm(stem)).toContain(reason);
  });
});

describe("stemSentences / parseLedgerUrls / parseArgs", () => {
  it("中間ドット(CLAUDE.md / .mcp.json)を文末と数えない", () => {
    expect(stemSentences("What does CLAUDE.md do?")).toHaveLength(1);
    expect(stemSentences("Use the .mcp.json file at the project root.")).toHaveLength(1);
    expect(stemSentences("Which U.S. policy applies?")).toHaveLength(1);
    expect(stemSentences("What does e.g. mean?")).toHaveLength(1);
    expect(stemSentences("One. Two.")).toHaveLength(2);
    expect(stemSentences("Which policy applies in the U.S. What changes?")).toHaveLength(2);
    expect(stemSentences('Claude said "Done." What next?')).toHaveLength(2);
  });
  it("台帳表から ref URL 列だけを抽出する", () => {
    const urls = parseLedgerUrls(SOURCES);
    expect(urls).toEqual(new Set([URL_A, URL_B]));
  });
  it("--counts / --status / --dir を解釈し、不正 counts は throw", () => {
    const { dir: d, opts } = parseArgs(["--dir", "/x", "--counts", "40,27,30,30,23", "--status", "active"]);
    expect(d).toBe(path.resolve("/x"));
    expect(opts.counts).toEqual([40, 27, 30, 30, 23]);
    expect(opts.status).toBe("active");
    expect(parseArgs([]).opts).toEqual({ exam: "ccar-f", counts: null, status: "flagged", batchIds: null });
    expect(parseArgs(["--batch-ids", "f-d1-q003,f-d2-q004"]).opts.batchIds).toEqual(new Set(["f-d1-q003", "f-d2-q004"]));
    expect(() => parseArgs(["--counts", "a,b"])).toThrow(/不正/);
  });
});

// D6-3: --exam ccar-p(P の flash を p-dN の番号順 counts で監査)
describe("runAuditFlash(exam=ccar-p)", () => {
  const P_SYLLABUS = `
exam: ccar-p
version: 1
source: content/ccar-p/SOURCES.md
domains:
  - id: p-d6
    name: "D6"
    weight: 100
    form_questions: 63
    task_statements:
      - id: p-d6-t1
        name: "TS1"
        topics:
          - { id: p-d6-t1-01, name: "T1", scope_ja: "範囲" }
`;
  const pcard = (n: number, over: Record<string, unknown> = {}) =>
    card(n, "p-d6-t1-01", { id: `p-d6-q${String(n).padStart(3, "0")}`, exam: "ccar-p", domain_id: "p-d6", ...over });

  beforeEach(() => writeFileSync(path.join(dir, "syllabus.yaml"), P_SYLLABUS));

  it("P の flash を p-d6 の件数で監査し green", () => {
    write("p.json", [pcard(1), pcard(2)]);
    const r = runAuditFlash(dir, { exam: "ccar-p", counts: [0, 0, 0, 0, 0, 2], status: "flagged" });
    expect(r.errors).toEqual([]);
    expect(r.total).toBe(2);
  });

  it("件数違反を p-dN で検出し、既定 exam(ccar-f)で監査すると exam 不一致", () => {
    write("p.json", [pcard(1)]);
    const p = runAuditFlash(dir, { exam: "ccar-p", counts: [0, 0, 0, 0, 0, 2], status: "flagged" }).errors;
    expect(p.some((e) => e.includes("p-d6: flash 件数 1(期待 2)"))).toBe(true);
    const f = runAuditFlash(dir, { counts: null, status: "flagged" }).errors;
    expect(f.some((e) => e.includes("syllabus.yaml: exam=ccar-p(期待 ccar-f)"))).toBe(true);
    expect(f.some((e) => e.includes("p-d6-q001: exam ccar-p(期待 ccar-f)"))).toBe(true);
  });

  it("--exam ccar-p は既定ディレクトリを content/ccar-p にする。不正値は throw", () => {
    const a = parseArgs(["--exam", "ccar-p"]);
    expect(a.dir).toBe(path.join(process.cwd(), "content", "ccar-p"));
    expect(a.opts.exam).toBe("ccar-p");
    expect(() => parseArgs(["--exam", "ccar-x"])).toThrow(/--exam/);
  });
});

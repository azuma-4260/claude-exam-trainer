import { describe, expect, it } from "vitest";
import { evaluatePool, filterPool, type PoolContext } from "@/lib/bank/pool";
import { questionSchema, type Question } from "@/lib/bank/schema";
import type { OpenFlag } from "./repo";

// D1-6 DoD: フラグ後その問題が出題プール(=キュー生成の入力)から消える。旧 rev フラグは除外されない。
// loadOpenFlags(db) が返す形(resolved_at is null の行)をそのまま PoolContext.flags に入れて evaluatePool に通す。

const base = {
  id: "f-d2-q001",
  exam: "ccar-f",
  domain_id: "f-d2",
  primary_topic_id: "f-d2-t1-03",
  secondary_topic_ids: [],
  type: "flash",
  scenario_id: null,
  eligible_modes: ["drill"],
  srs_eligible: true,
  stem_en: "What is the default transport for a local MCP server?",
  choices: null,
  answer: null,
  answer_en: "stdio",
  explanation_ja: "ローカル実行は stdio。",
  refs: ["https://docs.claude.com/en/docs/mcp"],
  difficulty: 1,
  status: "active",
  rev: 2,
} as const;
const q = (over: Partial<Question> = {}): Question => questionSchema.parse({ ...base, ...over });
const mcq = (over: Partial<Question> = {}): Question =>
  questionSchema.parse({
    ...base,
    type: "mcq_single",
    eligible_modes: ["practice"],
    choices: [
      { label: "A", text_en: "stdio" },
      { label: "B", text_en: "Streamable HTTP" },
      { label: "C", text_en: "WebSocket" },
      { label: "D", text_en: "gRPC" },
    ],
    answer: ["A"],
    answer_en: null,
    ...over,
  });
const ctx = (flags: OpenFlag[]): PoolContext => ({ forms: [], sessions: [], flags });
const open = (questionId: string, questionRev: number): OpenFlag => ({ questionId, questionRev, resolvedAt: null });

describe("フラグ行 → 出題除外(evaluatePool との統合)", () => {
  it("現行 rev の open フラグでキュー候補から消える(drill / practice とも)", () => {
    const c = ctx([open("f-d2-q001", 2)]);
    expect(evaluatePool(q(), { mode: "drill" }, c)).toEqual({ allowed: false, reason: "open_flag" });
    expect(evaluatePool(mcq(), { mode: "practice" }, c)).toEqual({ allowed: false, reason: "open_flag" });
    expect(filterPool([q(), q({ id: "f-d2-q002" })], { mode: "drill" }, c).map((x) => x.id)).toEqual(["f-d2-q002"]);
  });

  it("旧 rev の open フラグは superseded で除外されない", () => {
    expect(evaluatePool(q({ rev: 3 }), { mode: "drill" }, ctx([open("f-d2-q001", 2)]))).toEqual({ allowed: true });
  });

  it("旧 rev と現行 rev の両方に open があれば除外される", () => {
    const c = ctx([open("f-d2-q001", 1), open("f-d2-q001", 2)]);
    expect(evaluatePool(q(), { mode: "drill" }, c).allowed).toBe(false);
  });

  it("フラグ後にバンク側で rev++(editorial fix)されると自動的に出題復帰する", () => {
    const c = ctx([open("f-d2-q001", 2)]);
    expect(evaluatePool(q({ rev: 2 }), { mode: "drill" }, c).allowed).toBe(false);
    expect(evaluatePool(q({ rev: 3 }), { mode: "drill" }, c).allowed).toBe(true);
  });

  it("別問題のフラグには影響しない", () => {
    expect(evaluatePool(q(), { mode: "drill" }, ctx([open("f-d2-q099", 2)])).allowed).toBe(true);
  });
});

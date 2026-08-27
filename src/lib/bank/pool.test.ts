import { describe, expect, it } from "vitest";
import { mockFormSchema, questionSchema, type MockForm, type Question } from "./schema";
import {
  evaluatePool,
  filterPool,
  formAvailability,
  holdoutFormOf,
  unsubmittedFormIds,
  type OpenFlag,
  type PoolContext,
  type PoolQuery,
  type PoolSession,
} from "./pool";

// T-holdout: 出題プールの 5 段判定(specs/03 §出題プールの判定順序、01 FR-3/FR-5、04 §モード行列)。
// content/ はまだ空なので、仮 form(60 問)と仮 exam_session を fixture で組む。
// 同一問題が複数 form に収載される fixture は validator 条件(form 間重複なし)違反なので扱わない。

const base = {
  id: "f-d2-q001",
  exam: "ccar-f",
  domain_id: "f-d2",
  primary_topic_id: "f-d2-t1-03",
  secondary_topic_ids: [],
  type: "mcq_single",
  scenario_id: null,
  eligible_modes: ["drill", "practice"],
  srs_eligible: true,
  stem_en: "Which transport should the MCP server use?",
  choices: [
    { label: "A", text_en: "stdio" },
    { label: "B", text_en: "Streamable HTTP" },
    { label: "C", text_en: "WebSocket" },
    { label: "D", text_en: "gRPC" },
  ],
  answer: ["B"],
  answer_en: null,
  explanation_ja: "リモート公開には Streamable HTTP が適切。",
  refs: ["https://docs.claude.com/en/docs/mcp"],
  difficulty: 2,
  status: "active",
  rev: 1,
} as const;

const q = (over: Partial<Question> & { id: string }): Question =>
  questionSchema.parse({ ...base, ...over });

// フォーム収載問題の標準値(03 §question): eligible_modes=[mock, practice], srs_eligible=false, scenario_id != null
const formQuestionIds = (prefix: string) =>
  Array.from({ length: 60 }, (_, i) => `${prefix}-q${String(100 + i).padStart(3, "0")}`);
const formAIds = formQuestionIds("f-d1");
const formBIds = formQuestionIds("f-d3");
const formQuestion = (id: string, over: Partial<Question> = {}): Question =>
  q({
    id,
    domain_id: id.startsWith("f-d1") ? "f-d1" : "f-d3",
    primary_topic_id: id.startsWith("f-d1") ? "f-d1-t1-01" : "f-d3-t1-01",
    scenario_id: "sc-1",
    eligible_modes: ["mock", "practice"],
    srs_eligible: false,
    ...over,
  });

const formA: MockForm = mockFormSchema.parse({
  id: "form-a",
  exam: "ccar-f",
  scenario_ids: ["sc-1"],
  question_ids: formAIds,
});
const formB: MockForm = mockFormSchema.parse({
  id: "form-b",
  exam: "ccar-f",
  scenario_ids: ["sc-1"],
  question_ids: formBIds,
});

const session = (over: Partial<PoolSession> = {}): PoolSession => ({
  exam: "ccar-f",
  kind: "full",
  formId: "form-a",
  status: "submitted",
  ...over,
});
const flag = (over: Partial<OpenFlag> = {}): OpenFlag => ({
  questionId: "f-d2-q001",
  questionRev: 1,
  resolvedAt: null,
  ...over,
});
const ctx = (over: Partial<PoolContext> = {}): PoolContext => ({
  forms: [formA, formB],
  sessions: [],
  flags: [],
  ...over,
});

const inA = formQuestion(formAIds[0]);
const free = q({ id: "f-d2-q001" });
const practice: PoolQuery = { mode: "practice" };
const drill: PoolQuery = { mode: "drill" };
const fullA: PoolQuery = { mode: "mock", kind: "full", formId: "form-a" };
const fullB: PoolQuery = { mode: "mock", kind: "full", formId: "form-b" };
const miniD1: PoolQuery = { mode: "mock", kind: "domain_mini", domainId: "f-d1" };
const miniD2: PoolQuery = { mode: "mock", kind: "domain_mini", domainId: "f-d2" };

const allowed = (question: Question, query: PoolQuery, c = ctx()) =>
  evaluatePool(question, query, c).allowed;
const reason = (question: Question, query: PoolQuery, c = ctx()) =>
  evaluatePool(question, query, c).reason;

describe("unsubmittedFormIds / holdoutFormOf", () => {
  it("session が無ければ全 form が未提出", () => {
    expect(unsubmittedFormIds(ctx())).toEqual(new Set(["form-a", "form-b"]));
  });

  it("kind=full かつ status=submitted の session だけが form を解放する", () => {
    expect(unsubmittedFormIds(ctx({ sessions: [session()] }))).toEqual(new Set(["form-b"]));
    for (const s of [
      session({ status: "in_progress" }),
      session({ status: "abandoned" }),
      session({ kind: "domain_mini" }),
      session({ kind: "half" }),
      session({ formId: null }),
      session({ exam: "ccar-p" }), // 別試験の同名 form 提出は解放しない
    ]) {
      expect(unsubmittedFormIds(ctx({ sessions: [s] })), JSON.stringify(s)).toEqual(
        new Set(["form-a", "form-b"]),
      );
    }
  });

  it("in_progress と submitted が混在しても submitted が 1 件あれば解放", () => {
    const c = ctx({ sessions: [session({ status: "in_progress" }), session()] });
    expect(unsubmittedFormIds(c)).toEqual(new Set(["form-b"]));
  });

  it("holdoutFormOf は収載 form の id、非収載なら null", () => {
    expect(holdoutFormOf(formAIds[59], [formA, formB])).toBe("form-a");
    expect(holdoutFormOf(formBIds[0], [formA, formB])).toBe("form-b");
    expect(holdoutFormOf("f-d2-q001", [formA, formB])).toBeNull();
    expect(holdoutFormOf(formAIds[0], [])).toBeNull();
  });
});

describe("formAvailability: フォーム開始時の availability 検証(D3-2, 01 FR-5)", () => {
  const questionsA = formAIds.map((id) => formQuestion(id));

  it("全問 active・フラグ無しなら available", () => {
    expect(formAvailability(questionsA, [])).toEqual({
      available: true,
      openFlagCount: 0,
      inactiveCount: 0,
      missingCount: 0,
    });
  });

  it("1 問でも status≠active なら不可(inactiveCount に計上)", () => {
    for (const status of ["flagged", "retired"] as const) {
      const qs = [formQuestion(formAIds[0], { status }), ...questionsA.slice(1)];
      expect(formAvailability(qs, []), status).toEqual({
        available: false,
        openFlagCount: 0,
        inactiveCount: 1,
        missingCount: 0,
      });
    }
  });

  it("1 問でも現行 rev の未解決フラグがあれば不可(openFlagCount に計上)", () => {
    const flags = [flag({ questionId: formAIds[0], questionRev: 1 })];
    expect(formAvailability(questionsA, flags)).toEqual({
      available: false,
      openFlagCount: 1,
      inactiveCount: 0,
      missingCount: 0,
    });
  });

  it("旧 rev のフラグは superseded として無視する", () => {
    const qs = [formQuestion(formAIds[0], { rev: 2 }), ...questionsA.slice(1)];
    const flags = [flag({ questionId: formAIds[0], questionRev: 1 })];
    expect(formAvailability(qs, flags).available).toBe(true);
  });

  it("バンク不整合(null)は missingCount に独立計上して不可(availability 理由には混ぜない)", () => {
    const qs = [null, ...questionsA.slice(1)];
    expect(formAvailability(qs, [])).toEqual({
      available: false,
      openFlagCount: 0,
      inactiveCount: 0,
      missingCount: 1,
    });
  });

  it("status NG とフラグ NG が同一問題なら inactive を優先して二重計上しない", () => {
    const qs = [formQuestion(formAIds[0], { status: "flagged" }), ...questionsA.slice(1)];
    const flags = [flag({ questionId: formAIds[0], questionRev: 1 })];
    expect(formAvailability(qs, flags)).toEqual({
      available: false,
      openFlagCount: 0,
      inactiveCount: 1,
      missingCount: 0,
    });
  });
});

describe("1. holdout ゲート(最優先)", () => {
  it("未提出 form の収載問題は、その form の full 実施以外のどのモードでも出ない", () => {
    // 他の全段(active / フラグなし / practice 可)を満たしていても落ちる
    expect(reason(inA, practice)).toBe("holdout");
    expect(reason(inA, { mode: "practice", srs: true })).toBe("holdout");
    expect(reason(inA, drill)).toBe("holdout");
    expect(reason(inA, miniD1)).toBe("holdout");
    expect(reason(inA, fullB)).toBe("holdout");
  });

  it("その正確な form の full 実施では通る", () => {
    expect(allowed(inA, fullA)).toBe(true);
  });

  it("holdout は eligible_modes より先に評価される(mode 不一致でも reason は holdout)", () => {
    const noPractice = formQuestion(formAIds[1], { eligible_modes: ["mock"] });
    expect(reason(noPractice, practice)).toBe("holdout");
    expect(reason(noPractice, practice, ctx({ sessions: [session()] }))).toBe("mode");
  });

  it("holdout は status / flag より先に評価される", () => {
    const retired = formQuestion(formAIds[2], { status: "retired" });
    expect(reason(retired, practice)).toBe("holdout");
    const flagged = ctx({ flags: [flag({ questionId: formAIds[0] })] });
    expect(reason(inA, practice, flagged)).toBe("holdout");
  });

  it("提出後は Practice に解放されるが srs_eligible=false は維持される", () => {
    const c = ctx({ sessions: [session()] });
    expect(allowed(inA, practice, c)).toBe(true);
    expect(reason(inA, { mode: "practice", srs: true }, c)).toBe("srs");
    // 標準値 eligible_modes=[mock, practice] なので drill は mode で落ちる。仮に drill を含めても srs で落ちる
    expect(reason(inA, drill, c)).toBe("mode");
    const drillable = formQuestion(formAIds[0], { eligible_modes: ["mock", "practice", "drill"] });
    expect(reason(drillable, drill, c)).toBe("srs");
  });

  it("form-a 提出は form-b を解放しない", () => {
    const inB = formQuestion(formBIds[0]);
    const c = ctx({ sessions: [session()] });
    expect(reason(inB, practice, c)).toBe("holdout");
    expect(allowed(inB, fullB, c)).toBe(true);
  });

  it("提出済み form の再受験(rehearsal)でも full 実施では通る", () => {
    expect(allowed(inA, fullA, ctx({ sessions: [session()] }))).toBe(true);
  });

  it("非収載問題には holdout が効かない", () => {
    expect(allowed(free, practice)).toBe(true);
    expect(allowed(free, drill)).toBe(true);
  });

  it("別試験(ccar-p)の同名 form が未提出でも、提出済み ccar-f form-a の解放を妨げない", () => {
    const formAp: MockForm = mockFormSchema.parse({
      id: "form-a",
      exam: "ccar-p",
      scenario_ids: ["sc-1"],
      question_ids: formAIds.map((id) => id.replace(/^f-/, "p-")),
    });
    const c = ctx({ forms: [formA, formB, formAp], sessions: [session()] });
    expect(allowed(inA, practice, c)).toBe(true);
    expect(unsubmittedFormIds(c)).toEqual(new Set(["form-b", "form-a"])); // p 側の form-a は未提出のまま
  });

  it("forms が空(フォーム未存在)でも判定は完全形で動く", () => {
    const c = ctx({ forms: [] });
    expect(allowed(free, practice, c)).toBe(true);
    expect(unsubmittedFormIds(c)).toEqual(new Set());
  });
});

describe("2. status = active", () => {
  it("flagged / retired は落ちる", () => {
    expect(reason(q({ id: "f-d2-q002", status: "flagged" }), practice)).toBe("status");
    expect(reason(q({ id: "f-d2-q003", status: "retired" }), practice)).toBe("status");
    expect(reason(q({ id: "f-d2-q003", status: "retired" }), drill)).toBe("status");
  });
});

describe("3. 現行 rev の未解決フラグ", () => {
  it("現行 rev の open フラグがあれば落ちる", () => {
    expect(reason(free, practice, ctx({ flags: [flag()] }))).toBe("open_flag");
    expect(reason(free, drill, ctx({ flags: [flag()] }))).toBe("open_flag");
  });

  it("resolved 済みフラグは落とさない", () => {
    const c = ctx({ flags: [flag({ resolvedAt: new Date("2026-08-20T00:00:00+09:00") })] });
    expect(allowed(free, practice, c)).toBe(true);
  });

  it("旧 rev の open フラグは superseded として落とさない", () => {
    const rev2 = q({ id: "f-d2-q001", rev: 2 });
    expect(allowed(rev2, practice, ctx({ flags: [flag({ questionRev: 1 })] }))).toBe(true);
    expect(reason(rev2, practice, ctx({ flags: [flag({ questionRev: 2 })] }))).toBe("open_flag");
  });

  it("他問題のフラグは影響しない", () => {
    expect(allowed(free, practice, ctx({ flags: [flag({ questionId: "f-d2-q999" })] }))).toBe(true);
  });

  it("status より後、mode より先に評価される", () => {
    const retired = q({ id: "f-d2-q001", status: "retired" });
    expect(reason(retired, practice, ctx({ flags: [flag()] }))).toBe("status");
    const noDrill = q({ id: "f-d2-q001", eligible_modes: ["practice"] });
    expect(reason(noDrill, drill, ctx({ flags: [flag()] }))).toBe("open_flag");
  });
});

describe("4. eligible_modes", () => {
  it("当該 mode を含まなければ落ちる", () => {
    const practiceOnly = q({ id: "f-d2-q004", eligible_modes: ["practice"] });
    expect(reason(practiceOnly, drill)).toBe("mode");
    expect(allowed(practiceOnly, practice)).toBe(true);
    const drillOnly = q({ id: "f-d2-q005", eligible_modes: ["drill"] });
    expect(reason(drillOnly, practice)).toBe("mode");
    expect(reason(drillOnly, miniD2)).toBe("mode");
  });

  it("mock の判定は mode=mock を見る(full / domain_mini とも)", () => {
    const mockOnly = q({ id: "f-d2-q006", eligible_modes: ["mock"] });
    expect(allowed(mockOnly, miniD2)).toBe(true);
    expect(reason(mockOnly, practice)).toBe("mode");
  });
});

describe("5. SRS 文脈の srs_eligible", () => {
  const notSrs = q({ id: "f-d2-q007", srs_eligible: false });

  it("drill は常に srs_eligible を要求する(非収載でも)", () => {
    expect(reason(notSrs, drill)).toBe("srs");
    expect(allowed(q({ id: "f-d2-q008" }), drill)).toBe(true);
  });

  it("practice は既定で srs_eligible=false も通し、srs:true のときだけ要求する", () => {
    expect(allowed(notSrs, practice)).toBe(true);
    expect(reason(notSrs, { mode: "practice", srs: true })).toBe("srs");
    expect(allowed(notSrs, { mode: "practice", srs: false })).toBe(true);
  });

  it("mode より後に評価される", () => {
    const drillLess = q({ id: "f-d2-q009", srs_eligible: false, eligible_modes: ["practice"] });
    expect(reason(drillLess, drill)).toBe("mode");
  });
});

describe("domain mini の追加除外", () => {
  it("form 収載問題は提出済みでも候補にならない", () => {
    const c = ctx({ sessions: [session()] });
    expect(reason(inA, miniD1, c)).toBe("mini_form_excluded");
    expect(reason(inA, miniD1)).toBe("holdout"); // 未提出なら holdout が先に効く
  });

  it("domain が一致しない問題は候補にならない", () => {
    const d2Mock = q({ id: "f-d2-q010", eligible_modes: ["mock"] });
    expect(reason(d2Mock, miniD1)).toBe("domain");
    expect(allowed(d2Mock, miniD2)).toBe(true);
  });

  it("フォーム非収載でもシナリオ問題(scenario_id != null)は独立 MCQ プールではないので候補にならない", () => {
    const scenarioMcq = q({
      id: "f-d1-q901",
      domain_id: "f-d1",
      primary_topic_id: "f-d1-t1-01",
      scenario_id: "sc-9",
      eligible_modes: ["mock", "practice"],
    });
    expect(reason(scenarioMcq, miniD1)).toBe("scenario");
    expect(allowed(scenarioMcq, practice)).toBe(true);
  });

  it("非収載・active・mock 可の独立 MCQ は通る(scenario_id=null)", () => {
    const d1Mock = q({
      id: "f-d1-q900",
      domain_id: "f-d1",
      primary_topic_id: "f-d1-t1-01",
      eligible_modes: ["mock", "practice"],
    });
    expect(allowed(d1Mock, miniD1)).toBe(true);
  });
});

describe("filterPool: 混合バンクで漏れ 0", () => {
  const bank: Question[] = [
    ...formAIds.map((id) => formQuestion(id)),
    ...formBIds.map((id) => formQuestion(id)),
    free,
    q({ id: "f-d1-q900", domain_id: "f-d1", primary_topic_id: "f-d1-t1-01", eligible_modes: ["mock", "practice"] }),
    q({ id: "f-d2-q011", status: "retired" }),
  ];
  const formSet = new Set([...formAIds, ...formBIds]);

  it("未提出時の practice / drill 候補に form 収載問題が 0 件", () => {
    for (const query of [practice, drill, { mode: "practice", srs: true } as PoolQuery]) {
      const ids = filterPool(bank, query, ctx()).map((x) => x.id);
      expect(ids.filter((id) => formSet.has(id))).toHaveLength(0);
      expect(ids).toContain("f-d2-q001");
      expect(ids).not.toContain("f-d2-q011");
    }
  });

  it("form-a 提出後は form-a の 60 問だけが practice に出て、form-b は出ない", () => {
    const ids = filterPool(bank, practice, ctx({ sessions: [session()] })).map((x) => x.id);
    expect(formAIds.every((id) => ids.includes(id))).toBe(true);
    expect(ids.filter((id) => formBIds.includes(id))).toHaveLength(0);
    // drill には srs_eligible=false のため依然出ない
    const drillIds = filterPool(bank, drill, ctx({ sessions: [session()] })).map((x) => x.id);
    expect(drillIds.filter((id) => formSet.has(id))).toHaveLength(0);
  });

  it("form-a の full 実施ではちょうど form-a の 60 問が通る(非収載の mock 可問題は not_in_form)", () => {
    const ids = filterPool(bank, fullA, ctx()).map((x) => x.id);
    expect(new Set(ids)).toEqual(new Set(formAIds));
    expect(reason(bank[bank.length - 2], fullA)).toBe("not_in_form");
  });

  it("domain mini(f-d1)は提出済みでも form 収載問題を含まない", () => {
    const ids = filterPool(bank, miniD1, ctx({ sessions: [session()] })).map((x) => x.id);
    expect(ids).toEqual(["f-d1-q900"]);
  });

  it("filterPool は入力順を保つ", () => {
    const ids = filterPool([free, bank[bank.length - 2]], practice, ctx()).map((x) => x.id);
    expect(ids).toEqual(["f-d2-q001", "f-d1-q900"]);
  });
});

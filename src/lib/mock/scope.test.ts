import { describe, expect, it } from "vitest";
import { mockFormSchema, type MockForm, type Question, type Scenario } from "@/lib/bank/schema";
import { combineExamBanks } from "@/lib/bank/runtime";
import { mcq } from "@/lib/queue/test-fixtures";
import { mockBankContext, startFormsFor } from "./context";
import { restoreCurrent, saveAnswer, startFullMock, submitSession, type MockDeps } from "./lifecycle";
import { sessionPayload } from "./server";
import { FakeMockStore } from "./test-store";

// T-exam: 進行中セッションは学習スコープに依存しない / 開始候補だけがスコープ内 exam
// (specs/03 §exam_session v1.3、01 FR-5 / FR-10)

const NOW = new Date("2026-10-01T10:00:00+09:00");
const LATER = (min: number) => new Date(NOW.getTime() + min * 60_000);

const formQuestions = (prefix: "f" | "p"): Question[] =>
  Array.from({ length: 60 }, (_, i) =>
    mcq(`${prefix}-d1-q${String(i + 1).padStart(3, "0")}`, {
      exam: prefix === "f" ? "ccar-f" : "ccar-p",
      scenario_id: "sc-1", // シナリオ id は exam 内で一意(F と P で同名があってよい)
      eligible_modes: ["mock", "practice"],
      srs_eligible: false,
    }),
  );
const fQs = formQuestions("f");
const pQs = formQuestions("p");
const form = (id: string, exam: "ccar-f" | "ccar-p", qs: readonly Question[]): MockForm =>
  mockFormSchema.parse({ id, exam, scenario_ids: ["sc-1"], question_ids: qs.map((q) => q.id) });
const scenario = (title: string): Scenario[] => [{ id: "sc-1", title_en: title, context_en: `${title} context`, refs: [] }];

const multi = combineExamBanks([
  { exam: "ccar-f", questions: fQs, forms: [form("form-a", "ccar-f", fQs)], syllabus: null, scenarios: scenario("F scenario") },
  {
    exam: "ccar-p",
    questions: pQs,
    forms: [form("form-a", "ccar-p", pQs)], // F と同名の form-a
    syllabus: null,
    scenarios: scenario("P scenario"),
  },
]);
const ctx = mockBankContext(multi);

let seq = 0;
const deps = (store: FakeMockStore, now = NOW): MockDeps => ({
  store,
  findQuestion: ctx.findQuestion,
  now,
  newSessionId: () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`,
});

describe("開始候補はスコープ内 exam のフォームだけ", () => {
  it("startFormsFor: ccar-f / ccar-p / both", () => {
    const keys = (s: "ccar-f" | "ccar-p" | "both") => startFormsFor(ctx.forms, s).map((f) => `${f.exam}:${f.id}`);
    expect(keys("ccar-f")).toEqual(["ccar-f:form-a"]);
    expect(keys("ccar-p")).toEqual(["ccar-p:form-a"]);
    expect(keys("both")).toEqual(["ccar-f:form-a", "ccar-p:form-a"]);
  });

  it("scope ccar-f で form-a を開始すると F の form-a(P の同名 form は候補外)", async () => {
    const store = new FakeMockStore();
    const r = await startFullMock("form-a", startFormsFor(ctx.forms, "ccar-f"), [], [], deps(store));
    expect(r.status).toBe(201);
    if (r.status !== 201) return;
    expect(r.session.exam).toBe("ccar-f");
    expect(r.session.questionIds[0]).toBe("f-d1-q001");
  });

  it("scope both で同名 form が複数 exam にあると開始しない(fail closed。exam 指定は D6-4)", async () => {
    const store = new FakeMockStore();
    const r = await startFullMock("form-a", startFormsFor(ctx.forms, "both"), [], [], deps(store));
    expect(r).toEqual({ status: 409, error: "ambiguous_form" });
    expect(store.sessions.size).toBe(0);
  });

  it("未提出判定・推奨は開始対象 form の exam 内で行う(F の提出状態が P の推奨に影響しない)", async () => {
    const store = new FakeMockStore();
    const fSubmitted = [{ exam: "ccar-f", kind: "full", formId: "form-a", status: "submitted" }] as const;
    const r = await startFullMock("form-a", startFormsFor(ctx.forms, "ccar-p"), fSubmitted, [], deps(store));
    expect(r.status).toBe(201); // P の form-a は P で唯一の未実施フォーム = 推奨どおり
  });
});

describe("進行中セッションはスコープ切替後も復元・回答・提出できる", () => {
  it("P で開始 → スコープを F に切替(開始候補から P が消える)→ P セッションを復元・回答・提出", async () => {
    const store = new FakeMockStore();
    const started = await startFullMock("form-a", startFormsFor(ctx.forms, "ccar-p"), [], [], deps(store));
    expect(started.status).toBe(201);
    if (started.status !== 201) return;
    expect(started.session.exam).toBe("ccar-p");

    // スコープ F: 新規開始の候補に P は無い
    expect(startFormsFor(ctx.forms, "ccar-f").some((f) => f.exam === "ccar-p")).toBe(false);

    // 復元はスコープを見ない
    const restored = await restoreCurrent(deps(store, LATER(5)));
    expect(restored).toMatchObject({ status: 200, kind: "in_progress" });
    if (restored.status !== 200 || restored.kind !== "in_progress") return;
    expect(restored.session.id).toBe(started.session.id);

    // 出題 DTO とシナリオはセッションの exam(P)側で解決する(同名 sc-1 の F 版を出さない)
    const payload = sessionPayload(restored.session, restored.answers, { deps: deps(store), forms: ctx.forms, scenariosFor: ctx.scenariosFor });
    expect(payload).not.toBeNull();
    expect(payload!.scenarios).toEqual([{ id: "sc-1", title_en: "P scenario", context_en: "P scenario context" }]);

    const saved = await saveAnswer(started.session.id, "p-d1-q001", { chosen: ["B"] }, deps(store, LATER(6)));
    expect(saved.status).toBe(200);
    const submitted = await submitSession(started.session.id, deps(store, LATER(10)));
    expect(submitted.status).toBe(200);
    expect(store.sessions.get(started.session.id)?.status).toBe("submitted");
    expect(store.attempts).toHaveLength(60);
    expect(store.attempts.filter((a) => a.isCorrect)).toHaveLength(1);
  });

  it("F で開始 → スコープを P に切替 → F セッションを提出できる(逆方向)", async () => {
    const store = new FakeMockStore();
    const started = await startFullMock("form-a", startFormsFor(ctx.forms, "ccar-f"), [], [], deps(store));
    if (started.status !== 201) throw new Error("開始失敗");
    expect(startFormsFor(ctx.forms, "ccar-p").some((f) => f.exam === "ccar-f")).toBe(false);
    expect((await saveAnswer(started.session.id, "f-d1-q002", { chosen: ["B"] }, deps(store, LATER(1)))).status).toBe(200);
    expect((await submitSession(started.session.id, deps(store, LATER(2)))).status).toBe(200);
  });
});

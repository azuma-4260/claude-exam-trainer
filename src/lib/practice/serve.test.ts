import { describe, expect, it } from "vitest";
import type { AttemptRow } from "@/db/schema";
import { processAnswer, type AnswerDeps, type AnswerStore, AttemptPkConflictError } from "@/lib/answer/process";
import type { PoolContext } from "@/lib/bank/pool";
import type { MockForm, Question } from "@/lib/bank/schema";
import type { QueueItem } from "@/lib/queue/build";
import { emptyCtx, mcq } from "@/lib/queue/test-fixtures";
import type { SrsStateUpsert } from "@/lib/srs/card-row";
import { assemblePracticeView, PRACTICE_BATCH_MAX, type PracticeAssembleInputs } from "./serve";

// D2-1: Practice の出題組み立て(specs/01 FR-4、03 §出題プールの判定順序、05 S-4)。
// 第 1 層 = 日次キューの practice-mode 項目(キュー順)、第 2 層 = FR-4 プールの追補
// (当日キュー全項目・当日回答済みを除外し、id 昇順 + 同一シナリオ隣接)。

const bankOf = (questions: Question[], forms: MockForm[] = []) => ({
  questions,
  forms,
  byId: new Map(questions.map((q) => [q.id, q])),
});

const queueItem = (questionId: string): QueueItem => ({ questionId, source: "due", estSec: 120, mode: "practice" });

const assemble = (over: Partial<PracticeAssembleInputs> & Pick<PracticeAssembleInputs, "bank">) =>
  assemblePracticeView({
    poolCtx: emptyCtx(over.bank.forms),
    scenarios: null,
    practiceQueue: [],
    excludeIds: new Set(),
    ...over,
  });

/** 60 問収載の full form(先頭だけ実問、残りはダミー id) */
const formIds = Array.from({ length: 60 }, (_, i) => `f-d1-q${String(900 + i)}`);
const formA: MockForm = { id: "form-a", exam: "ccar-f", scenario_ids: ["sc-1"], question_ids: formIds };
const formQ = mcq(formIds[0], { scenario_id: "sc-1", eligible_modes: ["mock", "practice"], srs_eligible: false });
const submittedA = { exam: "ccar-f", formId: "form-a", kind: "full", status: "submitted" } as const;

describe("assemblePracticeView: プール判定(FR-4 / holdout)", () => {
  it("空バンク → bank_empty", () => {
    expect(assemble({ bank: bankOf([]) })).toEqual({ kind: "bank_empty" });
  });

  it("未提出フォーム収載問題は出ない(holdout)。提出後は released:true で出る", () => {
    const bank = bankOf([formQ], [formA]);
    expect(assemble({ bank, poolCtx: { forms: [formA], sessions: [], flags: [] } })).toEqual({ kind: "empty" });

    const view = assemble({ bank, poolCtx: { forms: [formA], sessions: [submittedA], flags: [] } });
    expect(view.kind).toBe("ok");
    if (view.kind !== "ok") return;
    expect(view.items).toHaveLength(1);
    expect(view.items[0]).toMatchObject({ questionId: formQ.id, released: true, source: "pool" });
  });

  it("独立 MCQ・Practice 専用シナリオ MCQ は released:false で出る。flash / retired / open_flag / mode 不一致は出ない", () => {
    const solo = mcq("f-d1-q001");
    const scenario = mcq("f-d1-q002", { scenario_id: "sc-x" });
    const retired = mcq("f-d1-q003", { status: "retired" });
    const flagged = mcq("f-d1-q004");
    const drillOnly = mcq("f-d1-q005", { eligible_modes: ["drill"] });
    const bank = bankOf([solo, scenario, retired, flagged, drillOnly]);
    const view = assemble({
      bank,
      poolCtx: { forms: [], sessions: [], flags: [{ questionId: flagged.id, questionRev: flagged.rev, resolvedAt: null }] },
    });
    if (view.kind !== "ok") throw new Error("ok のはず");
    expect(view.items.map((i) => i.questionId)).toEqual([solo.id, scenario.id]);
    expect(view.items.every((i) => !i.released)).toBe(true);
  });
});

describe("assemblePracticeView: 2 層構成と順序", () => {
  it("日次キューの practice 項目が第 1 層としてキュー順で先頭に来る(source: queue)", () => {
    const q1 = mcq("f-d1-q010", { scenario_id: "sc-a" });
    const q2 = mcq("f-d1-q011", { scenario_id: "sc-a" });
    const extra = mcq("f-d1-q001");
    const bank = bankOf([extra, q1, q2]);
    const view = assemble({
      bank,
      practiceQueue: [queueItem(q2.id), queueItem(q1.id)],
      excludeIds: new Set([q1.id, q2.id]), // 呼び出し側はキュー全項目を除外集合にも入れる(二重掲載防止はどちらでも成立)
    });
    if (view.kind !== "ok") throw new Error("ok のはず");
    expect(view.items.map((i) => [i.questionId, i.source])).toEqual([
      [q2.id, "queue"],
      [q1.id, "queue"],
      [extra.id, "pool"],
    ]);
  });

  it("excludeIds(当日回答済み・キュー drill 項目)は第 2 層に出ない → 再フェッチでバッチが先へ進む", () => {
    const questions = Array.from({ length: 5 }, (_, i) => mcq(`f-d1-q00${i + 1}`));
    const bank = bankOf(questions);
    const first = assemble({ bank });
    if (first.kind !== "ok") throw new Error("ok のはず");
    expect(first.items.map((i) => i.questionId)).toEqual(questions.map((q) => q.id));

    // 先頭 2 問を当日回答済みにすると、同じ組み立てでも残り 3 問に進む(先頭固定化しない)
    const after = assemble({ bank, excludeIds: new Set([questions[0].id, questions[1].id]) });
    if (after.kind !== "ok") throw new Error("ok のはず");
    expect(after.items.map((i) => i.questionId)).toEqual(questions.slice(2).map((q) => q.id));
  });

  it("第 2 層は id 昇順 + 同一 scenario_id の設問を初出順で隣接させる", () => {
    const bank = bankOf([
      mcq("f-d1-q004", { scenario_id: "sc-b" }),
      mcq("f-d1-q001", { scenario_id: "sc-a" }),
      mcq("f-d1-q003", { scenario_id: "sc-a" }),
      mcq("f-d1-q002"),
    ]);
    const view = assemble({ bank });
    if (view.kind !== "ok") throw new Error("ok のはず");
    // id 昇順の初出順: sc-a(q001)→ solo(q002)→ sc-a の残り(q003)を q001 に隣接 → sc-b(q004)
    expect(view.items.map((i) => i.questionId)).toEqual(["f-d1-q001", "f-d1-q003", "f-d1-q002", "f-d1-q004"]);
  });

  it("バッチは PRACTICE_BATCH_MAX 件で切り、残数を remainingAfterBatch で返す", () => {
    const questions = Array.from({ length: PRACTICE_BATCH_MAX + 3 }, (_, i) => mcq(`f-d1-q${String(101 + i)}`));
    const view = assemble({ bank: bankOf(questions) });
    if (view.kind !== "ok") throw new Error("ok のはず");
    expect(view.items).toHaveLength(PRACTICE_BATCH_MAX);
    expect(view.remainingAfterBatch).toBe(3);
  });
});

describe("assemblePracticeView: シナリオ DTO", () => {
  it("items のシナリオ id を初出順で DTO 化する。scenarios.yaml 不在(null)は title/context が null で落ちない", () => {
    const bank = bankOf([mcq("f-d1-q001", { scenario_id: "sc-a" }), mcq("f-d1-q002")]);
    const view = assemble({ bank, scenarios: null });
    if (view.kind !== "ok") throw new Error("ok のはず");
    expect(view.scenarios).toEqual([{ id: "sc-a", title_en: null, context_en: null }]);
  });

  it("scenarios.yaml があれば本文を通す(C3a 契約は passthrough のため文字列のみ拾う)", () => {
    const bank = bankOf([mcq("f-d1-q001", { scenario_id: "sc-a" })]);
    const view = assemble({
      bank,
      scenarios: [{ id: "sc-a", title_en: "Rollout at Acme", context_en: "Acme deploys Claude..." } as never],
    });
    if (view.kind !== "ok") throw new Error("ok のはず");
    expect(view.scenarios).toEqual([{ id: "sc-a", title_en: "Rollout at Acme", context_en: "Acme deploys Claude..." }]);
  });
});

// ---- DoD 貫通テスト: 出題組み立て → 保存経路(processAnswer)を同一 fixture で貫通 ----

class FakeStore implements AnswerStore {
  attempts = new Map<string, AttemptRow>();
  srs = new Map<string, SrsStateUpsert>();
  async findAttempt(id: string) {
    return this.attempts.get(id) ?? null;
  }
  async findSrsState(qid: string) {
    return this.srs.get(qid) ?? null;
  }
  async commit(attempt: AttemptRow, srs: SrsStateUpsert | null) {
    if (this.attempts.has(attempt.attemptId)) throw new AttemptPkConflictError();
    this.attempts.set(attempt.attemptId, attempt);
    if (srs) this.srs.set(srs.questionId, srs);
  }
}

describe("DoD: 提出済み session + 解放問題で applied_rating=null(specs/09 D2-1)", () => {
  it("Practice が提示した解放問題を mode=practice で保存すると appliedRating=null・srs_state 非生成", async () => {
    const poolCtx: PoolContext = { forms: [formA], sessions: [submittedA], flags: [] };
    const bank = bankOf([formQ, mcq("f-d1-q001")], [formA]);
    const view = assemble({ bank, poolCtx });
    if (view.kind !== "ok") throw new Error("ok のはず");
    const served = view.items.find((i) => i.questionId === formQ.id);
    expect(served).toMatchObject({ released: true });

    const store = new FakeStore();
    const deps: AnswerDeps = {
      store,
      findQuestion: (id) => bank.byId.get(id) ?? null,
      poolContext: async () => poolCtx,
      now: new Date("2026-08-27T08:00:00+09:00"),
    };
    const res = await processAnswer(
      {
        kind: "mcq",
        attempt_id: "33333333-3333-4333-8333-333333333333",
        question_id: served!.questionId,
        question_rev: served!.rev,
        mode: "practice",
        chosen: served!.answer,
        elapsed_ms: 900,
      },
      deps,
    );
    expect(res.status).toBe(200);
    if (res.status !== 200) return;
    expect(res.attempt.appliedRating).toBeNull();
    expect(res.attempt.isCorrect).toBe(true);
    expect(res.srs).toBeNull();
    expect(store.srs.size).toBe(0);
  });

  it("srs_eligible=true の Practice 問題は appliedRating が入り srs_state が生成される(対照)", async () => {
    const solo = mcq("f-d1-q001");
    const bank = bankOf([solo]);
    const view = assemble({ bank });
    if (view.kind !== "ok") throw new Error("ok のはず");
    const store = new FakeStore();
    const res = await processAnswer(
      {
        kind: "mcq",
        attempt_id: "44444444-4444-4444-8444-444444444444",
        question_id: view.items[0].questionId,
        question_rev: view.items[0].rev,
        mode: "practice",
        chosen: view.items[0].answer,
        elapsed_ms: null,
      },
      {
        store,
        findQuestion: (id) => bank.byId.get(id) ?? null,
        poolContext: async () => emptyCtx(),
        now: new Date("2026-08-27T08:00:00+09:00"),
      },
    );
    expect(res.status).toBe(200);
    if (res.status !== 200) return;
    expect(res.attempt.appliedRating).not.toBeNull();
    expect(store.srs.size).toBe(1);
  });
});

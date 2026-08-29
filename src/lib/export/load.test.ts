import { describe, expect, it } from "vitest";
import type { QuestionFlagRow } from "@/db/schema";
import { activeQuestionRevisions, filterCurrentOpenFlags } from "./load";

const flag = (overrides: Partial<QuestionFlagRow> = {}): QuestionFlagRow => ({
  id: crypto.randomUUID(),
  questionId: "f-d1-q001",
  questionRev: 2,
  reason: "ambiguous",
  memo: null,
  createdAt: new Date("2026-08-29T00:00:00.000Z"),
  resolvedAt: null,
  ...overrides,
});

describe("filterCurrentOpenFlags(specs/03 §question_flag, §3)", () => {
  it("未解決かつバンクの現行 rev と一致するフラグだけを返す", () => {
    const current = flag();
    expect(
      filterCurrentOpenFlags(
        [
          current,
          flag({ id: crypto.randomUUID(), questionRev: 1 }),
          flag({ id: crypto.randomUUID(), resolvedAt: new Date("2026-08-29T01:00:00.000Z") }),
          flag({ id: crypto.randomUUID(), questionId: "f-d1-q999" }),
        ],
        new Map([["f-d1-q001", 2]]),
      ),
    ).toEqual([current]);
  });

  it("retired・flagged の問題は現行 revision 集合から除外する", () => {
    expect(
      activeQuestionRevisions([
        { id: "f-d1-q001", rev: 2, status: "active" },
        { id: "f-d1-q002", rev: 1, status: "retired" },
        { id: "f-d1-q003", rev: 3, status: "flagged" },
      ]),
    ).toEqual(new Map([["f-d1-q001", 2]]));
  });
});

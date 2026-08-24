import { describe, expect, it } from "vitest";
import { rowToCard } from "@/lib/srs/card-row";
import { getRetrievability } from "@/lib/srs/scheduler";
import { NOW, flash, mcq, srsRow, syllabus } from "./test-fixtures";
import { DEFAULT_RETENTION, domainProficiencies, topicPriorities, topicProficiencies } from "./proficiency";

// T-queue: 習熟度(specs/04 §習熟度)。primary_topic_id のみで集計する。

describe("topicProficiencies", () => {
  it("未学習トピック(カード 0 件・正解 0)は 0.7×0.3 + 0.3×0 = 0.21", () => {
    const profs = topicProficiencies({
      questions: [flash("f-d1-q001")],
      syllabus,
      srsRows: [],
      correctQuestionIds: new Set(),
      now: NOW,
    });
    expect(profs.get("f-d1-t1-01")).toBeCloseTo(0.21, 10);
    // 問題が 1 問もないトピックも同じ既定値
    expect(profs.get("f-d1-t1-02")).toBeCloseTo(0.21, 10);
  });

  it("retention は SRS 導入済み active カードの retrievability 平均", () => {
    const q1 = flash("f-d1-q001");
    const q2 = flash("f-d1-q002");
    const r1 = srsRow("f-d1-q001", { stability: 30 });
    const r2 = srsRow("f-d1-q002", { stability: 1 });
    const expected =
      (getRetrievability(rowToCard(r1), NOW) + getRetrievability(rowToCard(r2), NOW)) / 2;
    const profs = topicProficiencies({
      questions: [q1, q2],
      syllabus,
      srsRows: [r1, r2],
      correctQuestionIds: new Set(),
      now: NOW,
    });
    expect(profs.get("f-d1-t1-01")).toBeCloseTo(0.7 * expected + 0.3 * 0, 10);
  });

  it("active でない問題のカードは retention に入れない", () => {
    const retired = flash("f-d1-q001", { status: "retired" });
    const profs = topicProficiencies({
      questions: [retired],
      syllabus,
      srsRows: [srsRow("f-d1-q001", { stability: 100 })],
      correctQuestionIds: new Set(),
      now: NOW,
    });
    // カード 0 件扱い → 既定値 0.3
    expect(profs.get("f-d1-t1-01")).toBeCloseTo(0.21, 10);
  });

  it("coverage は srs_eligible 問題のうち 1 回以上正解した割合", () => {
    const questions = [flash("f-d1-q001"), flash("f-d1-q002"), mcq("f-d1-q003", { srs_eligible: false })];
    const profs = topicProficiencies({
      questions,
      syllabus,
      srsRows: [],
      correctQuestionIds: new Set(["f-d1-q001", "f-d1-q003"]), // q003 は srs_eligible=false なので分母外
      now: NOW,
    });
    // retention 0.3(カードなし)+ coverage 1/2
    expect(profs.get("f-d1-t1-01")).toBeCloseTo(0.7 * DEFAULT_RETENTION + 0.3 * 0.5, 10);
  });
});

describe("domainProficiencies", () => {
  it("ドメインはトピックの単純平均", () => {
    const profs = new Map([
      ["f-d1-t1-01", 0.9],
      ["f-d1-t1-02", 0.5],
      ["f-d2-t1-01", 0.21],
    ]);
    const domains = domainProficiencies(syllabus, profs);
    expect(domains.get("f-d1")).toBeCloseTo(0.7, 10);
    expect(domains.get("f-d2")).toBeCloseTo(0.21, 10);
  });
});

describe("topicPriorities", () => {
  it("priority(topic) = domain_weight × (1 - proficiency(topic))", () => {
    const profs = new Map([
      ["f-d1-t1-01", 0.21],
      ["f-d1-t1-02", 0.9],
      ["f-d2-t1-01", 0.21],
    ]);
    const pr = topicPriorities(syllabus, profs);
    expect(pr.get("f-d1-t1-01")).toBeCloseTo(60 * 0.79, 10);
    expect(pr.get("f-d1-t1-02")).toBeCloseTo(60 * 0.1, 10);
    expect(pr.get("f-d2-t1-01")).toBeCloseTo(40 * 0.79, 10);
    // 未学習同士はドメイン重みの大小で決まる(specs/04 の意図した挙動)
    expect(pr.get("f-d1-t1-01")!).toBeGreaterThan(pr.get("f-d2-t1-01")!);
  });
});

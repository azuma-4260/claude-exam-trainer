import type { Question, Syllabus } from "@/lib/bank/schema";
import { rowToCard, type SrsStateUpsert } from "@/lib/srs/card-row";
import { CCAR_F_EXAM_DATE_JST, getRetrievability } from "@/lib/srs/scheduler";

/**
 * 習熟度(specs/04 §習熟度)。primary_topic_id のみで集計する。
 *
 *   proficiency(t) = 0.7 × retention(t) + 0.3 × coverage(t)
 *   retention(t)   = SRS 導入済み(committed srs_state)の active カードの retrievability 平均(0 件は 0.3)
 *   coverage(t)    = t 配下の srs_eligible 問題のうち 1 回以上正解した割合
 *
 * 未学習トピックは 0.7×0.3 + 0.3×0 = 0.21 となり、初期の優先度は概ねドメイン重みで決まる(意図した挙動)。
 */

export const DEFAULT_RETENTION = 0.3;

export type ProficiencyInputs = {
  questions: readonly Question[];
  syllabus: Syllabus;
  srsRows: readonly SrsStateUpsert[];
  /** is_correct=true の attempt が 1 件以上ある question id 集合(モード不問。flash は Hard 以上 = 正解) */
  correctQuestionIds: ReadonlySet<string>;
  now: Date;
  examDateJst?: string;
};

const mean = (xs: readonly number[]): number => xs.reduce((a, x) => a + x, 0) / xs.length;

/** syllabus の全トピック id を列挙する */
function topicsOf(syllabus: Syllabus): string[] {
  return syllabus.domains.flatMap((d) => d.task_statements.flatMap((t) => t.topics.map((tc) => tc.id)));
}

export function topicProficiencies(inputs: ProficiencyInputs): Map<string, number> {
  const { questions, syllabus, srsRows, correctQuestionIds, now } = inputs;
  const examDateJst = inputs.examDateJst ?? CCAR_F_EXAM_DATE_JST;
  const byId = new Map(questions.map((q) => [q.id, q]));

  // トピックごとの retrievability / coverage 分母分子を 1 パスで集める
  const retrievabilities = new Map<string, number[]>();
  for (const row of srsRows) {
    const q = byId.get(row.questionId);
    if (!q || q.status !== "active") continue; // active カードのみ
    const list = retrievabilities.get(q.primary_topic_id) ?? [];
    list.push(getRetrievability(rowToCard(row), now, examDateJst));
    retrievabilities.set(q.primary_topic_id, list);
  }
  const eligibleCount = new Map<string, number>();
  const correctCount = new Map<string, number>();
  for (const q of questions) {
    if (!q.srs_eligible) continue;
    eligibleCount.set(q.primary_topic_id, (eligibleCount.get(q.primary_topic_id) ?? 0) + 1);
    if (correctQuestionIds.has(q.id)) {
      correctCount.set(q.primary_topic_id, (correctCount.get(q.primary_topic_id) ?? 0) + 1);
    }
  }

  const result = new Map<string, number>();
  for (const topicId of topicsOf(syllabus)) {
    const rs = retrievabilities.get(topicId);
    const retention = rs && rs.length > 0 ? mean(rs) : DEFAULT_RETENTION;
    const denom = eligibleCount.get(topicId) ?? 0;
    const coverage = denom === 0 ? 0 : (correctCount.get(topicId) ?? 0) / denom;
    result.set(topicId, 0.7 * retention + 0.3 * coverage);
  }
  return result;
}

/** ドメイン proficiency はトピックの単純平均 */
export function domainProficiencies(syllabus: Syllabus, topicProfs: ReadonlyMap<string, number>): Map<string, number> {
  const result = new Map<string, number>();
  for (const d of syllabus.domains) {
    const topics = d.task_statements.flatMap((t) => t.topics.map((tc) => topicProfs.get(tc.id) ?? 0));
    result.set(d.id, topics.length === 0 ? 0 : mean(topics));
  }
  return result;
}

/** 新規の priority: priority(topic) = domain_weight × (1 - proficiency(topic)) */
export function topicPriorities(syllabus: Syllabus, topicProfs: ReadonlyMap<string, number>): Map<string, number> {
  const result = new Map<string, number>();
  for (const d of syllabus.domains) {
    for (const t of d.task_statements) {
      for (const tc of t.topics) {
        result.set(tc.id, d.weight * (1 - (topicProfs.get(tc.id) ?? 0)));
      }
    }
  }
  return result;
}

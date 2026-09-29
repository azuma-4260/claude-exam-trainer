import type { ExamSessionAnswerRow, ExamSessionRow, SubmissionReason } from "@/db/schema";
import { gradeMockAnswers, type AnswerKeyEntry, type MockStore } from "./lifecycle";

/**
 * MockStore の in-memory 実装。submit は store 契約(claim 成功時のみ attempt 生成)を
 * gradeMockAnswers で再現する(実 SQL の形は store.test.ts で検証)。
 */
export class FakeMockStore implements MockStore {
  sessions = new Map<string, ExamSessionRow>();
  answers = new Map<string, ExamSessionAnswerRow[]>();
  attempts: ReturnType<typeof gradeMockAnswers>["attempts"] = [];

  async findInProgress(): Promise<ExamSessionRow | null> {
    return [...this.sessions.values()].find((s) => s.status === "in_progress") ?? null;
  }
  async findSession(id: string): Promise<ExamSessionRow | null> {
    return this.sessions.get(id) ?? null;
  }
  async listAnswers(sessionId: string): Promise<ExamSessionAnswerRow[]> {
    return this.answers.get(sessionId) ?? [];
  }
  async createSession(session: ExamSessionRow, answers: ExamSessionAnswerRow[]): Promise<boolean> {
    // store 契約: 「進行中は 1 件」のチェックと作成を排他的・原子的に行う
    if ([...this.sessions.values()].some((s) => s.status === "in_progress")) return false;
    this.sessions.set(session.id, session);
    this.answers.set(session.id, answers.map((a) => ({ ...a })));
    return true;
  }
  async patchAnswer(sessionId: string, questionId: string, patch: { chosen?: string[] | null; flagged?: boolean }, now: Date): Promise<boolean> {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== "in_progress") return false; // 条件付き UPDATE: terminal 後は 0 行
    const row = this.answers.get(sessionId)?.find((a) => a.questionId === questionId);
    if (!row) return false;
    if (patch.chosen !== undefined) {
      row.chosen = patch.chosen;
      row.answerUpdatedAt = now;
    }
    if (patch.flagged !== undefined) row.flagged = patch.flagged;
    row.updatedAt = now;
    return true;
  }
  async savePosition(sessionId: string, currentIndex: number): Promise<boolean> {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== "in_progress") return false;
    s.currentIndex = currentIndex;
    return true;
  }
  async submit(sessionId: string, reason: SubmissionReason, finishedAt: Date, key: AnswerKeyEntry[]): Promise<boolean> {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== "in_progress") return false; // claim 0 行 → 副作用なし
    const graded = gradeMockAnswers(this.answers.get(sessionId) ?? [], key, finishedAt);
    s.status = "submitted";
    s.submissionReason = reason;
    s.finishedAt = finishedAt;
    s.scoreRaw = graded.scoreRaw;
    this.attempts.push(...graded.attempts.map((a) => ({ ...a, sessionId })));
    return true;
  }
  async abandon(sessionId: string, finishedAt: Date): Promise<boolean> {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== "in_progress") return false;
    s.status = "abandoned";
    s.finishedAt = finishedAt;
    return true;
  }
}

import { existsSync } from "node:fs";
import path from "node:path";
import type { StudyScope } from "@/lib/scope/scope";
import { scopeExams } from "@/lib/scope/scope";
import { bankDir, loadBankFrom, type Bank } from "./load";
import { EXAMS, type Exam, type MockForm, type Question, type Scenario, type Syllabus } from "./schema";
import { loadScenarios, loadSyllabus } from "./syllabus";

/**
 * 実行時の多試験バンク(specs/03 §1 v1.3、01 FR-10)。
 * content/<exam>/ を exam ごとに読み、和集合(all)とスコープ内の部分集合(scopeBank)を作る。
 * - 回答保存・進行中模試の復元 / 提出・export・フラグ一覧は all(スコープ非依存)
 * - 新規の出題選定(キュー・Drill / Practice・間違いノート・Stats・模試の開始候補)は scopeBank
 * バンクの静的検証(validate-bank / audit)の多試験化は D6-3 の責務。
 */

export type ExamBank = {
  exam: Exam;
  questions: readonly Question[];
  forms: readonly MockForm[];
  /** syllabus.yaml が無い(未整備の exam)なら null = ドメイン・トピック無し */
  syllabus: Syllabus | null;
  scenarios: readonly Scenario[] | null;
};

export type MultiBank = {
  /** EXAMS の定義順。バンクが無い exam も空で並ぶ */
  exams: readonly ExamBank[];
  get(exam: Exam): ExamBank;
  /** 全 exam の和集合(question id は exam 接頭辞で全体一意) */
  all: Bank;
};

const emptyExamBank = (exam: Exam): ExamBank => ({ exam, questions: [], forms: [], syllabus: null, scenarios: null });

/** exam ごとのバンクを束ねる。ディレクトリの exam と中身の exam の不一致・id 重複は fail closed */
export function combineExamBanks(list: readonly ExamBank[]): MultiBank {
  const byExam = new Map<Exam, ExamBank>();
  for (const b of list) {
    if (byExam.has(b.exam)) throw new Error(`exam が重複: ${b.exam}`);
    for (const q of b.questions) {
      if (q.exam !== b.exam) throw new Error(`${b.exam} のバンクに別 exam の問題: ${q.id}(${q.exam})`);
    }
    for (const f of b.forms) {
      if (f.exam !== b.exam) throw new Error(`${b.exam} のバンクに別 exam のフォーム: ${f.id}(${f.exam})`);
    }
    if (b.syllabus && b.syllabus.exam !== b.exam) throw new Error(`${b.exam} の syllabus.exam が ${b.syllabus.exam}`);
    byExam.set(b.exam, b);
  }
  const exams = EXAMS.map((e) => byExam.get(e) ?? emptyExamBank(e));
  const questions = exams.flatMap((b) => b.questions);
  const byId = new Map<string, Question>();
  for (const q of questions) {
    if (byId.has(q.id)) throw new Error(`question id 重複: ${q.id}`);
    byId.set(q.id, q);
  }
  const lookup = new Map(exams.map((b) => [b.exam, b]));
  return {
    exams,
    get: (exam) => lookup.get(exam)!,
    all: { questions, forms: exams.flatMap((b) => b.forms), byId },
  };
}

/** content/<exam>/ を読む。ディレクトリや syllabus.yaml が無い exam は空バンク(P の整備前) */
export function loadExamBank(exam: Exam): ExamBank {
  const dir = bankDir(exam);
  if (!existsSync(dir)) return emptyExamBank(exam);
  const bank = loadBankFrom(dir);
  const hasSyllabus = existsSync(path.join(dir, "syllabus.yaml"));
  if (!hasSyllabus && bank.questions.length > 0) {
    throw new Error(`${exam}: 問題があるのに syllabus.yaml が無い(${dir})`);
  }
  return {
    exam,
    questions: bank.questions,
    forms: bank.forms,
    syllabus: hasSyllabus ? loadSyllabus(dir) : null,
    scenarios: loadScenarios(dir),
  };
}

let cached: MultiBank | null = null;

/** プロセス内キャッシュ(バンクは deploy 単位で不変) */
export function loadMultiBank(): MultiBank {
  cached ??= combineExamBanks(EXAMS.map(loadExamBank));
  return cached;
}

export type ScopedBank = {
  scope: StudyScope;
  exams: readonly ExamBank[];
  /**
   * 新規出題の選定用。questions / byId はスコープ内 exam のみ(出題プール判定 段 0)。
   * forms は holdout 判定と「模試出題済み」表示のため全 exam(問題 id が exam 一意なので混ざらない)
   */
  bank: Bank;
  /** スコープ内 exam の syllabus(未整備の exam は含まない) */
  syllabi: readonly Syllabus[];
  /** スコープ内 exam の scenarios を連結(未整備なら null) */
  scenarios: readonly Scenario[] | null;
};

export function scopeBank(multi: MultiBank, scope: StudyScope): ScopedBank {
  const exams = scopeExams(scope).map((e) => multi.get(e));
  const questions = exams.flatMap((b) => b.questions);
  const scenarioLists = exams.map((b) => b.scenarios).filter((s): s is readonly Scenario[] => s !== null);
  return {
    scope,
    exams,
    bank: { questions, forms: multi.all.forms, byId: new Map(questions.map((q) => [q.id, q])) },
    syllabi: exams.map((b) => b.syllabus).filter((s): s is Syllabus => s !== null),
    scenarios: scenarioLists.length === 0 ? null : scenarioLists.flat(),
  };
}

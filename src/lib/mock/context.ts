import type { MultiBank } from "@/lib/bank/runtime";
import type { Exam, MockForm, Question, Scenario } from "@/lib/bank/schema";
import { inScope, type StudyScope } from "@/lib/scope/scope";

/**
 * 模試のバンク参照(specs/03 §exam_session v1.3)。
 * 進行中セッションの復元・回答保存・提出は学習スコープに依存しない: 問題は全 exam の和集合から、
 * シナリオはセッションの exam から引く(シナリオ id は exam 内でのみ一意)。
 * 学習スコープは新規開始の候補(startFormsFor)にだけ適用する。
 */
export interface MockBankContext {
  findQuestion: (id: string) => Question | null;
  /** 全 exam のフォーム(holdout・提出状態の判定用) */
  forms: readonly MockForm[];
  scenariosFor: (exam: Exam) => readonly Scenario[] | null;
}

export function mockBankContext(multi: MultiBank): MockBankContext {
  return {
    findQuestion: (id) => multi.all.byId.get(id) ?? null,
    forms: multi.all.forms,
    scenariosFor: (exam) => multi.get(exam).scenarios,
  };
}

/** full の開始候補: 学習スコープ内 exam のフォーム(定義順) */
export function startFormsFor(forms: readonly MockForm[], scope: StudyScope): MockForm[] {
  return forms.filter((f) => inScope(scope, f.exam));
}

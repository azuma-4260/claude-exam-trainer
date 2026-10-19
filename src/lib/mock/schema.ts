import { z } from "zod";
import { domainIdSchema, examSchema, formIdSchema } from "@/lib/bank/schema";

/** Mock API のリクエストスキーマ(specs/03 §exam_session、05 S-5) */

/** "" は mcq_bundle の未回答小問だけが持つ(specs/03 §1)。形式別の検証(重複・長さ)は saveAnswer で行う */
const choiceLabelSchema = z.string().regex(/^[A-F]?$/);

/**
 * full 開始。フォームは `(exam, form_id)` でクライアントが明示指定する(03 §exam_session v1.3.2、D6-4)。
 * availability 検証・自動選択は D3-2
 */
export const startMockRequestSchema = z.object({ exam: examSchema, form_id: formIdSchema }).strict();
/** domain mini 開始(D4-1)。問題選定はサーバー(独立 MCQ プールから抽出)。domain は exam 内の syllabus で検証する */
export const startMiniRequestSchema = z
  .object({ kind: z.literal("domain_mini"), exam: examSchema, domain_id: domainIdSchema })
  .strict();
export type StartMockRequest = z.infer<typeof startMockRequestSchema>;
export type StartMiniRequest = z.infer<typeof startMiniRequestSchema>;

/** 回答・見直しフラグの保存(どちらか一方以上)。chosen: null = 回答取り消し */
export const answerPatchRequestSchema = z
  .object({
    chosen: z.array(choiceLabelSchema).min(1).nullable().optional(),
    flagged: z.boolean().optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.chosen === undefined && p.flagged === undefined)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "chosen か flagged のどちらかが必要" });
  });
export type AnswerPatchRequest = z.infer<typeof answerPatchRequestSchema>;

export const positionRequestSchema = z.object({ current_index: z.number().int().min(0) }).strict();
export type PositionRequest = z.infer<typeof positionRequestSchema>;

export const sessionIdSchema = z.string().uuid();

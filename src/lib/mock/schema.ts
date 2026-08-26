import { z } from "zod";
import { formIdSchema } from "@/lib/bank/schema";

/** Mock API のリクエストスキーマ(specs/03 §exam_session、05 S-5) */

const choiceLabelSchema = z.string().regex(/^[A-F]$/);

/** full 開始。availability 検証・自動選択は D3-2(form_id はクライアント明示指定) */
export const startMockRequestSchema = z.object({ form_id: formIdSchema }).strict();
export type StartMockRequest = z.infer<typeof startMockRequestSchema>;

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
    if (p.chosen && new Set(p.chosen).size !== p.chosen.length)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["chosen"], message: "重複がある" });
  });
export type AnswerPatchRequest = z.infer<typeof answerPatchRequestSchema>;

export const positionRequestSchema = z.object({ current_index: z.number().int().min(0) }).strict();
export type PositionRequest = z.infer<typeof positionRequestSchema>;

export const sessionIdSchema = z.string().uuid();

import { z } from "zod";
import { FLAG_REASONS } from "@/lib/flags/reasons";
import { questionIdSchema } from "@/lib/bank/schema";

/**
 * 悪問フラグの入力(specs/03 §question_flag、01 FR-9)。
 * (question_id, question_rev) 単位、reason は 3 値、memo は任意。未知キーは拒否する。
 */
export const flagRequestSchema = z
  .object({
    question_id: questionIdSchema,
    question_rev: z.number().int().min(1),
    reason: z.enum(FLAG_REASONS),
    memo: z.string().nullish(),
  })
  .strict();

export type FlagRequest = z.infer<typeof flagRequestSchema>;

import { z } from "zod";
import { questionIdSchema } from "@/lib/bank/schema";

/**
 * 学習回答(drill / practice)の入力(specs/03 §学習回答の書込プロトコル、04 §モード行列)。
 * - attempt_id はクライアント生成 UUID(ACK 喪失リトライの冪等キー)
 * - chosen の重複拒否は問題形式に依存するため processAnswer で行う(mcq_bundle は重複可・小問数と同じ長さ。specs/03 §1)
 * - flash は利用者の 4 択評価(rating)、MCQ は chosen(サーバーが正誤と rating を確定)
 * - mock はこの API を通らない(提出時一括生成、03 §Mock の attempt 生成)
 */
const common = {
  attempt_id: z.string().uuid(),
  question_id: questionIdSchema,
  question_rev: z.number().int().min(1),
  mode: z.enum(["drill", "practice"]),
  elapsed_ms: z.number().int().min(0).nullable().optional(),
};

export const answerRequestSchema = z.discriminatedUnion("kind", [
  z.object({ ...common, kind: z.literal("flash"), rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]) }).strict(),
  z.object({ ...common, kind: z.literal("mcq"), chosen: z.array(z.string().min(1)).min(1) }).strict(),
]);

export type AnswerRequest = z.infer<typeof answerRequestSchema>;

import { defineConfig } from "drizzle-kit";

// specs/06: Drizzle + Neon。migration は `npm run db:generate` で生成し、
// 適用は `npm run db:migrate`(DATABASE_URL の指す branch に適用)。
// dev → smoke test → production の順で直列に適用する(cutover 後は追加のみ)。
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // db:generate は DB 接続不要。db:migrate 時のみ必須
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});

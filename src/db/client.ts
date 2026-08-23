import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * 進捗 DB への接続(specs/06 §接続方式)。
 * Neon HTTP driver のみを使い、長寿命 TCP プールは持たない。リクエストごとに
 * 軽量な HTTP クライアントを組む(neon() はコネクションを保持しない)。
 * write 系ハンドラ(D1-3 回答 API / D1-6 フラグ API / Mock)はこの getDb() を共用する。
 */
export type Db = NeonHttpDatabase<typeof schema>;

export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL が設定されていない");
  return drizzle(neon(url), { schema });
}

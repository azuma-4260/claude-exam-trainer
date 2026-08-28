import { questionIdSchema } from "@/lib/bank/schema";

/** URL から同一周回の提示済み ID を復元する。壊れた値は fail safe で無視する。 */
export function parseReviewSeen(value: string | string[] | undefined): Set<string> {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const ids = raw.flatMap((part) => part.split(",")).slice(0, 500);
  return new Set(ids.filter((id) => questionIdSchema.safeParse(id).success));
}

/** 現バッチを提示済みに足し、次の総ざらい URL を作る。 */
export function nextReviewHref(previous: ReadonlySet<string>, currentIds: readonly string[]): string {
  const seen = new Set([...previous, ...currentIds]);
  const query = new URLSearchParams({ seen: [...seen].join(",") });
  return `/mistakes/review?${query.toString()}`;
}

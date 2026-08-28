import { describe, expect, it } from "vitest";
import { nextReviewHref, parseReviewSeen } from "./review-cursor";

describe("間違いノート総ざらいの周回カーソル", () => {
  it("提示済み ID だけを復元し、不正値と重複は除く", () => {
    expect([...parseReviewSeen("f-d1-q001,bad,f-d1-q001,f-d2-q999")]).toEqual([
      "f-d1-q001",
      "f-d2-q999",
    ]);
  });

  it("前バッチと現バッチを次 URL に引き継ぐ", () => {
    const href = nextReviewHref(new Set(["f-d1-q001"]), ["f-d1-q002", "f-d1-q001"]);
    const url = new URL(href, "https://example.test");
    expect([...parseReviewSeen(url.searchParams.get("seen") ?? undefined)]).toEqual([
      "f-d1-q001",
      "f-d1-q002",
    ]);
  });
});

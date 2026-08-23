import { describe, expect, it } from "vitest";
import { createEmptyCard, Rating, State } from "ts-fsrs";
import { cardToRow, rowToCard } from "./card-row";
import { applyRating } from "./scheduler";

// T-srs: Card ↔ srs_state 行の lossless round-trip(specs/03 §srs_state、specs/04 §方針)

const jst = (iso: string) => new Date(`${iso}+09:00`);
const MIN = 60_000;

describe("Card ↔ row の lossless round-trip", () => {
  const t0 = jst("2026-08-23T09:00:00");

  it("新規カード(last_review なし)が往復で保存される", () => {
    const card = createEmptyCard(t0);
    const row = cardToRow("f-d1-q001", "ccar-f", card);

    expect(row.questionId).toBe("f-d1-q001");
    expect(row.exam).toBe("ccar-f");
    expect(row.lastReviewAt).toBeNull();
    expect(row.state).toBe(State.New);

    const restored = rowToCard(row);
    expect(restored).toEqual(card);
    expect(restored.last_review).toBeUndefined();
  });

  it("レビュー済みカードの全フィールドが往復で一致する", () => {
    let card = applyRating(createEmptyCard(t0), Rating.Good, t0).card;
    card = applyRating(card, Rating.Good, new Date(t0.getTime() + 10 * MIN)).card;
    card = applyRating(card, Rating.Again, new Date(card.due.getTime())).card; // Relearning も通す

    const restored = rowToCard(cardToRow("f-d2-q014", "ccar-f", card));
    expect(restored).toEqual(card);
    expect(restored.due.getTime()).toBe(card.due.getTime());
    expect(restored.last_review?.getTime()).toBe(card.last_review?.getTime());
    expect(restored.state).toBe(State.Relearning);
    expect(restored.lapses).toBe(card.lapses);
    expect(restored.learning_steps).toBe(card.learning_steps);
  });

  it("復元カードは元カードと同一のスケジュール結果を生む(挙動レベルの lossless)", () => {
    let card = applyRating(createEmptyCard(t0), Rating.Good, t0).card;
    card = applyRating(card, Rating.Good, new Date(t0.getTime() + 10 * MIN)).card;
    const restored = rowToCard(cardToRow("f-d3-q005", "ccar-f", card));

    const later = new Date(card.due.getTime());
    expect(applyRating(restored, Rating.Good, later)).toEqual(applyRating(card, Rating.Good, later));
  });

  it("row → card → row も一致する(DB 復元値の再保存)", () => {
    const card = applyRating(createEmptyCard(t0), Rating.Easy, t0).card;
    const row = cardToRow("f-d4-q002", "ccar-f", card);
    expect(cardToRow("f-d4-q002", "ccar-f", rowToCard(row))).toEqual(row);
  });

  it("変換は入力の Date を共有しない(後段の破壊を防ぐ)", () => {
    const card = applyRating(createEmptyCard(t0), Rating.Good, t0).card;
    const row = cardToRow("f-d5-q003", "ccar-f", card);
    expect(row.dueAt).not.toBe(card.due);
    const restored = rowToCard(row);
    expect(restored.due).not.toBe(row.dueAt);
  });

  it("state が ts-fsrs State enum 値以外の行は拒否する", () => {
    const row = cardToRow("f-d1-q001", "ccar-f", createEmptyCard(t0));
    expect(() => rowToCard({ ...row, state: 9 })).toThrow();
    expect(() => rowToCard({ ...row, state: -1 })).toThrow();
  });
});

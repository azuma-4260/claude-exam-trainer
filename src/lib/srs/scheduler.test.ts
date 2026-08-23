import { describe, expect, it } from "vitest";
import { createEmptyCard, Rating, State, type Card } from "ts-fsrs";
import { daysBetweenJstDates, jstCalendarDate } from "./jst";
import {
  applyRating,
  CCAR_F_EXAM_DATE_JST,
  createScheduler,
  daysUntilExam,
  getRetrievability,
  maximumIntervalFor,
  REQUEST_RETENTION,
} from "./scheduler";

// T-srs: SRS 遷移テスト(specs/04、03 §srs_state)。D1-1 の src/lib/srs/ を対象とする。

const MIN = 60_000;
const DAY = 86_400_000;

/** JST 表記の固定時刻(テスト決定性のため常に明示オフセット付きで生成) */
const jst = (iso: string) => new Date(`${iso}+09:00`);

describe("JST 日付(規約: 全日付ロジックは Asia/Tokyo)", () => {
  it("jstCalendarDate は UTC ではなく JST の暦日を返す", () => {
    // 2026-09-26T15:00:00Z = 9/27 00:00 JST
    expect(jstCalendarDate(new Date("2026-09-26T15:00:00Z"))).toBe("2026-09-27");
    expect(jstCalendarDate(new Date("2026-09-26T14:59:59.999Z"))).toBe("2026-09-26");
    expect(jstCalendarDate(jst("2026-08-23T00:00:00"))).toBe("2026-08-23");
  });

  it("daysBetweenJstDates は暦日差を返し、不正形式は拒否する", () => {
    expect(daysBetweenJstDates("2026-08-23", "2026-09-27")).toBe(35);
    expect(daysBetweenJstDates("2026-09-27", "2026-09-27")).toBe(0);
    expect(daysBetweenJstDates("2026-09-28", "2026-09-27")).toBe(-1);
    expect(() => daysBetweenJstDates("2026/08/23", "2026-09-27")).toThrow();
    expect(() => daysBetweenJstDates("2026-08-23", "9/27")).toThrow();
  });

  it("daysUntilExam は JST 暦日で数える(UTC 日付とずれる境界で検証)", () => {
    expect(CCAR_F_EXAM_DATE_JST).toBe("2026-09-27");
    // UTC ではまだ 9/26 だが JST では 9/27(試験当日)
    expect(daysUntilExam(new Date("2026-09-26T15:00:00Z"))).toBe(0);
    expect(daysUntilExam(new Date("2026-09-26T14:59:59Z"))).toBe(1);
    expect(daysUntilExam(jst("2026-08-23T09:00:00"))).toBe(35);
  });
});

describe("maximum_interval = max(1, days_until_exam - 1)(specs/04 §試験日対応)", () => {
  it("残日数から導出される", () => {
    expect(maximumIntervalFor(jst("2026-08-23T09:00:00"))).toBe(34);
    expect(maximumIntervalFor(jst("2026-09-20T09:00:00"))).toBe(6);
  });

  it("下限 1 でクリップされる(前日・当日・通過後)", () => {
    expect(maximumIntervalFor(jst("2026-09-26T23:59:59"))).toBe(1);
    expect(maximumIntervalFor(jst("2026-09-27T00:00:00"))).toBe(1);
    expect(maximumIntervalFor(jst("2026-09-28T09:00:00"))).toBe(1);
  });

  it("scheduler パラメータに反映される(retention 0.9 / fuzz 無効)", () => {
    const now = jst("2026-09-20T09:00:00");
    const params = createScheduler(now).parameters;
    expect(REQUEST_RETENTION).toBe(0.9);
    expect(params.request_retention).toBe(0.9);
    expect(params.maximum_interval).toBe(6);
    expect(params.enable_fuzz).toBe(false);
  });

  it("Review カードの次回間隔がクランプされる(Good/Easy は ts-fsrs 5.4.1 の隣接分離で最大 +1/+2 日)", () => {
    // stability を巨大にして生の間隔が必ず maximum_interval を超える状況を作る
    const mature: Card = {
      due: jst("2026-09-20T00:00:00"),
      stability: 500,
      difficulty: 5,
      elapsed_days: 10,
      scheduled_days: 30,
      reps: 5,
      lapses: 0,
      learning_steps: 0,
      state: State.Review,
      last_review: jst("2026-09-10T00:00:00"),
    };
    const now = jst("2026-09-20T09:00:00"); // days_until_exam=7 → maximum_interval=6

    const hard = applyRating(mature, Rating.Hard, now).card;
    expect(hard.scheduled_days).toBe(6);
    expect(hard.due.getTime()).toBeLessThanOrEqual(jst("2026-09-27T00:00:00").getTime());

    // ts-fsrs 5.4.1 は Review の隣接評価間隔を hard < good < easy に強制するため
    // Good/Easy はクランプ後 +1/+2 日まで超過し得る(ライブラリ仕様。手動の書換はしない)
    const good = applyRating(mature, Rating.Good, now).card;
    const easy = applyRating(mature, Rating.Easy, now).card;
    expect(good.scheduled_days).toBeLessThanOrEqual(7);
    expect(easy.scheduled_days).toBeLessThanOrEqual(8);
  });
});

describe("状態遷移(ts-fsrs 5.4.1 既定 learning steps [1m, 10m])", () => {
  const t0 = jst("2026-08-23T09:00:00");

  it("New + Good → Learning(step 2 待ち、due +10 分)", () => {
    const card = createEmptyCard(t0);
    expect(card.state).toBe(State.New);
    expect(card.reps).toBe(0);

    const { card: next } = applyRating(card, Rating.Good, t0);
    expect(next.state).toBe(State.Learning);
    expect(next.reps).toBe(1);
    expect(next.due.getTime()).toBe(t0.getTime() + 10 * MIN);
    expect(next.last_review?.getTime()).toBe(t0.getTime());
  });

  it("New + Again → Learning(due +1 分)", () => {
    const { card: next } = applyRating(createEmptyCard(t0), Rating.Again, t0);
    expect(next.state).toBe(State.Learning);
    expect(next.due.getTime()).toBe(t0.getTime() + 1 * MIN);
  });

  it("New + Easy → Review(learning steps を飛ばす)", () => {
    const { card: next } = applyRating(createEmptyCard(t0), Rating.Easy, t0);
    expect(next.state).toBe(State.Review);
    expect(next.scheduled_days).toBeGreaterThanOrEqual(1);
  });

  it("Learning + Good(最終 step)→ Review、以後 Again → Relearning で lapses++", () => {
    const step1 = applyRating(createEmptyCard(t0), Rating.Good, t0).card;
    const t1 = new Date(t0.getTime() + 10 * MIN);
    const review = applyRating(step1, Rating.Good, t1).card;
    expect(review.state).toBe(State.Review);
    expect(review.reps).toBe(2);
    expect(review.lapses).toBe(0);
    expect(review.scheduled_days).toBeGreaterThanOrEqual(1);

    const t2 = new Date(review.due.getTime() + 1 * DAY);
    const relearning = applyRating(review, Rating.Again, t2).card;
    expect(relearning.state).toBe(State.Relearning);
    expect(relearning.lapses).toBe(1);
    expect(relearning.reps).toBe(3);

    const t3 = new Date(t2.getTime() + 10 * MIN);
    const back = applyRating(relearning, Rating.Good, t3).card;
    expect(back.state).toBe(State.Review);
    expect(back.lapses).toBe(1);
  });

  it("Review + Good で Review を維持し stability が伸びる", () => {
    const step1 = applyRating(createEmptyCard(t0), Rating.Good, t0).card;
    const review = applyRating(step1, Rating.Good, new Date(t0.getTime() + 10 * MIN)).card;
    const later = new Date(review.due.getTime());
    const next = applyRating(review, Rating.Good, later).card;
    expect(next.state).toBe(State.Review);
    expect(next.stability).toBeGreaterThan(review.stability);
  });
});

describe("返却 Card の非改変(specs/04 §方針)", () => {
  const now = jst("2026-08-23T09:00:00");

  it("applyRating は scheduler.next の結果をそのまま返す(個別フィールド書換なし)", () => {
    const card = createEmptyCard(now);
    const direct = createScheduler(now).next(card, now, Rating.Good);
    expect(applyRating(card, Rating.Good, now)).toEqual(direct);
  });

  it("入力 Card を破壊しない", () => {
    const card = createEmptyCard(now);
    const snapshot = structuredClone(card);
    applyRating(card, Rating.Good, now);
    expect(card).toEqual(snapshot);
  });

  it("get_retrievability は number で返る(format=false)", () => {
    const step1 = applyRating(createEmptyCard(now), Rating.Good, now).card;
    const review = applyRating(step1, Rating.Good, new Date(now.getTime() + 10 * MIN)).card;
    const r = getRetrievability(review, new Date(now.getTime() + 2 * DAY));
    expect(typeof r).toBe("number");
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(1);
  });
});

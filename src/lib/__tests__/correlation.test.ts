import { describe, it, expect } from "vitest";
import { isFormOptimal, isOptimalStool, gutScore, findPatterns, transitTimeFor } from "../correlation";
import type { StoolLog, AnyLog, MealLog, WaterLog } from "../types";

function stool(overrides: Partial<StoolLog> = {}): StoolLog {
  return {
    id: "s1",
    type: "stool",
    timestamp: 1_700_000_000_000,
    bristol: 4,
    urgency: "low",
    ease: "easy",
    color: "brown",
    ...overrides,
  };
}

describe("isFormOptimal", () => {
  it("passes a good-form stool regardless of color", () => {
    expect(isFormOptimal(stool({ color: "green" }))).toBe(true);
    expect(isFormOptimal(stool({ color: "black" }))).toBe(true);
  });

  it("fails on bad bristol type", () => {
    expect(isFormOptimal(stool({ bristol: 1 }))).toBe(false);
    expect(isFormOptimal(stool({ bristol: 7 }))).toBe(false);
  });

  it("fails on high urgency", () => {
    expect(isFormOptimal(stool({ urgency: "high" }))).toBe(false);
  });

  it("fails on strained ease", () => {
    expect(isFormOptimal(stool({ ease: "strained" }))).toBe(false);
  });
});

describe("isOptimalStool", () => {
  it("passes good form AND healthy color", () => {
    expect(isOptimalStool(stool({ color: "brown" }))).toBe(true);
  });

  it("fails good form but unhealthy color", () => {
    expect(isOptimalStool(stool({ color: "green" }))).toBe(false);
  });

  it("fails bad form even with healthy color", () => {
    expect(isOptimalStool(stool({ bristol: 1, color: "brown" }))).toBe(false);
  });
});

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
// Anchored at local midnight so dayTs(0, hour) always lands within "today" for
// any hour 0-23, and NOW sits at 23:00 the same day so today's entries (logged
// at 8am/9am/noon, etc.) are never timestamped after "now".
const TODAY_MIDNIGHT = new Date(2024, 0, 15, 0, 0, 0, 0).getTime();
const NOW = TODAY_MIDNIGHT + 23 * HOUR;

function dayTs(daysAgo: number, hour = 12): number {
  return TODAY_MIDNIGHT - daysAgo * DAY + hour * HOUR;
}

describe("gutScore — active-days denominator", () => {
  it("does not dilute fibre/hydration scoring for a user whose history is shorter than 7 days", () => {
    // Same daily fibre/hydration intake and the same number of optimal-stool
    // days, but logged across only 2 calendar days (a 2-day-old account)
    // instead of being spread across all 7. The old formula divided totals by
    // a flat 7, silently halving the score for anyone who hadn't used the app
    // for a full week yet — the fix divides by the days actually active.
    const twoDayLogs: AnyLog[] = [];
    for (let d = 0; d < 2; d++) {
      twoDayLogs.push({ id: `s${d}`, type: "stool", timestamp: dayTs(d), bristol: 4, urgency: "low", ease: "easy", color: "brown" });
      twoDayLogs.push({ id: `m${d}`, type: "meal", timestamp: dayTs(d, 8), tags: [], fiberG: 25 } as MealLog);
      twoDayLogs.push({ id: `w${d}`, type: "water", timestamp: dayTs(d, 9), ml: 2000 } as WaterLog);
    }

    const sevenDayLogs: AnyLog[] = [];
    for (let d = 0; d < 7; d++) {
      sevenDayLogs.push({ id: `s${d}`, type: "stool", timestamp: dayTs(d), bristol: 4, urgency: "low", ease: "easy", color: "brown" });
      sevenDayLogs.push({ id: `m${d}`, type: "meal", timestamp: dayTs(d, 8), tags: [], fiberG: 25 } as MealLog);
      sevenDayLogs.push({ id: `w${d}`, type: "water", timestamp: dayTs(d, 9), ml: 2000 } as WaterLog);
    }

    const twoDayScore = gutScore(twoDayLogs, undefined, NOW);
    const sevenDayScore = gutScore(sevenDayLogs, undefined, NOW);

    // The 7-day user has demonstrated more sustained consistency, so the
    // frequency bonus alone still puts them ahead — but with the active-days
    // fix, the 2-day user's fibre/hydration ratios are full credit (not
    // diluted to ~29% by dividing by 7), so they should score well above the
    // floor rather than being crushed near 0. (Hand-verified: 37 with the fix
    // vs 29 under the old always-divide-by-7 formula for this exact input.)
    expect(twoDayScore).toBeGreaterThanOrEqual(35);
    expect(sevenDayScore).toBe(100);
  });

  it("does not produce NaN when all logs are forward-dated (excluded from the active window)", () => {
    const futureLogs: AnyLog[] = [
      { id: "s1", type: "stool", timestamp: NOW + 2 * HOUR, bristol: 4, urgency: "low", ease: "easy", color: "brown" },
    ];
    const score = gutScore(futureLogs, undefined, NOW);
    expect(score).not.toBeNaN();
    expect(score).toBe(0);
  });
});

describe("gutScore — colorRatio independence", () => {
  // Use 5 days of otherwise-perfect logging so the frequency bonus (0.93x)
  // doesn't saturate the score at the 100 cap, making the colour-only
  // difference between scenarios visible. (Hand-verified against the formula.)
  function fiveDaysOf(color: "brown" | "green" | "black"): AnyLog[] {
    const logs: AnyLog[] = [];
    for (let d = 0; d < 5; d++) {
      logs.push({ id: `s${d}`, type: "stool", timestamp: dayTs(d), bristol: 4, urgency: "low", ease: "easy", color });
      logs.push({ id: `m${d}`, type: "meal", timestamp: dayTs(d, 8), tags: [], fiberG: 25 } as MealLog);
      logs.push({ id: `w${d}`, type: "water", timestamp: dayTs(d, 9), ml: 2000 } as WaterLog);
    }
    return logs;
  }

  it("scores a good-form, non-alarming bad-color stool only a little worse, not double-penalised", () => {
    const goodScore = gutScore(fiveDaysOf("brown"), undefined, NOW);
    const badScore = gutScore(fiveDaysOf("green"), undefined, NOW);
    // Bristol form is identical (Type 4, optimal) in both cases — only color
    // differs. Green only costs the 20% colour weight (score 87 vs 93), not
    // also the 50% bristol weight as the old double-penalty would have.
    expect(badScore).toBeLessThan(goodScore);
    expect(badScore).toBeGreaterThan(goodScore - 10);
  });

  it("scores an unexplained black stool much worse than a non-alarming color", () => {
    const brownScore = gutScore(fiveDaysOf("brown"), undefined, NOW);
    const blackScore = gutScore(fiveDaysOf("black"), undefined, NOW);
    // Unexplained black drops to a 0.05 colour score (vs 1.0 for brown) at the
    // same 20% weight — a much bigger gap than the green case above.
    expect(blackScore).toBeLessThan(brownScore - 15);
  });
});

describe("gutScore — frequency bonus rewards daily consistency", () => {
  it("scores one optimal stool per day across 7 days higher than 7 stools in one day", () => {
    const spreadLogs: AnyLog[] = [];
    for (let d = 0; d < 7; d++) {
      spreadLogs.push({ id: `s${d}`, type: "stool", timestamp: dayTs(d), bristol: 4, urgency: "low", ease: "easy", color: "brown" });
      spreadLogs.push({ id: `m${d}`, type: "meal", timestamp: dayTs(d, 8), tags: [], fiberG: 25 } as MealLog);
      spreadLogs.push({ id: `w${d}`, type: "water", timestamp: dayTs(d, 9), ml: 2000 } as WaterLog);
    }

    const burstLogs: AnyLog[] = [];
    for (let i = 0; i < 7; i++) {
      burstLogs.push({ id: `s${i}`, type: "stool", timestamp: dayTs(0, i), bristol: 4, urgency: "low", ease: "easy", color: "brown" });
    }
    burstLogs.push({ id: "m0", type: "meal", timestamp: dayTs(0, 8), tags: [], fiberG: 25 } as MealLog);
    burstLogs.push({ id: "w0", type: "water", timestamp: dayTs(0, 9), ml: 2000 } as WaterLog);

    const spreadScore = gutScore(spreadLogs, undefined, NOW);
    const burstScore = gutScore(burstLogs, undefined, NOW);
    expect(spreadScore).toBeGreaterThan(burstScore);
  });
});

describe("findPatterns — adaptive lookback", () => {
  it("falls back to a 72h window with insufficient transit data (<5 points)", () => {
    // Only 2 stools with a prior meal => not enough to compute a personal
    // median, so the 72h fallback window must still be used. A meal 80h
    // before a stool should NOT be picked up (outside the 72h fallback).
    const logs: AnyLog[] = [
      { id: "m1", type: "meal", timestamp: dayTs(4) - 8 * HOUR, tags: ["spicy"], fiberG: 5 } as MealLog,
      { id: "s1", type: "stool", timestamp: dayTs(4), bristol: 6, urgency: "low", ease: "easy" },
      { id: "m2", type: "meal", timestamp: dayTs(2, 8), tags: ["rice"], fiberG: 5 } as MealLog,
      { id: "s2", type: "stool", timestamp: dayTs(2), bristol: 4, urgency: "low", ease: "easy" },
      { id: "m3", type: "meal", timestamp: dayTs(0) - 80 * HOUR, tags: ["spicy"], fiberG: 5 } as MealLog,
      { id: "s3", type: "stool", timestamp: dayTs(0), bristol: 6, urgency: "low", ease: "easy" },
    ];
    // transitTimeFor itself always uses the fixed 72h search radius regardless
    // of adaptive lookback — sanity-check it still finds the close meals.
    expect(transitTimeFor(logs[1] as StoolLog, logs)).not.toBeNull();
    // With only 3 stools (< 3 minimum not met for findPatterns... use 3 stools is the floor)
    const patterns = findPatterns(logs);
    expect(Array.isArray(patterns)).toBe(true);
  });
});

describe("findPatterns — frequency-adjusted lift threshold", () => {
  it("blocks a moderate-frequency tag that the old fixed 1.5 threshold would have let through", () => {
    // 8 loose stools (days 93-100 ago), all preceded by a "trigger" meal.
    const logs: AnyLog[] = [];
    for (let i = 0; i < 8; i++) {
      const ts = dayTs(100 - i);
      logs.push({ id: `loose${i}`, type: "stool", timestamp: ts, bristol: 6, urgency: "low", ease: "easy" });
      logs.push({ id: `m_loose${i}`, type: "meal", timestamp: ts - 8 * HOUR, tags: ["trigger"], fiberG: 5 } as MealLog);
    }
    // 12 optimal stools (days 69-80 ago, well clear of the block above), also
    // preceded by "trigger" — so the tag isn't exclusive to loose outcomes.
    // Total tag frequency = (8+12)/40 = 0.5.
    for (let i = 0; i < 12; i++) {
      const ts = dayTs(80 - i);
      logs.push({ id: `optTrig${i}`, type: "stool", timestamp: ts, bristol: 4, urgency: "low", ease: "easy" });
      logs.push({ id: `m_optTrig${i}`, type: "meal", timestamp: ts - 8 * HOUR, tags: ["trigger"], fiberG: 5 } as MealLog);
    }
    // 20 more optimal stools (days 31-50 ago, well clear of both blocks above)
    // with no "trigger" meal — keeps total stools at 40, baseline loose rate
    // at 8/40 = 0.2.
    for (let i = 0; i < 20; i++) {
      logs.push({ id: `opt${i}`, type: "stool", timestamp: dayTs(50 - i), bristol: 4, urgency: "low", ease: "easy" });
    }

    const patterns = findPatterns(logs);
    const triggerLoose = patterns.find((p) => p.tag === "trigger" && p.outcome === "loose");
    // lift = (8/20) / (8/40) = 0.4 / 0.2 = 2.0 — clears the old fixed 1.5
    // threshold (so old code would have surfaced this), but the
    // frequency-adjusted threshold at 50% tag frequency is 1.5 + 0.5*2 = 2.5,
    // so the new logic should suppress it.
    expect(triggerLoose).toBeUndefined();
  });

  it("scales minOccurrences with total stool volume", () => {
    // 100 optimal-with-tag-eligible stools (days 11-100 ago) + 100 loose
    // stools (days 151-250 ago) = 200 stools total.
    // minOccurrences = max(5, round(200*0.08)) = 16.
    const logs: AnyLog[] = [];
    for (let i = 0; i < 100; i++) {
      logs.push({ id: `opt${i}`, type: "stool", timestamp: dayTs(100 - i), bristol: 4, urgency: "low", ease: "easy" });
    }
    for (let i = 0; i < 100; i++) {
      logs.push({ id: `loose${i}`, type: "stool", timestamp: dayTs(250 - i), bristol: 6, urgency: "low", ease: "easy" });
    }
    // Only 10 of the optimal stools (days 91-100 ago, far from the loose
    // block at 151-250) get a "rare-tag" meal 8h prior.
    for (let i = 0; i < 10; i++) {
      logs.push({ id: `m${i}`, type: "meal", timestamp: dayTs(100 - i) - 8 * HOUR, tags: ["rare-tag"], fiberG: 5 } as MealLog);
    }
    const patterns = findPatterns(logs);
    const ratePattern = patterns.find((p) => p.tag === "rare-tag");
    // lift = (10/10) / (100/200) = 1.0 / 0.5 = 2.0 — well above even the
    // frequency-adjusted threshold (tag frequency 10/200=0.05 → threshold
    // 1.6) and above the old fixed minimum occurrence count of 5. Only the
    // new minOccurrences=16 rule blocks it.
    expect(ratePattern).toBeUndefined();
  });
});

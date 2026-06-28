import { describe, it, expect } from "vitest";
import { isFormOptimal, isOptimalStool, gutScore } from "../correlation";
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

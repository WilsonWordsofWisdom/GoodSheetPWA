import { describe, it, expect } from "vitest";
import { smartHydrationTarget } from "../hydration";
import type { AnyLog, StoolLog } from "../types";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const NOW = 1_700_000_000_000;

function stool(daysAgo: number, overrides: Partial<StoolLog> = {}): StoolLog {
  return {
    id: `s-${daysAgo}`,
    type: "stool",
    timestamp: NOW - daysAgo * DAY,
    bristol: 4,
    ease: "easy",
    ...overrides,
  };
}

describe("smartHydrationTarget — continuous signal", () => {
  it("applies no bump with no firm/strained stools", () => {
    const logs: AnyLog[] = [stool(0, { bristol: 4, ease: "easy" })];
    expect(smartHydrationTarget(logs, 2000, NOW)).toBe(2000);
  });

  it("bumps more for two recent Bristol-1 stools than two old Bristol-3 stools", () => {
    const recentHard: AnyLog[] = [
      stool(0, { bristol: 1, ease: "easy" }),
      stool(1, { bristol: 1, ease: "easy" }),
    ];
    const oldFirm: AnyLog[] = [
      stool(6, { bristol: 3, ease: "easy" }),
      stool(6, { bristol: 3, ease: "easy" }),
    ];
    const recentBump = smartHydrationTarget(recentHard, 2000, NOW) - 2000;
    const oldBump = smartHydrationTarget(oldFirm, 2000, NOW) - 2000;
    expect(recentBump).toBeGreaterThan(oldBump);
  });

  it("does not produce a cliff edge between 1 and 2 firm stools", () => {
    const one: AnyLog[] = [stool(0, { bristol: 1, ease: "easy" })];
    const two: AnyLog[] = [stool(0, { bristol: 1, ease: "easy" }), stool(1, { bristol: 1, ease: "easy" })];
    const oneBump = smartHydrationTarget(one, 2000, NOW) - 2000;
    const twoBump = smartHydrationTarget(two, 2000, NOW) - 2000;
    // One firm stool should already nudge the target up (continuous, not a
    // 0-until-threshold-2 cliff), and two should be noticeably more.
    expect(oneBump).toBeGreaterThan(0);
    expect(twoBump).toBeGreaterThan(oneBump);
  });

  it("caps the bump at +500ml", () => {
    const logs: AnyLog[] = [];
    for (let i = 0; i < 7; i++) {
      logs.push(stool(i, { bristol: 1, ease: "strained" }));
    }
    expect(smartHydrationTarget(logs, 2000, NOW)).toBe(2500);
  });
});

import { describe, it, expect } from "vitest";
import { logToRow, rowToLog } from "../sync-mappers";
import type { AnyLog } from "../types";

const USER = "11111111-1111-1111-1111-111111111111";

const samples: AnyLog[] = [
  { id: "a", type: "meal", timestamp: 1_700_000_000_000, foodName: "Laksa", cuisine: "Singaporean", tags: ["Spicy"], caloriesMin: 550, caloriesMax: 800, fiberG: 2.5, note: "hot" },
  { id: "b", type: "exercise", timestamp: 1_700_000_100_000, activity: "Walk", intensity: "medium", durationMin: 30, caloriesBurned: 120, met: 3.5 },
  { id: "c", type: "stool", timestamp: 1_700_000_200_000, bristol: 4, urgency: "low", ease: "easy", color: "brown" },
  { id: "d", type: "water", timestamp: 1_700_000_300_000, ml: 250, drinkId: "coffee" },
];

describe("sync mappers round-trip", () => {
  for (const log of samples) {
    it(`round-trips a ${log.type} log`, () => {
      const row = logToRow(log, USER, true);
      expect(row.user_id).toBe(USER);
      expect(row.share_data).toBe(true);
      const back = rowToLog(row);
      expect(back).toEqual(log);
    });
  }

  it("maps logged_at to/from epoch ms", () => {
    const row = logToRow(samples[0], USER, false);
    expect(row.logged_at).toBe(new Date(1_700_000_000_000).toISOString());
    expect(rowToLog(row).timestamp).toBe(1_700_000_000_000);
  });
});

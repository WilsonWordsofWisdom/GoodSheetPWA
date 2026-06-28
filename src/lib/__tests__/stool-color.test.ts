import { describe, it, expect } from "vitest";
import { findColorExplainer, adjustedColorScore } from "../stool-color";
import type { StoolLog, MealLog, AnyLog } from "../types";

const HOUR = 3600 * 1000;
const NOW = 1_700_000_000_000;

function stool(overrides: Partial<StoolLog> = {}): StoolLog {
  return {
    id: "s1",
    type: "stool",
    timestamp: NOW,
    bristol: 4,
    color: "black",
    ...overrides,
  };
}

function meal(overrides: Partial<MealLog> = {}): MealLog {
  return {
    id: "m1",
    type: "meal",
    timestamp: NOW - 24 * HOUR,
    foodName: "Chicken Rice",
    tags: [],
    ...overrides,
  };
}

describe("findColorExplainer", () => {
  it("returns null for non-black/red colors", () => {
    expect(findColorExplainer(stool({ color: "brown" }), [])).toBeNull();
    expect(findColorExplainer(stool({ color: "green" }), [])).toBeNull();
  });

  it("returns null when no meal explains a black stool", () => {
    const logs: AnyLog[] = [meal({ foodName: "Chicken Rice" })];
    expect(findColorExplainer(stool({ color: "black" }), logs)).toBeNull();
  });

  it("finds an iron-supplement explainer for black stool within 48h", () => {
    const logs: AnyLog[] = [meal({ foodName: "Iron Supplement", timestamp: NOW - 12 * HOUR })];
    expect(findColorExplainer(stool({ color: "black" }), logs)).toBe("Iron Supplement");
  });

  it("finds a beetroot explainer for red stool within 48h", () => {
    const logs: AnyLog[] = [meal({ foodName: "Roasted Beetroot Salad", timestamp: NOW - 30 * HOUR })];
    expect(findColorExplainer(stool({ color: "red" }), logs)).toBe("Roasted Beetroot Salad");
  });

  it("ignores an explainer meal eaten more than 48h before the stool", () => {
    const logs: AnyLog[] = [meal({ foodName: "Iron Supplement", timestamp: NOW - 60 * HOUR })];
    expect(findColorExplainer(stool({ color: "black" }), logs)).toBeNull();
  });

  it("ignores an explainer meal eaten after the stool", () => {
    const logs: AnyLog[] = [meal({ foodName: "Iron Supplement", timestamp: NOW + 1 * HOUR })];
    expect(findColorExplainer(stool({ color: "black" }), logs)).toBeNull();
  });
});

describe("adjustedColorScore", () => {
  it("scores unexplained black stool severely (0.05)", () => {
    expect(adjustedColorScore(stool({ color: "black" }), [])).toBe(0.05);
  });

  it("scores unexplained red stool severely (0.05)", () => {
    expect(adjustedColorScore(stool({ color: "red" }), [])).toBe(0.05);
  });

  it("scores explained black stool leniently (0.55)", () => {
    const logs: AnyLog[] = [meal({ foodName: "Iron Supplement", timestamp: NOW - 12 * HOUR })];
    expect(adjustedColorScore(stool({ color: "black" }), logs)).toBe(0.55);
  });

  it("leaves non-alarming colors unchanged", () => {
    expect(adjustedColorScore(stool({ color: "brown" }), [])).toBe(1.0);
    expect(adjustedColorScore(stool({ color: "green" }), [])).toBe(0.7);
  });
});

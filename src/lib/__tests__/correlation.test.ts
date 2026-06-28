import { describe, it, expect } from "vitest";
import { isFormOptimal, isOptimalStool } from "../correlation";
import type { StoolLog } from "../types";

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

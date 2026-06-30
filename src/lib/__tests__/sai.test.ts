import { describe, it, expect, vi } from "vitest";
import { saiReply, saiGreeting, checkReminders } from "../sai";
import type { AnyLog, MealLog, StoolLog } from "../types";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const NOW = 1_700_000_000_000;

function manyLogs(n: number, type: AnyLog["type"], startDaysAgo = 1): AnyLog[] {
  const out: AnyLog[] = [];
  for (let i = 0; i < n; i++) {
    const ts = NOW - (startDaysAgo + i) * DAY;
    if (type === "stool") out.push({ id: `s${i}`, type: "stool", timestamp: ts, bristol: 4, urgency: "low", ease: "easy", color: "brown" } as StoolLog);
    if (type === "meal") out.push({ id: `m${i}`, type: "meal", timestamp: ts, tags: [], fiberG: 10 } as MealLog);
    if (type === "water") out.push({ id: `w${i}`, type: "water", timestamp: ts, ml: 500 } as AnyLog & { ml: number });
    if (type === "exercise") out.push({ id: `e${i}`, type: "exercise", timestamp: ts, activity: "Walk", intensity: "low", durationMin: 20 } as AnyLog);
  }
  return out;
}

describe("saiReply — scored intent matching", () => {
  it("picks transit over avoid when both keywords are present", () => {
    const logs: AnyLog[] = [
      { id: "m1", type: "meal", timestamp: NOW - 10 * HOUR, tags: [], foodName: "Curry" } as MealLog,
      { id: "s1", type: "stool", timestamp: NOW, bristol: 4, urgency: "low", ease: "easy", color: "brown" } as StoolLog,
    ];
    // Deliberately avoids the words "eat"/"food"/"meal" so the "food" intent
    // can't tie with "transit" — isolates the transit-vs-avoid comparison.
    // transit matches "transit" + "how long" = 2 * 1.0 = 2.0.
    // avoid matches "triggers" = 1 * 0.9 = 0.9.
    const reply = saiReply("how long does transit take, and what are my triggers?", logs);
    expect(reply.topic).toBe("transit");
  });

  it("still resolves a single clear intent correctly", () => {
    const reply = saiReply("what's my gut score?", []);
    expect(reply.topic).toBe("score");
  });

  it("falls back to the default response when nothing matches", () => {
    const reply = saiReply("xyzzy plugh", []);
    expect(reply.topic).toBe("default");
  });

  it("does not let a bare 'ai' substring inside an unrelated word trigger the AI-classifier intent", () => {
    const reply = saiReply("is dairy ok for my gut?", []);
    expect(reply.topic).not.toBe("aiinfo");
  });

  it("does not let 'time' inside 'sometimes' trigger the transit intent", () => {
    const reply = saiReply("sometimes I feel bloated, is that bad?", []);
    expect(reply.topic).not.toBe("transit");
  });
});

describe("saiReply — data sufficiency", () => {
  it("warns about missing log categories when asking about patterns with little data", () => {
    const reply = saiReply("show me my patterns", []);
    expect(reply.text).toMatch(/at least 10 stool logs/i);
  });

  it("qualifies the gut score as early-days under 10 stool logs", () => {
    const logs = manyLogs(3, "stool");
    const reply = saiReply("what's my gut score?", logs);
    expect(reply.text).toMatch(/early days/i);
  });

  it("does not qualify the gut score once there are 10+ stool logs", () => {
    const logs = [...manyLogs(10, "stool"), ...manyLogs(10, "meal"), ...manyLogs(5, "water"), ...manyLogs(2, "exercise")];
    const reply = saiReply("what's my gut score?", logs);
    expect(reply.text).not.toMatch(/early days/i);
  });

  it("does not duplicate the data-sufficiency nudge when score and patterns intents compose", () => {
    const reply = saiReply("what's my score and any patterns?", []);
    const nudgeFragment = "Your Gut Score and patterns get more accurate";
    const firstIndex = reply.text.indexOf(nudgeFragment);
    const lastIndex = reply.text.lastIndexOf(nudgeFragment);
    expect(firstIndex).toBeGreaterThanOrEqual(0); // nudge present at least once
    expect(firstIndex).toBe(lastIndex); // and only once
  });
});

describe("saiGreeting — early days qualifier", () => {
  it("qualifies the score for a new user with under 10 stool logs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      const logs = manyLogs(3, "stool");
      const greeting = saiGreeting(logs);
      expect(greeting.text).toMatch(/early days/i);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("checkReminders — unexplained color alert", () => {
  it("flags an unexplained black stool", () => {
    const logs: AnyLog[] = [
      { id: "s1", type: "stool", timestamp: NOW - HOUR, bristol: 4, urgency: "low", ease: "easy", color: "black" } as StoolLog,
    ];
    const reminders = checkReminders(logs, NOW);
    expect(reminders.some((r) => /consult a doctor/i.test(r))).toBe(true);
  });

  it("does not flag a black stool explained by a recent iron supplement", () => {
    const logs: AnyLog[] = [
      { id: "m1", type: "meal", timestamp: NOW - 12 * HOUR, tags: [], foodName: "Iron Supplement" } as MealLog,
      { id: "s1", type: "stool", timestamp: NOW - HOUR, bristol: 4, urgency: "low", ease: "easy", color: "black" } as StoolLog,
    ];
    const reminders = checkReminders(logs, NOW);
    expect(reminders.some((r) => /consult a doctor/i.test(r))).toBe(false);
  });
});

import type { AnyLog, MealLog, StoolLog, ExerciseLog, BristolType, UserProfile } from "./types";
import { isHealthyColor, adjustedColorScore } from "./stool-color";
import { sevenDayAvgFibre } from "./fibre";
import { sevenDayAvgHydration, smartHydrationTarget } from "./hydration";

const HOUR = 3600 * 1000;
const LOOKBACK_MS = 72 * HOUR;

export interface PatternInsight {
  tag: string;
  outcome: "loose" | "optimal" | "constipated";
  occurrences: number;
  baselineRate: number;
  conditionalRate: number;
  lift: number;
  message: string;
}

function categoryOf(b: BristolType): "loose" | "optimal" | "constipated" {
  if (b <= 2) return "constipated";
  if (b >= 6) return "loose";
  return "optimal";
}

// Form/comfort dimension only — color is scored independently (see
// adjustedColorScore in stool-color.ts), so a stool's Bristol form isn't
// double-penalized when its color is also bad.
export function isFormOptimal(s: StoolLog): boolean {
  return (
    categoryOf(s.bristol) === "optimal" &&
    s.urgency !== "high" &&
    s.ease !== "strained"
  );
}

export function isOptimalStool(s: StoolLog): boolean {
  return isFormOptimal(s) && isHealthyColor(s.color);
}

function dayKey(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function activeDaysInWindow(logs: AnyLog[], since: number, now: number): number {
  const days = new Set<number>();
  for (const l of logs) {
    if (l.timestamp >= since && l.timestamp <= now) days.add(dayKey(l.timestamp));
  }
  return days.size;
}

export function gutScore(logs: AnyLog[], profile?: UserProfile, now = Date.now()): number {
  const since = now - 7 * 24 * HOUR;
  const stools = logs.filter(
    (l): l is StoolLog => l.type === "stool" && l.timestamp >= since && l.timestamp <= now
  );
  if (stools.length === 0) return 0;

  const formOptimalStools = stools.filter(isFormOptimal);
  const bristolRatio = formOptimalStools.length / stools.length;

  let colorSum = 0;
  for (const s of stools) colorSum += adjustedColorScore(s, logs);
  const colorRatio = colorSum / stools.length;

  // Scale fibre/hydration targets to the days the user actually logged
  // anything this week, instead of always dividing by 7 — a 2-day-old user
  // shouldn't be measured against a 7-day target.
  const activeDays = activeDaysInWindow(logs, since, now);

  const fiberTarget = profile?.fiberTargetG ?? 25;
  const fibreAvgPerActiveDay = (sevenDayAvgFibre(logs, now) * 7) / activeDays;
  const fibreScore = Math.min(1, fibreAvgPerActiveDay / fiberTarget);

  const baseHydration = profile?.hydrationTargetMl ?? 2000;
  const hydrationTarget =
    profile?.smartHydrationEnabled !== false
      ? smartHydrationTarget(logs, baseHydration, now)
      : baseHydration;
  const hydrationAvgPerActiveDay = (sevenDayAvgHydration(logs, now) * 7) / activeDays;
  const hydrationScore = Math.min(1, hydrationAvgPerActiveDay / hydrationTarget);

  // Weights: bristol 50%, colour 20%, fibre 20%, hydration 10%
  // Ref: Müller et al. (2020) Nutrients 12(7):1941; Kieffer et al. (2016) J Acad Nutr Diet
  const blended =
    bristolRatio * 0.5 +
    colorRatio * 0.2 +
    fibreScore * 0.2 +
    hydrationScore * 0.1;

  // Rewards a consistent daily habit, not raw stool volume — 7 optimal stools
  // in one day no longer scores the same as one optimal stool per day for a week.
  const optimalDays = new Set<number>();
  for (const s of formOptimalStools) optimalDays.add(dayKey(s.timestamp));
  const frequencyBonus = (Math.min(optimalDays.size, 7) / 7) * 1.3;

  return Math.min(100, Math.round(blended * 100 * frequencyBonus));
}

export function transitTimeFor(stool: StoolLog, logs: AnyLog[]): number | null {
  const meals = logs.filter(
    (l): l is MealLog =>
      l.type === "meal" &&
      l.timestamp < stool.timestamp &&
      stool.timestamp - l.timestamp <= LOOKBACK_MS
  );
  if (meals.length === 0) return null;
  const closest = meals.reduce((a, b) =>
    stool.timestamp - a.timestamp < stool.timestamp - b.timestamp ? a : b
  );
  return Math.round((stool.timestamp - closest.timestamp) / HOUR);
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Personalises the meal-lookback window to the user's own transit time once
// there's enough data (>=5 points); falls back to the clinical-average 72h
// otherwise so new users see unchanged behaviour.
function adaptiveLookbackMs(stools: StoolLog[], logs: AnyLog[]): number {
  const transitTimes = stools
    .map((s) => transitTimeFor(s, logs))
    .filter((t): t is number => t !== null);
  if (transitTimes.length < 5) return LOOKBACK_MS;
  const medianHrs = median(transitTimes);
  const clampedHrs = Math.min(120, Math.max(12, medianHrs * 1.5));
  return clampedHrs * HOUR;
}

export function findPatterns(logs: AnyLog[]): PatternInsight[] {
  const stools = logs.filter((l): l is StoolLog => l.type === "stool");
  if (stools.length < 3) return [];

  const meals = logs.filter((l): l is MealLog => l.type === "meal");
  const lookbackMs = adaptiveLookbackMs(stools, logs);

  const baselineByCat = {
    loose: stools.filter((s) => categoryOf(s.bristol) === "loose").length / stools.length,
    optimal: stools.filter((s) => categoryOf(s.bristol) === "optimal").length / stools.length,
    constipated:
      stools.filter((s) => categoryOf(s.bristol) === "constipated").length / stools.length,
  };

  const tagCounts = new Map<string, { total: number; outcomes: Record<string, number> }>();

  for (const stool of stools) {
    const cat = categoryOf(stool.bristol);
    const window = meals.filter(
      (m) => m.timestamp < stool.timestamp && stool.timestamp - m.timestamp <= lookbackMs
    );
    const tags = new Set<string>();
    for (const m of window) for (const t of m.tags) tags.add(t.toLowerCase());
    for (const t of tags) {
      const entry = tagCounts.get(t) ?? { total: 0, outcomes: { loose: 0, optimal: 0, constipated: 0 } };
      entry.total += 1;
      entry.outcomes[cat] += 1;
      tagCounts.set(t, entry);
    }
  }

  const minOccurrences = Math.max(5, Math.round(stools.length * 0.08));

  const insights: PatternInsight[] = [];
  for (const [tag, data] of tagCounts) {
    const tagFrequency = data.total / stools.length;
    const liftThreshold = 1.5 + tagFrequency * 2.0;
    for (const cat of ["loose", "optimal", "constipated"] as const) {
      const occ = data.outcomes[cat];
      if (occ < minOccurrences) continue;
      const conditional = occ / data.total;
      const baseline = baselineByCat[cat] || 0.0001;
      const lift = conditional / baseline;
      if (lift < liftThreshold) continue;

      const verb =
        cat === "optimal"
          ? "appears alongside Type 3–5 outcomes"
          : cat === "loose"
            ? "appears before Type 6–7 (loose) outcomes"
            : "appears before Type 1–2 (firm) outcomes";

      insights.push({
        tag,
        outcome: cat,
        occurrences: occ,
        baselineRate: baseline,
        conditionalRate: conditional,
        lift,
        message: `Pattern: #${tag} ${verb} (based on ${occ} occurrences, ${Math.round(lift * 10) / 10}× your baseline).`,
      });
    }
  }

  return insights.sort((a, b) => b.lift - a.lift);
}

export function goodShitStreak(logs: AnyLog[], now = Date.now()): { current: number; best: number; goodToday: boolean } {
  const stools = logs.filter((l): l is StoolLog => l.type === "stool");
  if (stools.length === 0) return { current: 0, best: 0, goodToday: false };

  const dayKey = (ts: number) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const goodDays = new Set<number>();
  for (const s of stools) {
    if (categoryOf(s.bristol) === "optimal") goodDays.add(dayKey(s.timestamp));
  }

  const today = dayKey(now);
  const yesterday = today - 24 * HOUR;
  const goodToday = goodDays.has(today);

  let current = 0;
  let cursor = goodToday ? today : yesterday;
  while (goodDays.has(cursor)) {
    current++;
    cursor -= 24 * HOUR;
  }

  const sorted = [...goodDays].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of sorted) {
    if (prev !== null && d - prev === 24 * HOUR) run++;
    else run = 1;
    if (run > best) best = run;
    prev = d;
  }

  return { current, best: Math.max(best, current), goodToday };
}

export function recentExerciseCount(logs: AnyLog[], now = Date.now()): number {
  const since = now - 24 * HOUR;
  return logs.filter(
    (l): l is ExerciseLog => l.type === "exercise" && l.timestamp >= since
  ).length;
}


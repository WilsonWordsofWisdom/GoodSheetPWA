import type { AnyLog, MealLog, StoolLog, ExerciseLog, BristolType, UserProfile } from "./types";
import { isHealthyColor, getColorScore } from "./stool-color";
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

export function gutScore(logs: AnyLog[], profile?: UserProfile, now = Date.now()): number {
  const since = now - 7 * 24 * HOUR;
  const stools = logs.filter(
    (l): l is StoolLog => l.type === "stool" && l.timestamp >= since
  );
  if (stools.length === 0) return 0;

  const optimal = stools.filter(isOptimalStool).length;
  const bristolRatio = optimal / stools.length;

  let colorSum = 0;
  for (const s of stools) {
    if (isOptimalStool(s)) colorSum += getColorScore(s.color);
  }
  const colorRatio = colorSum / stools.length;

  const fiberTarget = profile?.fiberTargetG ?? 25;
  const fibreAvg = sevenDayAvgFibre(logs, now);
  const fibreScore = Math.min(1, fibreAvg / fiberTarget);

  const baseHydration = profile?.hydrationTargetMl ?? 2000;
  const hydrationTarget =
    profile?.smartHydrationEnabled !== false
      ? smartHydrationTarget(logs, baseHydration, now)
      : baseHydration;
  const hydrationScore = Math.min(1, sevenDayAvgHydration(logs, now) / hydrationTarget);

  // Weights: bristol 50%, colour 20%, fibre 20%, hydration 10%
  // Ref: Müller et al. (2020) Nutrients 12(7):1941; Kieffer et al. (2016) J Acad Nutr Diet
  const blended =
    bristolRatio * 0.5 +
    colorRatio * 0.2 +
    fibreScore * 0.2 +
    hydrationScore * 0.1;

  const frequencyBonus = (Math.min(optimal, 7) / 7) * 1.3;
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

export function findPatterns(logs: AnyLog[]): PatternInsight[] {
  const stools = logs.filter((l): l is StoolLog => l.type === "stool");
  if (stools.length < 3) return [];

  const meals = logs.filter((l): l is MealLog => l.type === "meal");

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
      (m) => m.timestamp < stool.timestamp && stool.timestamp - m.timestamp <= LOOKBACK_MS
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

  const insights: PatternInsight[] = [];
  for (const [tag, data] of tagCounts) {
    for (const cat of ["loose", "optimal", "constipated"] as const) {
      const occ = data.outcomes[cat];
      if (occ < 5) continue;
      const conditional = occ / data.total;
      const baseline = baselineByCat[cat] || 0.0001;
      const lift = conditional / baseline;
      if (lift < 1.5) continue;

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


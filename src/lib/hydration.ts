import type { AnyLog, StoolLog, WaterLog } from "./types";
import { DRINK_MAP } from "./drinks";

const HOUR = 3600 * 1000;

export function hydrationToday(logs: AnyLog[], now = Date.now()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return logs
    .filter((l): l is WaterLog => l.type === "water" && l.timestamp >= start.getTime())
    .reduce((sum, l) => {
      const factor = DRINK_MAP.get(l.drinkId ?? 'water')?.hydrationFactor ?? 1;
      return sum + Math.round(l.ml * factor);
    }, 0);
}

export function sevenDayAvgHydration(logs: AnyLog[], now = Date.now()): number {
  const since = now - 7 * 24 * HOUR;
  const totalMl = logs
    .filter((l): l is WaterLog => l.type === "water" && l.timestamp >= since)
    .reduce((sum, l) => {
      const factor = DRINK_MAP.get(l.drinkId ?? 'water')?.hydrationFactor ?? 1;
      return sum + Math.round(l.ml * factor);
    }, 0);
  return totalMl / 7;
}

// Auto-raises hydration target using a continuous, severity- and recency-
// weighted dehydration signal instead of binary thresholds — avoids the old
// cliff-edge jump between 1 and 2 qualifying stools.
// Refs: Kieffer et al. (2016); Müller et al. (2020). Max auto-raise: +500ml.
export function smartHydrationTarget(logs: AnyLog[], baseTarget: number, now = Date.now()): number {
  const since = now - 7 * 24 * HOUR;
  const recentStools = logs.filter(
    (l): l is StoolLog => l.type === "stool" && l.timestamp >= since
  );
  let dehydrationSignal = 0;
  for (const s of recentStools) {
    const daysSince = (now - s.timestamp) / (24 * HOUR);
    const ageFactor = 1 - (daysSince / 7) * 0.5;
    if (s.bristol <= 2) dehydrationSignal += 1.0 * ageFactor;
    if (s.bristol === 3) dehydrationSignal += 0.4 * ageFactor;
    if (s.ease === "strained") dehydrationSignal += 0.4 * ageFactor;
  }
  const bump = Math.min(500, Math.round(dehydrationSignal * 100));
  return baseTarget + bump;
}

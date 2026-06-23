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

// Auto-raises hydration target when stool data suggests dehydration.
// Rules (Kieffer et al. 2016; Müller et al. 2020):
//   +250ml if ≥2 stools are Bristol 1–3 in last 7 days
//   +250ml if ≥2 stools have strained ease in last 7 days
//   Maximum auto-raise: +500ml above baseline
export function smartHydrationTarget(logs: AnyLog[], baseTarget: number, now = Date.now()): number {
  const since = now - 7 * 24 * HOUR;
  const recentStools = logs.filter(
    (l): l is StoolLog => l.type === "stool" && l.timestamp >= since
  );
  let bump = 0;
  if (recentStools.filter((s) => s.bristol <= 3).length >= 2) bump += 250;
  if (recentStools.filter((s) => s.ease === "strained").length >= 2) bump += 250;
  return baseTarget + bump;
}

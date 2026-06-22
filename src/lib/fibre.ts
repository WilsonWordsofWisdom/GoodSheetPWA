import type { AnyLog, MealLog, WaterLog } from "./types";

const HOUR = 3600 * 1000;

export function fibreToday(logs: AnyLog[], now = Date.now()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const startTs = start.getTime();
  const mealFibre = logs
    .filter((l): l is MealLog => l.type === "meal" && l.timestamp >= startTs && l.fiberG != null)
    .reduce((sum, l) => sum + (l.fiberG ?? 0), 0);
  const waterFibre = logs
    .filter((l): l is WaterLog => l.type === "water" && l.timestamp >= startTs && l.fiberG != null)
    .reduce((sum, l) => sum + (l.fiberG ?? 0), 0);
  return Math.round((mealFibre + waterFibre) * 10) / 10;
}

export function sevenDayAvgFibre(logs: AnyLog[], now = Date.now()): number {
  const since = now - 7 * 24 * HOUR;
  const mealFibre = logs
    .filter((l): l is MealLog => l.type === "meal" && l.timestamp >= since && l.fiberG != null)
    .reduce((sum, l) => sum + (l.fiberG ?? 0), 0);
  const waterFibre = logs
    .filter((l): l is WaterLog => l.type === "water" && l.timestamp >= since && l.fiberG != null)
    .reduce((sum, l) => sum + (l.fiberG ?? 0), 0);
  return (mealFibre + waterFibre) / 7;
}

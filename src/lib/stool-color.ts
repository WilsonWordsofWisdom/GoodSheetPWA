import type { StoolColor, StoolLog, MealLog, AnyLog } from "./types";

const HOUR = 3600 * 1000;

export interface ColorHealth {
  isHealthy: boolean;
  score: number; // 0–1, where 1 is perfectly healthy
  message: string;
  concern?: string;
}

const COLOR_HEALTH: Record<StoolColor, ColorHealth> = {
  brown: {
    isHealthy: true,
    score: 1.0,
    message: "Ideal stool color indicating a healthy gut.",
  },
  "light-brown": {
    isHealthy: true,
    score: 0.95,
    message: "Healthy light-brown color, typical for diverse diets.",
  },
  "yellow-brown": {
    isHealthy: true,
    score: 0.9,
    message: "Healthy warm tone; may indicate faster transit or high fiber.",
  },
  "pale-yellow": {
    isHealthy: false,
    score: 0.6,
    message: "Pale color may suggest reduced bile or fat malabsorption.",
    concern: "Consider: is diet high in fats? Any abdominal discomfort?",
  },
  green: {
    isHealthy: false,
    score: 0.7,
    message: "Green stool may indicate fast transit or consumption of leafy greens.",
    concern: "If persistent and accompanied by cramping, consult a doctor.",
  },
  black: {
    isHealthy: false,
    score: 0.2,
    message: "Black or tarry stools can indicate upper GI bleeding.",
    concern: "⚠️ Consult a healthcare provider immediately.",
  },
  red: {
    isHealthy: false,
    score: 0.3,
    message: "Red stools may indicate blood in stool.",
    concern: "⚠️ Consult a healthcare provider if this persists.",
  },
  unknown: {
    isHealthy: false,
    score: 0.5,
    message: "Color could not be determined. Please manually select or try again.",
  },
};

export function evaluateColorHealth(color: StoolColor): ColorHealth {
  return COLOR_HEALTH[color];
}

export function isHealthyColor(color?: StoolColor): boolean {
  if (!color) return true;
  return COLOR_HEALTH[color].isHealthy;
}

export function getColorScore(color?: StoolColor): number {
  if (!color) return 1.0;
  return COLOR_HEALTH[color].score;
}

const COLOR_EXPLAINERS: Record<"black" | "red", string[]> = {
  black: [
    "iron supplement", "iron tablet", "bismuth", "pepto", "black licorice",
    "activated charcoal", "blueberry", "blackberry", "black pudding", "blood",
  ],
  red: [
    "beetroot", "beet", "red dragon fruit", "tomato juice", "red food coloring",
    "red velvet", "cranberry", "pomegranate", "red gummy", "hawthorn",
  ],
};

// Looks for a meal in the 48h before a black/red stool that's a known benign
// cause of dark/red stool (iron, beets, dye, etc). Returns the matching food
// name, or null if no explanation is found — used to distinguish a benign
// dietary cause from a potential GI-bleed signal.
export function findColorExplainer(stool: StoolLog, logs: AnyLog[]): string | null {
  if (stool.color !== "black" && stool.color !== "red") return null;
  const since = stool.timestamp - 48 * HOUR;
  const meals = logs.filter(
    (l): l is MealLog =>
      l.type === "meal" && l.timestamp >= since && l.timestamp < stool.timestamp && !!l.foodName
  );
  for (const m of meals) {
    const name = m.foodName!.toLowerCase();
    if (COLOR_EXPLAINERS[stool.color as "black" | "red"].some((kw) => name.includes(kw))) {
      return m.foodName!;
    }
  }
  return null;
}

// Color score used by gutScore. Unlike getColorScore, an unexplained black/red
// stool (no dietary cause found) drops to a severe 0.05 instead of 0.2/0.3,
// since it's a potential GI-bleed signal, not just an "unhealthy" color.
export function adjustedColorScore(stool: StoolLog, logs: AnyLog[]): number {
  const base = getColorScore(stool.color);
  if (stool.color === "black" || stool.color === "red") {
    return findColorExplainer(stool, logs) ? Math.max(base, 0.55) : 0.05;
  }
  return base;
}

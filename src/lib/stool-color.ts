import type { StoolColor } from "./types";

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

export type LogType = "meal" | "exercise" | "stool" | "water";

export type BristolType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type StoolColor = "brown" | "light-brown" | "yellow-brown" | "pale-yellow" | "green" | "black" | "red" | "unknown";

export interface MealLog {
  id: string;
  type: "meal";
  timestamp: number;
  foodName?: string;
  cuisine?: string;
  tags: string[];
  note?: string;
  caloriesMin?: number;
  caloriesMax?: number;
  fiberG?: number;
  thumbnail?: string;
}

export interface ExerciseLog {
  id: string;
  type: "exercise";
  timestamp: number;
  activity: string;
  intensity: "low" | "medium" | "high";
  durationMin: number;
  caloriesBurned?: number;
  met?: number;
  note?: string;
}

export interface StoolLog {
  id: string;
  type: "stool";
  timestamp: number;
  bristol: BristolType;
  urgency?: "low" | "medium" | "high";
  ease?: "easy" | "normal" | "strained";
  color?: StoolColor;
  note?: string;
  thumbnail?: string;
}

export interface WaterLog {
  id: string;
  type: "water";
  timestamp: number;
  ml: number;
  drinkId?: string;  // key into DRINK_MAP; absent on legacy records → treat as 'water'
  fiberG?: number;   // legacy field kept for backward compat; superseded by drinkId
  note?: string;
}

export type AnyLog = MealLog | ExerciseLog | StoolLog | WaterLog;

export interface UserProfile {
  age?: number;
  weightKg?: number;
  heightCm?: number;
  goals: string[];
  storeThumbnails: boolean;
  onboardedAt: number;
  hydrationTargetMl?: number;
  fiberTargetG?: number;
  smartHydrationEnabled?: boolean;
  shareData?: boolean;
}

import type { AnyLog, MealLog, ExerciseLog, StoolLog, WaterLog, StoolColor } from "./types";
import type { LogRow } from "./db-types";

// AnyLog (camelCase, epoch ms) → LogRow (snake_case, ISO). Pure, no I/O.
export function logToRow(log: AnyLog, userId: string, shareData: boolean): LogRow {
  const base = {
    id: log.id,
    user_id: userId,
    type: log.type,
    logged_at: new Date(log.timestamp).toISOString(),
    note: log.note ?? null,
    share_data: shareData,
    food_id: null, food_name: null, cuisine: null, tags: null,
    calories_min: null, calories_max: null, fiber_g: null,
    activity_id: null, activity_name: null, intensity: null,
    duration_min: null, calories_burned: null, met: null,
    bristol: null, urgency: null, ease: null, color: null,
    drink_id: null, ml: null, deleted_at: null,
  } as LogRow;

  if (log.type === "meal") {
    base.food_name = log.foodName ?? null;
    base.cuisine = log.cuisine ?? null;
    base.tags = log.tags;
    base.calories_min = log.caloriesMin ?? null;
    base.calories_max = log.caloriesMax ?? null;
    base.fiber_g = log.fiberG ?? null;
  } else if (log.type === "exercise") {
    base.activity_name = log.activity;
    base.intensity = log.intensity;
    base.duration_min = log.durationMin;
    base.calories_burned = log.caloriesBurned ?? null;
    base.met = log.met ?? null;
  } else if (log.type === "stool") {
    base.bristol = log.bristol;
    base.urgency = log.urgency ?? null;
    base.ease = log.ease ?? null;
    base.color = log.color ?? null;
  } else if (log.type === "water") {
    base.ml = log.ml;
    base.drink_id = log.drinkId ?? null;
    base.fiber_g = log.fiberG ?? null;
  }
  return base;
}

// LogRow → AnyLog. Drops null-valued optional fields so output matches the
// shape produced by the app (which omits undefined keys).
export function rowToLog(row: LogRow): AnyLog {
  const ts = Date.parse(row.logged_at);

  if (row.type === "meal") {
    const m: MealLog = { id: row.id, type: "meal", timestamp: ts, tags: row.tags ?? [] };
    if (row.food_name != null) m.foodName = row.food_name;
    if (row.cuisine != null) m.cuisine = row.cuisine;
    if (row.calories_min != null) m.caloriesMin = row.calories_min;
    if (row.calories_max != null) m.caloriesMax = row.calories_max;
    if (row.fiber_g != null) m.fiberG = row.fiber_g;
    if (row.note != null) m.note = row.note;
    return m;
  }
  if (row.type === "exercise") {
    const e: ExerciseLog = {
      id: row.id, type: "exercise", timestamp: ts,
      activity: row.activity_name ?? "",
      intensity: (row.intensity ?? "medium"),
      durationMin: row.duration_min ?? 0,
    };
    if (row.calories_burned != null) e.caloriesBurned = row.calories_burned;
    if (row.met != null) e.met = row.met;
    if (row.note != null) e.note = row.note;
    return e;
  }
  if (row.type === "stool") {
    const s: StoolLog = { id: row.id, type: "stool", timestamp: ts, bristol: (row.bristol ?? 4) as StoolLog["bristol"] };
    if (row.urgency != null) s.urgency = row.urgency;
    if (row.ease != null) s.ease = row.ease;
    if (row.color != null) s.color = row.color as StoolColor;
    if (row.note != null) s.note = row.note;
    return s;
  }
  const w: WaterLog = { id: row.id, type: "water", timestamp: ts, ml: row.ml ?? 0 };
  if (row.drink_id != null) w.drinkId = row.drink_id;
  if (row.fiber_g != null) w.fiberG = row.fiber_g;
  if (row.note != null) w.note = row.note;
  return w;
}

// Hand-written mirrors of the Supabase table rows (snake_case).
export interface FoodRow {
  id: string;
  name: string;
  cuisine: string;
  kcal_min: number;
  kcal_max: number;
  fiber_g: number;
  tags: string[];
  is_active: boolean;
}

export interface DrinkRow {
  id: string;
  name: string;
  category: string;
  fiber_g_per_100ml: number;
  hydration_factor: number;
  gut_tags: string[];
  is_active: boolean;
}

export interface ActivityRow {
  id: string;
  name: string;
  met_low: number;
  met_medium: number;
  met_high: number;
  description: string | null;
  is_active: boolean;
}

export interface GoalRow {
  id: number;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface ProfileRow {
  id: string;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  goals: string[];
  store_thumbnails: boolean;
  hydration_target_ml: number | null;
  fiber_target_g: number | null;
  smart_hydration_enabled: boolean;
  share_data: boolean;
  onboarded_at: string | null;
}

export interface LogRow {
  id: string;
  user_id: string;
  type: "meal" | "exercise" | "stool" | "water";
  logged_at: string;
  note: string | null;
  share_data: boolean;
  food_id: string | null;
  food_name: string | null;
  cuisine: string | null;
  tags: string[] | null;
  calories_min: number | null;
  calories_max: number | null;
  fiber_g: number | null;
  activity_id: string | null;
  activity_name: string | null;
  intensity: "low" | "medium" | "high" | null;
  duration_min: number | null;
  calories_burned: number | null;
  met: number | null;
  bristol: number | null;
  urgency: "low" | "medium" | "high" | null;
  ease: "easy" | "normal" | "strained" | null;
  color: string | null;
  drink_id: string | null;
  ml: number | null;
  deleted_at: string | null;
}

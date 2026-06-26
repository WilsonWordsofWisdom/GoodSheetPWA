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

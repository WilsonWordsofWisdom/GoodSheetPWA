import { supabase, isSupabaseConfigured } from "./supabase";
import type { FoodRow, DrinkRow } from "./db-types";
import { FOODS, type FoodItem } from "./foods";
import { DRINKS, type DrinkItem, type GutDrinkTag } from "./drinks";
import { GOALS } from "./goals";

export interface ReferenceData {
  foods: FoodItem[];
  drinks: DrinkItem[];
  goals: string[];
}

// Instant, offline-safe defaults straight from the shipped code arrays.
export const FALLBACK_REFERENCE: ReferenceData = {
  foods: FOODS,
  drinks: DRINKS,
  goals: GOALS,
};

let cache: ReferenceData | null = null;

function foodRowToItem(r: FoodRow): FoodItem {
  return { name: r.name, cuisine: r.cuisine, kcalMin: r.kcal_min, kcalMax: r.kcal_max, tags: r.tags, fiberG: r.fiber_g };
}

function drinkRowToItem(r: DrinkRow): DrinkItem {
  return {
    id: r.id, name: r.name,
    category: r.category as DrinkItem["category"],
    fiberGPer100ml: r.fiber_g_per_100ml,
    hydrationFactor: r.hydration_factor,
    gutTags: r.gut_tags as GutDrinkTag[],
  };
}

// Fetches catalogues from Supabase; falls back to code arrays on any error or
// when Supabase is not configured. Result is cached in-memory for the session.
export async function fetchReferenceData(): Promise<ReferenceData> {
  if (cache) return cache;
  if (!isSupabaseConfigured()) return FALLBACK_REFERENCE;

  try {
    const [foods, drinks, goals] = await Promise.all([
      supabase.from("foods").select("*").eq("is_active", true),
      supabase.from("drinks").select("*").eq("is_active", true),
      supabase.from("goals").select("label").eq("is_active", true).order("sort_order"),
    ]);
    if (foods.error || drinks.error || goals.error) return FALLBACK_REFERENCE;
    if (!foods.data?.length || !drinks.data?.length) return FALLBACK_REFERENCE;

    cache = {
      foods: (foods.data as FoodRow[]).map(foodRowToItem),
      drinks: (drinks.data as DrinkRow[]).map(drinkRowToItem),
      goals: (goals.data as { label: string }[]).map((g) => g.label),
    };
    return cache;
  } catch {
    return FALLBACK_REFERENCE;
  }
}

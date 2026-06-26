// scripts/seed-reference.ts
// One-off: copies the hardcoded reference arrays into Supabase tables.
// Run: npx tsx scripts/seed-reference.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { FOODS } from "../src/lib/foods";
import { DRINKS } from "../src/lib/drinks";
import { ACTIVITY_METS } from "../src/lib/exercise-calories";
import { GOALS } from "../src/lib/goals";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  const foodRows = FOODS.map((f) => ({
    name: f.name, cuisine: f.cuisine, kcal_min: f.kcalMin, kcal_max: f.kcalMax,
    fiber_g: f.fiberG, tags: f.tags,
  }));
  const { error: fErr } = await db.from("foods").upsert(foodRows, { onConflict: "name,cuisine" });
  if (fErr) throw fErr;

  const drinkRows = DRINKS.map((d) => ({
    id: d.id, name: d.name, category: d.category,
    fiber_g_per_100ml: d.fiberGPer100ml, hydration_factor: d.hydrationFactor, gut_tags: d.gutTags,
  }));
  const { error: dErr } = await db.from("drinks").upsert(drinkRows, { onConflict: "id" });
  if (dErr) throw dErr;

  const activityRows = Object.values(ACTIVITY_METS).map((a) => ({
    id: slug(a.activity), name: a.activity,
    met_low: a.low, met_medium: a.medium, met_high: a.high, description: a.description,
  }));
  const { error: aErr } = await db.from("activities").upsert(activityRows, { onConflict: "id" });
  if (aErr) throw aErr;

  const goalRows = GOALS.map((label, i) => ({ label, sort_order: i + 1 }));
  const { error: gErr } = await db.from("goals").upsert(goalRows, { onConflict: "label" });
  if (gErr) throw gErr;

  console.log(`Seeded: ${foodRows.length} foods, ${drinkRows.length} drinks, ${activityRows.length} activities, ${goalRows.length} goals`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

# Supabase Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move hardcoded reference data into Supabase tables (Phase A) and add opt-in, anonymous-auth user data sync (Phase B), while keeping the app fully offline-first.

**Architecture:** Star schema in Supabase Postgres — a wide `logs` fact table plus `foods`/`drinks`/`activities`/`goals`/`profiles` dimensions. IndexedDB stays the primary store; Supabase is additive. Reference catalogues are seeded from the existing code arrays (which remain as the offline fallback). User logs sync only when the user flips a `share_data` opt-in. Anonymous Supabase Auth gives each device a server-minted UUID identity.

**Tech Stack:** Next.js 15 App Router PWA, `@supabase/supabase-js` v2, Supabase Postgres + Auth (anonymous) + RLS, Vitest (mapper unit tests only), `tsx`+`dotenv` (seed script).

**Spec:** `docs/superpowers/specs/2026-06-24-supabase-integration-design.md`

**Pre-existing note:** `supabase/functions/server/` is leftover Figma-Make scaffolding (a generic KV store, project ref `bnoovyjuxymvycszljty`). It is NOT referenced from `src/`. Leave it untouched — do not delete or edit it.

**DB execution note:** All migrations are stored as SQL files under `supabase/migrations/` AND applied to the live project via the Supabase MCP tool `apply_migration` (params: `name`, `query`). Verification queries use the MCP tool `execute_sql`. Before Task A2, confirm with the user which Supabase project to target and obtain its URL + anon key + service-role key.

---

## File Structure

**Create:**
- `src/lib/supabase.ts` — browser Supabase client singleton (anon key)
- `src/lib/db-types.ts` — hand-written row types (`FoodRow`, `DrinkRow`, `ActivityRow`, `GoalRow`, `ProfileRow`, `LogRow`)
- `src/lib/reference-data.ts` — fetch catalogues from Supabase with code-array fallback + in-memory cache
- `src/lib/ReferenceDataContext.tsx` — React context providing `{foods, drinks, activities, goals}`
- `src/lib/sync-mappers.ts` — pure `logToRow` / `rowToLog` (no client import)
- `src/lib/sync.ts` — client orchestration (auth, profile upsert, push/pull logs, delete)
- `src/lib/__tests__/sync-mappers.test.ts` — Vitest round-trip tests
- `scripts/seed-reference.ts` — one-off seed of reference tables from code arrays (service role)
- `supabase/migrations/0001_reference_tables.sql`
- `supabase/migrations/0002_reference_rls.sql`
- `supabase/migrations/0003_user_tables.sql`
- `supabase/migrations/0004_user_rls.sql`
- `vitest.config.ts`
- `.env.example`

**Modify:**
- `package.json` — deps + `test` script
- `src/lib/types.ts` — add `shareData?: boolean` to `UserProfile`
- `src/components/App.tsx` — wrap in `ReferenceDataProvider`, bootstrap auth/profile, trigger sync
- `src/components/FoodPicker.tsx` — read foods from context
- `src/components/Onboarding.tsx` + `src/components/EditProfile.tsx` — read goals from context
- `src/components/Settings.tsx` — add "Cloud sync" opt-in toggle

**Unchanged on purpose:** `src/lib/foods.ts`, `drinks.ts`, `exercise-calories.ts`, `goals.ts` stay as seed source + offline fallback. Pure-logic libs (`fibre.ts`, `hydration.ts` via `DRINK_MAP`; `exercise-calories.ts` via `ACTIVITY_METS`) keep importing the code arrays directly — those are computational constants that must run offline and synchronously. Display lists (foods, goals) are migrated to the context as the reference pattern; drinks/activities display lists may follow later the same way.

---

# PHASE A — Reference Data Tables

### Task A1: Install Supabase client + env + client singleton

**Files:**
- Modify: `package.json`
- Create: `src/lib/supabase.ts`, `.env.example`

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/wilson/Documents/GitHub/GoodSheetPWA
npm install @supabase/supabase-js@^2
npm install -D tsx dotenv vitest
```

- [ ] **Step 2: Add `test` script to package.json**

In `package.json` `"scripts"`, add the test line so the block reads:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Create `.env.example`**

```bash
# Supabase — client (safe to expose, inlined at build by Next.js)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Supabase — server only (used by scripts/seed-reference.ts, NEVER exposed to client)
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

- [ ] **Step 4: Create local `.env.local` (not committed)**

Copy `.env.example` to `.env.local` and fill with the real values for the target project (confirm project with the user). Verify `.env.local` is gitignored:

```bash
cp .env.example .env.local
git check-ignore .env.local
```

Expected: prints `.env.local` (already ignored by Next's default `.gitignore`). If it prints nothing, add `.env*.local` to `.gitignore`.

- [ ] **Step 5: Create `src/lib/supabase.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// A no-op-safe singleton. If env is missing (e.g. offline-only build), callers
// must guard with isSupabaseConfigured() before using the client.
export const isSupabaseConfigured = (): boolean => Boolean(url && anonKey);

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "public-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 6: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/supabase.ts .env.example
git commit -m "feat: add Supabase client singleton, env scaffolding, and test runner"
```

---

### Task A2: Create reference-data tables

**Files:**
- Create: `supabase/migrations/0001_reference_tables.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 0001_reference_tables.sql

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cuisine text not null,
  kcal_min int not null,
  kcal_max int not null,
  fiber_g numeric(4,1) not null,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, cuisine)
);
create index if not exists foods_tags_gin on public.foods using gin (tags);

create table if not exists public.drinks (
  id text primary key,
  name text not null,
  category text not null check (category in ('water','juice','smoothie','hot-drink','dairy','alcohol','sports')),
  fiber_g_per_100ml numeric(4,2) not null,
  hydration_factor numeric(3,2) not null,
  gut_tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id text primary key,
  name text not null,
  met_low numeric(3,1) not null,
  met_medium numeric(3,1) not null,
  met_high numeric(3,1) not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id smallint generated always as identity primary key,
  label text not null unique,
  sort_order smallint not null,
  is_active boolean not null default true
);
```

- [ ] **Step 2: Apply via Supabase MCP**

Use MCP tool `apply_migration` with `name: "reference_tables"` and `query` = the SQL above.

- [ ] **Step 3: Verify tables exist**

Use MCP tool `execute_sql` with:

```sql
select table_name from information_schema.tables
where table_schema='public' and table_name in ('foods','drinks','activities','goals')
order by table_name;
```

Expected: 4 rows — activities, drinks, foods, goals.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_reference_tables.sql
git commit -m "feat: add reference data tables migration (foods, drinks, activities, goals)"
```

---

### Task A3: RLS for reference tables (public read, admin write)

**Files:**
- Create: `supabase/migrations/0002_reference_rls.sql`

- [ ] **Step 1: Write the RLS SQL**

```sql
-- 0002_reference_rls.sql

alter table public.foods       enable row level security;
alter table public.drinks      enable row level security;
alter table public.activities  enable row level security;
alter table public.goals       enable row level security;

-- Public read (anon + authenticated). Writes are implicitly denied for these
-- roles because no insert/update/delete policy exists; service_role bypasses RLS.
create policy "foods_read"      on public.foods      for select using (true);
create policy "drinks_read"     on public.drinks     for select using (true);
create policy "activities_read" on public.activities for select using (true);
create policy "goals_read"      on public.goals      for select using (true);
```

- [ ] **Step 2: Apply via MCP `apply_migration`** with `name: "reference_rls"`.

- [ ] **Step 3: Verify RLS enabled**

MCP `execute_sql`:

```sql
select relname, relrowsecurity from pg_class
where relname in ('foods','drinks','activities','goals') order by relname;
```

Expected: all 4 rows show `relrowsecurity = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_reference_rls.sql
git commit -m "feat: enable RLS with public-read policies on reference tables"
```

---

### Task A4: Seed reference tables from code arrays

**Files:**
- Create: `scripts/seed-reference.ts`

- [ ] **Step 1: Write the seed script**

```typescript
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
```

- [ ] **Step 2: Run the seed script**

```bash
npx tsx scripts/seed-reference.ts
```

Expected: prints `Seeded: 120 foods, 20 drinks, 14 activities, 14 goals` (food count may vary with the array length; drinks=20, goals=14).

- [ ] **Step 3: Verify counts via MCP `execute_sql`**

```sql
select
  (select count(*) from public.foods)      as foods,
  (select count(*) from public.drinks)     as drinks,
  (select count(*) from public.activities) as activities,
  (select count(*) from public.goals)      as goals;
```

Expected: drinks=20, activities=14, goals=14, foods≈120 (matches `FOODS.length`).

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-reference.ts
git commit -m "feat: add reference-data seed script and seed Supabase tables"
```

---

### Task A5: Row types + reference-data loader with fallback

**Files:**
- Create: `src/lib/db-types.ts`, `src/lib/reference-data.ts`

- [ ] **Step 1: Create `src/lib/db-types.ts` (reference-table rows only for now)**

```typescript
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
```

- [ ] **Step 2: Create `src/lib/reference-data.ts`**

```typescript
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
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors. (If `FoodItem`/`DrinkItem` are not exported from `foods.ts`/`drinks.ts`, they already are — `FoodItem` in `src/lib/foods.ts:1`, `DrinkItem` in `src/lib/drinks.ts:5`.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/db-types.ts src/lib/reference-data.ts
git commit -m "feat: add reference-data loader with code-array fallback and caching"
```

---

### Task A6: ReferenceDataContext provider

**Files:**
- Create: `src/lib/ReferenceDataContext.tsx`

- [ ] **Step 1: Create the context**

```tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { fetchReferenceData, FALLBACK_REFERENCE, type ReferenceData } from "./reference-data";

const ReferenceDataContext = createContext<ReferenceData>(FALLBACK_REFERENCE);

export function ReferenceDataProvider({ children }: { children: React.ReactNode }) {
  // Start with instant offline defaults, then refresh from Supabase.
  const [data, setData] = useState<ReferenceData>(FALLBACK_REFERENCE);

  useEffect(() => {
    let active = true;
    fetchReferenceData().then((d) => { if (active) setData(d); });
    return () => { active = false; };
  }, []);

  return <ReferenceDataContext.Provider value={data}>{children}</ReferenceDataContext.Provider>;
}

export function useReferenceData(): ReferenceData {
  return useContext(ReferenceDataContext);
}
```

- [ ] **Step 2: Wrap `App` content in the provider**

In `src/components/App.tsx`, add the import after the existing `@/lib` imports:

```typescript
import { ReferenceDataProvider } from "@/lib/ReferenceDataContext";
```

Then wrap the two render branches. Change the `if (!profile)` return and the main return so both are inside the provider. Replace:

```tsx
  if (!profile) {
    return <Onboarding onComplete={handleOnboard} />;
  }

  return (
    <div className="size-full bg-[#f8f9fa] flex flex-col">
```

with:

```tsx
  if (!profile) {
    return (
      <ReferenceDataProvider>
        <Onboarding onComplete={handleOnboard} />
      </ReferenceDataProvider>
    );
  }

  return (
    <ReferenceDataProvider>
    <div className="size-full bg-[#f8f9fa] flex flex-col">
```

And close the provider at the very end of the main return. Replace the final:

```tsx
    </div>
  );
}
```

(the one immediately before `function NavBtn`) with:

```tsx
    </div>
    </ReferenceDataProvider>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ReferenceDataContext.tsx src/components/App.tsx
git commit -m "feat: add ReferenceDataProvider and wrap app shell"
```

---

### Task A7: Wire FoodPicker to context foods

**Files:**
- Modify: `src/components/FoodPicker.tsx`

- [ ] **Step 1: Read the current file to find the FOODS import and usage**

```bash
grep -n "FOODS\|import" src/components/FoodPicker.tsx
```

- [ ] **Step 2: Replace the static FOODS import with the context**

In `src/components/FoodPicker.tsx`, remove the line:

```typescript
import { FOODS } from "@/lib/foods";
```

Keep any `import type { FoodItem } from "@/lib/foods";` (the type is still needed). Add:

```typescript
import { useReferenceData } from "@/lib/ReferenceDataContext";
```

Then inside the component function body (top, before any use of `FOODS`), add:

```typescript
  const { foods: FOODS } = useReferenceData();
```

This shadows the old module-level name so the rest of the component body is unchanged.

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both succeed. FoodPicker now lists foods from Supabase when online, code array when offline.

- [ ] **Step 4: Commit**

```bash
git add src/components/FoodPicker.tsx
git commit -m "feat: source FoodPicker catalogue from reference-data context"
```

---

### Task A8: Wire goals lists (Onboarding + EditProfile) to context

**Files:**
- Modify: `src/components/Onboarding.tsx`, `src/components/EditProfile.tsx`

- [ ] **Step 1: Inspect both files' GOALS usage**

```bash
grep -n "GOALS\|from \"@/lib/goals\"\|from '@/lib/goals'" src/components/Onboarding.tsx src/components/EditProfile.tsx
```

- [ ] **Step 2: Onboarding — swap the import for the context**

In `src/components/Onboarding.tsx`, remove:

```typescript
import { GOALS } from "@/lib/goals";
```

Add:

```typescript
import { useReferenceData } from "@/lib/ReferenceDataContext";
```

Inside the component body (top), add:

```typescript
  const { goals: GOALS } = useReferenceData();
```

- [ ] **Step 3: EditProfile — same swap (only if it imports GOALS)**

If Step 1 showed `EditProfile.tsx` imports `GOALS`, apply the identical change there: remove `import { GOALS } from "@/lib/goals";`, add `import { useReferenceData } from "@/lib/ReferenceDataContext";`, and add `const { goals: GOALS } = useReferenceData();` at the top of the component body. If it does not import GOALS, skip this step.

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Onboarding.tsx src/components/EditProfile.tsx
git commit -m "feat: source goals lists from reference-data context"
```

**Phase A complete — reference data now lives in Supabase tables, app reads them online and falls back to code arrays offline.**

---

# PHASE B — Opt-in User Data Sync

### Task B1: Add `shareData` to UserProfile + user row types

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db-types.ts`

- [ ] **Step 1: Add `shareData` to `UserProfile`**

In `src/lib/types.ts`, change the `UserProfile` interface (currently ends at `smartHydrationEnabled?: boolean;`) to add one field:

```typescript
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
```

- [ ] **Step 2: Append user row types to `src/lib/db-types.ts`**

Add at the end of the file:

```typescript
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
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors (the new optional field doesn't break existing profile construction).

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/db-types.ts
git commit -m "feat: add shareData to UserProfile and profile/log row types"
```

---

### Task B2: Create user tables (profiles, logs) + RLS

**Files:**
- Create: `supabase/migrations/0003_user_tables.sql`, `supabase/migrations/0004_user_rls.sql`

- [ ] **Step 1: Write `0003_user_tables.sql`**

```sql
-- 0003_user_tables.sql

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  age smallint,
  weight_kg numeric(5,1),
  height_cm numeric(5,1),
  goals text[] not null default '{}',
  store_thumbnails boolean not null default false,
  hydration_target_ml int,
  fiber_target_g int,
  smart_hydration_enabled boolean not null default true,
  share_data boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.logs (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('meal','exercise','stool','water')),
  logged_at timestamptz not null,
  note text,
  share_data boolean not null default false,
  food_id uuid references public.foods(id),
  food_name text,
  cuisine text,
  tags text[] default '{}',
  calories_min int,
  calories_max int,
  fiber_g numeric(5,1),
  activity_id text references public.activities(id),
  activity_name text,
  intensity text check (intensity in ('low','medium','high')),
  duration_min int,
  calories_burned int,
  met numeric(4,1),
  bristol smallint check (bristol between 1 and 7),
  urgency text check (urgency in ('low','medium','high')),
  ease text check (ease in ('easy','normal','strained')),
  color text check (color in ('brown','light-brown','yellow-brown','pale-yellow','green','black','red','unknown')),
  drink_id text references public.drinks(id),
  ml int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists logs_user_logged on public.logs (user_id, logged_at desc);
create index if not exists logs_tags_gin on public.logs using gin (tags);
create index if not exists logs_food_id on public.logs (food_id);
create index if not exists logs_drink_id on public.logs (drink_id);
create index if not exists logs_activity_id on public.logs (activity_id);
```

- [ ] **Step 2: Apply via MCP `apply_migration`** with `name: "user_tables"`.

- [ ] **Step 3: Write `0004_user_rls.sql`**

```sql
-- 0004_user_rls.sql

alter table public.profiles enable row level security;
alter table public.logs     enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

create policy "logs_select_own" on public.logs for select using (auth.uid() = user_id);
create policy "logs_insert_own" on public.logs for insert with check (auth.uid() = user_id);
create policy "logs_update_own" on public.logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "logs_delete_own" on public.logs for delete using (auth.uid() = user_id);
```

- [ ] **Step 4: Apply via MCP `apply_migration`** with `name: "user_rls"`.

- [ ] **Step 5: Verify RLS + tables via MCP `execute_sql`**

```sql
select relname, relrowsecurity from pg_class
where relname in ('profiles','logs') order by relname;
```

Expected: both rows show `relrowsecurity = true`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0003_user_tables.sql supabase/migrations/0004_user_rls.sql
git commit -m "feat: add profiles and logs tables with owner-only RLS"
```

---

### Task B3: Pure log↔row mappers + Vitest tests

**Files:**
- Create: `src/lib/sync-mappers.ts`, `src/lib/__tests__/sync-mappers.test.ts`, `vitest.config.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write the failing test `src/lib/__tests__/sync-mappers.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { logToRow, rowToLog } from "../sync-mappers";
import type { AnyLog } from "../types";

const USER = "11111111-1111-1111-1111-111111111111";

const samples: AnyLog[] = [
  { id: "a", type: "meal", timestamp: 1_700_000_000_000, foodName: "Laksa", cuisine: "Singaporean", tags: ["Spicy"], caloriesMin: 550, caloriesMax: 800, fiberG: 2.5, note: "hot" },
  { id: "b", type: "exercise", timestamp: 1_700_000_100_000, activity: "Walk", intensity: "medium", durationMin: 30, caloriesBurned: 120, met: 3.5 },
  { id: "c", type: "stool", timestamp: 1_700_000_200_000, bristol: 4, urgency: "low", ease: "easy", color: "brown" },
  { id: "d", type: "water", timestamp: 1_700_000_300_000, ml: 250, drinkId: "coffee" },
];

describe("sync mappers round-trip", () => {
  for (const log of samples) {
    it(`round-trips a ${log.type} log`, () => {
      const row = logToRow(log, USER, true);
      expect(row.user_id).toBe(USER);
      expect(row.share_data).toBe(true);
      const back = rowToLog(row);
      expect(back).toEqual(log);
    });
  }

  it("maps logged_at to/from epoch ms", () => {
    const row = logToRow(samples[0], USER, false);
    expect(row.logged_at).toBe(new Date(1_700_000_000_000).toISOString());
    expect(rowToLog(row).timestamp).toBe(1_700_000_000_000);
  });
});
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
npm test
```

Expected: FAIL — `logToRow`/`rowToLog` not found.

- [ ] **Step 4: Implement `src/lib/sync-mappers.ts`**

```typescript
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
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
npm test
```

Expected: PASS — all round-trip cases green.

- [ ] **Step 6: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts src/lib/sync-mappers.ts src/lib/__tests__/sync-mappers.test.ts
git commit -m "feat: add pure log<->row sync mappers with Vitest round-trip tests"
```

---

### Task B4: Auth + profile sync orchestration

**Files:**
- Create: `src/lib/sync.ts`

- [ ] **Step 1: Create `src/lib/sync.ts` with auth + profile functions**

```typescript
import { supabase, isSupabaseConfigured } from "./supabase";
import type { UserProfile } from "./types";
import type { ProfileRow } from "./db-types";

// Ensures an anonymous Supabase session exists; returns the user id, or null if
// Supabase is unconfigured or sign-in fails (offline). Safe to call on every load.
export async function ensureAnonymousAuth(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) return sessionData.session.user.id;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

function profileToRow(p: UserProfile, userId: string): ProfileRow {
  return {
    id: userId,
    age: p.age ?? null,
    weight_kg: p.weightKg ?? null,
    height_cm: p.heightCm ?? null,
    goals: p.goals,
    store_thumbnails: p.storeThumbnails,
    hydration_target_ml: p.hydrationTargetMl ?? null,
    fiber_target_g: p.fiberTargetG ?? null,
    smart_hydration_enabled: p.smartHydrationEnabled ?? true,
    share_data: p.shareData ?? false,
    onboarded_at: p.onboardedAt ? new Date(p.onboardedAt).toISOString() : null,
  };
}

// Upserts the profile row. No-op when Supabase is unavailable.
export async function syncProfile(profile: UserProfile, userId: string | null): Promise<void> {
  if (!userId || !isSupabaseConfigured()) return;
  try {
    await supabase.from("profiles").upsert(profileToRow(profile, userId), { onConflict: "id" });
  } catch {
    /* offline — ignore, IndexedDB remains source of truth */
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/sync.ts
git commit -m "feat: add anonymous auth and profile sync orchestration"
```

---

### Task B5: Log push / pull / delete sync

**Files:**
- Modify: `src/lib/sync.ts`

- [ ] **Step 1: Append log-sync functions to `src/lib/sync.ts`**

Add these imports to the top of `src/lib/sync.ts` (merge with the existing import block):

```typescript
import type { AnyLog } from "./types";
import type { LogRow } from "./db-types";
import { logToRow, rowToLog } from "./sync-mappers";
```

Append at the end of the file:

```typescript
// Upserts all logs for the user (idempotent by id). share_data is stamped from
// the caller's current consent. No-op when Supabase is unavailable.
export async function pushLogs(logs: AnyLog[], userId: string | null, shareData: boolean): Promise<void> {
  if (!userId || !isSupabaseConfigured() || logs.length === 0) return;
  try {
    const rows = logs.map((l) => logToRow(l, userId, shareData));
    await supabase.from("logs").upsert(rows, { onConflict: "id" });
  } catch {
    /* offline — ignore */
  }
}

// Pulls non-deleted remote logs the device doesn't have locally. Returns rows to
// be inserted into IndexedDB by the caller. Returns [] on any failure.
export async function pullMissingLogs(userId: string | null, localIds: Set<string>): Promise<AnyLog[]> {
  if (!userId || !isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("logs").select("*").is("deleted_at", null);
    if (error || !data) return [];
    return (data as LogRow[]).filter((r) => !localIds.has(r.id)).map(rowToLog);
  } catch {
    return [];
  }
}

// Hard-deletes a remote log by id. No-op when Supabase is unavailable.
export async function deleteRemoteLog(id: string, userId: string | null): Promise<void> {
  if (!userId || !isSupabaseConfigured()) return;
  try {
    await supabase.from("logs").delete().eq("id", id);
  } catch {
    /* offline — ignore */
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/sync.ts
git commit -m "feat: add log push, pull-missing, and remote delete sync"
```

---

### Task B6: Bootstrap auth + sync in App

**Files:**
- Modify: `src/components/App.tsx`

Context: On load, establish anonymous auth and upsert the profile. If `shareData` is on, pull missing remote logs into IndexedDB and push local logs up. Thread a `userId` through so save/delete can sync. `saveLog` to IndexedDB lives in `storage.ts`; `getAllLogs`/`getProfile`/`deleteLog` are already imported here.

- [ ] **Step 1: Add imports and the `saveLog` import**

In `src/components/App.tsx`, extend the `@/lib/storage` import to include `saveLog`:

```typescript
import {
  getAllLogs,
  getProfile,
  saveProfile,
  deleteLog,
  saveLog,
} from "@/lib/storage";
```

Add after the storage import:

```typescript
import {
  ensureAnonymousAuth,
  syncProfile,
  pushLogs,
  pullMissingLogs,
  deleteRemoteLog,
} from "@/lib/sync";
```

- [ ] **Step 2: Add a `userId` state**

After the existing `const [profile, setProfile] = useState<UserProfile | null>(null);` line, add:

```typescript
  const [userId, setUserId] = useState<string | null>(null);
```

- [ ] **Step 3: Replace the initial load effect to bootstrap auth + sync**

Replace the existing effect:

```typescript
  useEffect(() => {
    (async () => {
      const [p, l] = await Promise.all([getProfile(), getAllLogs()]);
      setProfile(p);
      setLogs(l);
      setLoaded(true);
    })();
  }, []);
```

with:

```typescript
  useEffect(() => {
    (async () => {
      const [p, l] = await Promise.all([getProfile(), getAllLogs()]);
      setProfile(p);
      setLogs(l);
      setLoaded(true);

      // Establish anonymous identity (no-op offline / unconfigured).
      const uid = await ensureAnonymousAuth();
      setUserId(uid);
      if (uid && p) {
        await syncProfile(p, uid);
        if (p.shareData) {
          const localIds = new Set(l.map((x) => x.id));
          const missing = await pullMissingLogs(uid, localIds);
          for (const m of missing) await saveLog(m);
          const merged = missing.length ? await getAllLogs() : l;
          if (missing.length) setLogs(merged);
          await pushLogs(merged, uid, true);
        }
      }
    })();
  }, []);
```

- [ ] **Step 4: Sync new/edited logs after save**

Replace the existing `refreshLogs`:

```typescript
  const refreshLogs = async () => setLogs(await getAllLogs());
```

with:

```typescript
  const refreshLogs = async () => {
    const l = await getAllLogs();
    setLogs(l);
    if (profile?.shareData && userId) await pushLogs(l, userId, true);
  };
```

- [ ] **Step 5: Sync deletes**

Replace the existing `handleDeleteLog`:

```typescript
  const handleDeleteLog = async (id: string) => {
    await deleteLog(id);
    refreshLogs();
  };
```

with:

```typescript
  const handleDeleteLog = async (id: string) => {
    await deleteLog(id);
    if (profile?.shareData && userId) await deleteRemoteLog(id, userId);
    setLogs(await getAllLogs());
  };
```

- [ ] **Step 6: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add src/components/App.tsx
git commit -m "feat: bootstrap anonymous auth and opt-in log sync in App"
```

---

### Task B7: Cloud-sync opt-in toggle in Settings

**Files:**
- Modify: `src/components/Settings.tsx`

Context: `Settings` receives `profile` and `onProfileChange` and persists via `saveProfile`. It already has toggle patterns (`toggleSmart`, `toggleThumbs`) and a `Section`/`Row` layout. Add a "Cloud sync" section with a `share_data` toggle. When turned ON, the App's `refreshLogs`/effect handles the actual push on next change; to push immediately we also call `saveProfile` then trigger a profile change so App re-syncs. Keep it simple: persist the flag; App pushes on the next log change and on next load. Add an explanatory note about anonymous, opt-in sharing.

- [ ] **Step 1: Add a `Cloud` icon import**

In `src/components/Settings.tsx`, extend the lucide import to include `Cloud`:

```typescript
import { Download, Trash2, Camera, Pencil, Droplet, Leaf, Cloud } from "lucide-react";
```

- [ ] **Step 2: Add a toggle handler**

After the existing `toggleSmart` handler, add:

```typescript
  const toggleShareData = async () => {
    const next = { ...profile, shareData: !profile.shareData };
    await saveProfile(next);
    onProfileChange(next);
  };
```

- [ ] **Step 3: Add the Cloud sync section**

Insert this block immediately before the `<Section title="Data">` block:

```tsx
      <Section title="Cloud sync">
        <button onClick={toggleShareData} className="w-full flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Cloud className="w-5 h-5 text-[#1967d2]" />
            <div className="text-left">
              <div className="text-[#202124]">Share data to improve diagnosis</div>
              <div className="text-xs text-[#5f6368]">Opt-in. Syncs your logs anonymously to our servers.</div>
            </div>
          </div>
          <div className={`w-11 h-6 rounded-full p-0.5 ${profile.shareData ? "bg-[#34A853]" : "bg-[#dadce0]"}`}>
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${profile.shareData ? "translate-x-5" : ""}`} />
          </div>
        </button>
        {profile.shareData && (
          <div className="bg-[#e8f0fe] rounded-xl px-3 py-2 mb-2 text-xs text-[#1967d2]">
            Your logs sync to our database under an anonymous ID to help improve gut-score accuracy, correlation analysis, and SAI. No name or email is attached. Turn off any time to stop syncing.
          </div>
        )}
      </Section>
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Settings.tsx
git commit -m "feat: add opt-in cloud-sync toggle to Settings"
```

---

### Task B8: Manual end-to-end verification + push

**Files:** none (verification only)

- [ ] **Step 1: Run the full check suite**

```bash
npx tsc --noEmit && npm test && npm run build
```

Expected: types clean, Vitest green, build succeeds.

- [ ] **Step 2: Manual smoke (dev server)**

```bash
npm run dev
```

Then in the browser:
1. Complete onboarding → confirm the app loads (FoodPicker shows foods, goals list populated from context).
2. Open Settings → toggle "Share data" ON.
3. Add a meal, a stool, a drink, and an exercise log.
4. Via Supabase MCP `execute_sql`, confirm rows landed and consent stamped:

```sql
select type, count(*) from public.logs group by type order by type;
select id, share_data from public.logs limit 5;
```

Expected: 4 type rows; `share_data = true` on the new logs.
5. Delete one log in the UI → re-run the count query → that row is gone remotely.
6. Toggle "Share data" OFF, add another log → confirm it does NOT appear in `public.logs`.

- [ ] **Step 3: Push the branch**

```bash
git push -u origin feature/supabase-integration
```

- [ ] **Step 4: Confirm Vercel preview build starts** (the env vars `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set in the Vercel project for the preview to talk to Supabase; reference data + sync degrade gracefully to offline if absent).

**Phase B complete — users can opt in to anonymous cloud sync; data flows to the star-schema tables under owner-only RLS.**

---

## Self-Review notes

- **Spec coverage:** foods/drinks/activities/goals tables (A2) + seed (A4) + RLS (A3); profiles/logs (B2) + RLS (B4); wide single `logs` fact (B2); separate `urgency`/`ease`/`color` columns (B2); no synced thumbnails — mappers omit any image field (B3); anonymous auth with server-minted id (B4); client-generated `logs.id` for idempotent upsert (B3/B5); `share_data` opt-in + per-log consent snapshot (B7/B3); offline fallback to code arrays (A5); code arrays retained as seed source (A4, unchanged files). Stool dimension intentionally absent (Q4). All covered.
- **Env caveat:** the live DB tasks (A2–A4, B2) and verification require the target Supabase project's keys and the Supabase MCP connection; confirm project before A2.
- **Type consistency:** `logToRow(log, userId, shareData)` / `rowToLog(row)` signatures are stable across B3/B5/B6; `LogRow`/`ProfileRow` defined in B1 before first use; `ReferenceData`/`useReferenceData` stable across A5–A8.

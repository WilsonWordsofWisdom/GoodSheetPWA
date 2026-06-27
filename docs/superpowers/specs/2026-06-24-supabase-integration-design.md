# Supabase Integration — Data Model & Sync Design

**Goal:** Connect the offline-first GoodSheet PWA to Supabase: move hardcoded reference data into proper tables (Sub-epic A) and add opt-in, anonymous-auth user data sync (Sub-epic B). IndexedDB remains the primary store; Supabase is additive and opt-in.

**Scope:** Sub-epics A and B only. Community/aggregate intelligence (Sub-epic C) is explicitly deferred — this design only flags the hooks (`share_data` flags, FK columns) that C will later build on.

**Architecture:** Classic star schema. One wide `logs` fact table at the centre, surrounded by catalogue dimensions (`foods`, `drinks`, `activities`, `goals`) and the user dimension (`profiles`). Reference dimensions are world-readable; user data is protected by row-level security (RLS) scoped to the authenticated user.

**Tech stack:** Next.js 15 App Router PWA, `@supabase/supabase-js`, Supabase Postgres + Auth (anonymous sign-in) + RLS. No server-rendered secrets — the app ships only the anon public key.

---

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| Q1 | Fact table shape | **One wide `logs` table** — mirrors the IndexedDB single store and CSV export; simplest sync. |
| Q2 | Thumbnails | **Local-only, never synced.** Sync only the corresponding metadata (e.g. `bristol`, `food_name`). No `thumbnail` column in Postgres. |
| Q3 | Identity | **Supabase anonymous auth.** Server-minted UUID, no signup. Email-linking deferred. |
| Q4 | Stool dimension | **None.** Bristol/colour/urgency/ease are degenerate dimensions (constrained columns) on the fact table; `bristol.ts` / `stool-color.ts` stay in code. |
| — | Stool attribute columns | `urgency`, `ease`, `color` are **three separate columns**, each independently constrained. |

### Identity & collision handling (Q3 detail)

- `profiles.id = auth.users.id` is generated **server-side by Supabase Auth (GoTrue)** as a v4 UUID, guaranteed unique within the project. Two devices signing in anonymously cannot collide — the server mints each id.
- `logs.id` stays **client-generated** (`crypto.randomUUID()`, v4, 122 bits of entropy) so offline sync is idempotent: re-syncing the same log upserts by `id` rather than duplicating. It is the PK, so the DB rejects any duplicate regardless.
- Accepted v1 tradeoff: an anonymous user who clears local storage / reinstalls gets a **new** identity unless an email is later linked. Email-linking is out of scope for this epic.

---

## Dimension tables — Sub-epic A (reference data, public read)

Replace the hardcoded arrays in `foods.ts`, `drinks.ts`, `exercise-calories.ts`, `goals.ts`. The code-side arrays become a **seed source** (a one-time migration inserts them) and an **offline fallback** (the app ships the catalogue so it works with zero network, then refreshes from the table when online).

### `foods` (from `foods.ts`, ~120 rows)
| column | type | constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `name` | text | not null |
| `cuisine` | text | not null |
| `kcal_min` | int | not null |
| `kcal_max` | int | not null |
| `fiber_g` | numeric(4,1) | not null |
| `tags` | text[] | not null default `'{}'`, GIN index |
| `is_active` | bool | not null default true |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |
| | | unique(`name`, `cuisine`) |

### `drinks` (from `drinks.ts`, 20 rows)
| column | type | constraints |
|---|---|---|
| `id` | text | PK — keep slug (`'coffee'`); `logs.drink_id` already stores it |
| `name` | text | not null |
| `category` | text | not null, check in (water, juice, smoothie, hot-drink, dairy, alcohol, sports) |
| `fiber_g_per_100ml` | numeric(4,2) | not null |
| `hydration_factor` | numeric(3,2) | not null |
| `gut_tags` | text[] | not null default `'{}'` (caffeine/lactose/alcohol/fructose/gluten) |
| `is_active` | bool | not null default true |
| `created_at` / `updated_at` | timestamptz | default `now()` |

### `activities` (from `exercise-calories.ts`, ~14 rows)
| column | type | constraints |
|---|---|---|
| `id` | text | PK — slug (`'walk'`) |
| `name` | text | not null (`'Walk'`) |
| `met_low` | numeric(3,1) | not null |
| `met_medium` | numeric(3,1) | not null |
| `met_high` | numeric(3,1) | not null |
| `description` | text | |
| `is_active` | bool | not null default true |
| `created_at` / `updated_at` | timestamptz | default `now()` |

### `goals` (from `goals.ts`, 14 rows)
| column | type | constraints |
|---|---|---|
| `id` | smallint | PK (generated identity) |
| `label` | text | not null, unique |
| `sort_order` | smallint | not null |
| `is_active` | bool | not null default true |

---

## User dimension + fact — Sub-epic B (RLS, owner-only)

### `profiles` (the user dimension — mirrors `UserProfile` + auth identity)
| column | type | constraints |
|---|---|---|
| `id` | uuid | PK, references `auth.users(id)` on delete cascade |
| `age` | smallint | |
| `weight_kg` | numeric(5,1) | |
| `height_cm` | numeric(5,1) | |
| `goals` | text[] | not null default `'{}'` (label values from `goals.label`) |
| `store_thumbnails` | bool | not null default false |
| `hydration_target_ml` | int | |
| `fiber_target_g` | int | |
| `smart_hydration_enabled` | bool | not null default true |
| `share_data` | bool | not null default false — **the opt-in flag for this epic** |
| `onboarded_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | default `now()` |

### `logs` (the fact table — mirrors the `AnyLog` union; one wide table)
| column | type | applies to | constraints |
|---|---|---|---|
| `id` | uuid | all | PK, client-generated |
| `user_id` | uuid | all | not null, references `profiles(id)` on delete cascade |
| `type` | text | all | not null, check in (meal, exercise, stool, water) |
| `logged_at` | timestamptz | all | not null |
| `note` | text | all | |
| `share_data` | bool | all | not null default false — snapshot of consent at log time |
| `food_id` | uuid | meal | references `foods(id)`, nullable |
| `food_name` | text | meal | denormalized snapshot |
| `cuisine` | text | meal | denormalized snapshot |
| `tags` | text[] | meal | default `'{}'`, GIN index |
| `calories_min` | int | meal | |
| `calories_max` | int | meal | |
| `fiber_g` | numeric(5,1) | meal + water | |
| `activity_id` | text | exercise | references `activities(id)`, nullable |
| `activity_name` | text | exercise | denormalized snapshot |
| `intensity` | text | exercise | check in (low, medium, high) |
| `duration_min` | int | exercise | |
| `calories_burned` | int | exercise | |
| `met` | numeric(4,1) | exercise | |
| `bristol` | smallint | stool | check between 1 and 7 |
| `urgency` | text | stool | check in (low, medium, high) |
| `ease` | text | stool | check in (easy, normal, strained) |
| `color` | text | stool | check in (brown, light-brown, yellow-brown, pale-yellow, green, black, red, unknown) |
| `drink_id` | text | water | references `drinks(id)`, nullable |
| `ml` | int | water | |
| `created_at` / `updated_at` | timestamptz | all | default `now()` |
| `deleted_at` | timestamptz | all | nullable — soft-delete tombstone for sync |

Indexes: `(user_id, logged_at desc)`, GIN on `tags`, plus `food_id` / `drink_id` / `activity_id`.

**Why denormalized snapshots** (`food_name`, `cuisine`, calories copied onto the log even though `food_id` exists): offline-first means a log can reference a food before the catalogue syncs; users log free-text/tag-only meals with no `food_id`; and historical logs must not change if a catalogue value is later corrected. The FK exists purely for analytics joins (Sub-epic C). No image data is ever synced (Q2) — only this metadata.

---

## Relationships (the star's spokes)

- `logs.user_id` → `profiles.id` (many logs per user)
- `logs.food_id` → `foods.id` (nullable)
- `logs.drink_id` → `drinks.id` (nullable)
- `logs.activity_id` → `activities.id` (nullable)
- `profiles.id` → `auth.users.id` (1:1, identity)
- `profiles.goals[]` holds `goals.label` values (loose array reference, not a FK)

---

## Row-level security

| table | RLS | policies |
|---|---|---|
| `profiles` | **on** | SELECT/INSERT/UPDATE/DELETE where `id = auth.uid()` |
| `logs` | **on** | SELECT/INSERT/UPDATE/DELETE where `user_id = auth.uid()` |
| `foods` | **on** | SELECT to `anon` + `authenticated`; writes `service_role` only |
| `drinks` | **on** | same as `foods` |
| `activities` | **on** | same as `foods` |
| `goals` | **on** | same as `foods` |

Research access to opted-in rows (`share_data = true`) will happen server-side via `service_role` / a dedicated anonymized view — never through user-facing RLS. That belongs to Sub-epic C and is out of scope here.

---

## Sync strategy (offline-first, opt-in)

1. **IndexedDB stays primary.** All reads/writes hit IndexedDB first; the UI never blocks on the network. This preserves the existing zero-cloud guarantee for users who never opt in.
2. **Anonymous auth on first launch.** On first run the app calls `supabase.auth.signInAnonymously()` and creates the matching `profiles` row. This happens regardless of opt-in so the identity exists, but no log data leaves the device until the user opts in.
3. **Opt-in toggle in Settings** (`share_data`). When enabled:
   - Existing local logs are pushed (upsert by `id`).
   - New/edited logs are mirrored to Supabase after the local write succeeds.
   - Deletes set `deleted_at` (tombstone) and sync.
4. **Opt-out.** Disabling `share_data` stops future sync. (Whether to also purge already-synced rows is a Sub-epic C/privacy-policy decision — out of scope; v1 simply stops syncing.)
5. **Reference data refresh.** Catalogues load from the shipped code arrays instantly (offline), then refresh from `foods`/`drinks`/`activities`/`goals` when online and cache the result.

---

## Data migration (hardcoded → tables)

- A one-time SQL seed migration inserts the current `foods.ts`, `drinks.ts`, `exercise-calories.ts`, and `goals.ts` contents into their tables.
- The code arrays are **retained** as the offline fallback / seed source — they are not deleted. The app prefers the table when online and falls back to the array when offline or on fetch failure.

---

## Out of scope (deferred to Sub-epic C)

- Aggregate/community analytics, population gut-score calibration, SAI training on shared data.
- Email/password linking and account recovery.
- Purging previously-synced rows on opt-out.
- `bristol_types` / `stool_colors` lookup tables (add only if C needs DB-driven labels).

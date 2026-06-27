import { supabase, isSupabaseConfigured } from "./supabase";
import type { UserProfile, AnyLog } from "./types";
import type { ProfileRow, LogRow } from "./db-types";
import { logToRow, rowToLog } from "./sync-mappers";

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

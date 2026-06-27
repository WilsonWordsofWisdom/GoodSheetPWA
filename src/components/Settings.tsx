"use client";
import { useState } from "react";
import { Download, Trash2, Camera, Pencil, Droplet, Leaf, Cloud } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { exportCsv, clearAll, saveProfile } from "@/lib/storage";
import { EditProfile } from "./EditProfile";

interface Props {
  profile: UserProfile;
  onProfileChange: (p: UserProfile) => void;
  onCleared: () => void;
}

export function Settings({ profile, onProfileChange, onCleared }: Props) {
  const [editing, setEditing] = useState(false);

  const handleProfileSave = async (next: UserProfile) => {
    await saveProfile(next);
    onProfileChange(next);
  };

  const toggleThumbs = async () => {
    const next = { ...profile, storeThumbnails: !profile.storeThumbnails };
    await saveProfile(next);
    onProfileChange(next);
  };

  const toggleSmart = async () => {
    const next = { ...profile, smartHydrationEnabled: !(profile.smartHydrationEnabled !== false) };
    await saveProfile(next);
    onProfileChange(next);
  };

  const toggleShareData = async () => {
    const next = { ...profile, shareData: !profile.shareData };
    await saveProfile(next);
    onProfileChange(next);
  };

  const setHydrationTarget = async (val: number) => {
    if (isNaN(val) || val <= 0) return;
    const next = { ...profile, hydrationTargetMl: val };
    await saveProfile(next);
    onProfileChange(next);
  };

  const setFibreTarget = async (val: number) => {
    if (isNaN(val) || val <= 0) return;
    const next = { ...profile, fiberTargetG: val };
    await saveProfile(next);
    onProfileChange(next);
  };

  const handleExport = async () => {
    const csv = await exportCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gutloop-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = async () => {
    if (!confirm("Delete all logs and reset onboarding? This cannot be undone.")) return;
    await clearAll();
    onCleared();
  };

  const smartEnabled = profile.smartHydrationEnabled !== false;
  const hydrationTarget = profile.hydrationTargetMl ?? 2000;
  const fibreTarget = profile.fiberTargetG ?? 25;

  return (
    <div className="space-y-4">
      <Section title="Profile">
        <Row label="Age" value={profile.age ? `${profile.age}` : "—"} />
        <Row label="Weight" value={profile.weightKg ? `${profile.weightKg} kg` : "—"} />
        <Row label="Height" value={profile.heightCm ? `${profile.heightCm} cm` : "—"} />
        <Row label="Goals" value={profile.goals.length ? profile.goals.join(", ") : "—"} />
        <button
          onClick={() => setEditing(true)}
          className="w-full flex items-center justify-end gap-2 py-3 text-xs text-[#1967d2]"
        >
          <Pencil className="w-3.5 h-3.5" />Edit profile
        </button>
      </Section>

      {editing && (
        <EditProfile
          profile={profile}
          onClose={() => setEditing(false)}
          onSave={handleProfileSave}
        />
      )}

      <Section title="Hydration">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Droplet className="w-5 h-5 text-[#1967d2]" />
            <div>
              <div className="text-[#202124]">Daily target</div>
              <div className="text-xs text-[#5f6368]">Baseline: 2,000 ml (EFSA 2010)</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={500}
              max={5000}
              step={50}
              defaultValue={hydrationTarget}
              onBlur={(e) => setHydrationTarget(parseInt(e.target.value))}
              className="w-20 text-right px-2 py-1 rounded-lg border border-[#dadce0] text-sm text-[#1967d2] font-medium focus:outline-none focus:border-[#1967d2]"
            />
            <span className="text-xs text-[#5f6368]">ml</span>
          </div>
        </div>
        <button onClick={toggleSmart} className="w-full flex items-center justify-between py-3">
          <div className="text-left">
            <div className="text-[#202124]">Smart adjustment</div>
            <div className="text-xs text-[#5f6368]">Raises target when stools are firm or strained</div>
          </div>
          <div className={`w-11 h-6 rounded-full p-0.5 ${smartEnabled ? "bg-[#34A853]" : "bg-[#dadce0]"}`}>
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${smartEnabled ? "translate-x-5" : ""}`} />
          </div>
        </button>
        {smartEnabled && (
          <div className="bg-[#fffbeb] rounded-xl px-3 py-2 mb-2 text-xs text-[#92400e] space-y-1">
            <div>+250 ml if ≥2 stools are Bristol 1–3 in last 7 days</div>
            <div>+250 ml if ≥2 passages were strained in last 7 days</div>
            <div className="text-[#b45309]">Max auto-raise: +500 ml above your baseline</div>
          </div>
        )}
      </Section>

      <Section title="Dietary Fibre">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Leaf className="w-5 h-5 text-[#34A853]" />
            <div>
              <div className="text-[#202124]">Daily target</div>
              <div className="text-xs text-[#5f6368]">Recommended: 25g/day (WHO 2003)</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={10}
              max={60}
              step={1}
              defaultValue={fibreTarget}
              onBlur={(e) => setFibreTarget(parseInt(e.target.value))}
              className="w-16 text-right px-2 py-1 rounded-lg border border-[#dadce0] text-sm text-[#34A853] font-medium focus:outline-none focus:border-[#34A853]"
            />
            <span className="text-xs text-[#5f6368]">g</span>
          </div>
        </div>
      </Section>

      <Section title="Photos">
        <button onClick={toggleThumbs} className="w-full flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5 text-[#5f6368]" />
            <div className="text-left">
              <div className="text-[#202124]">Store thumbnails</div>
              <div className="text-xs text-[#5f6368]">Compressed copies for visual recall</div>
            </div>
          </div>
          <div className={`w-11 h-6 rounded-full p-0.5 ${profile.storeThumbnails ? "bg-[#34A853]" : "bg-[#dadce0]"}`}>
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${profile.storeThumbnails ? "translate-x-5" : ""}`} />
          </div>
        </button>
      </Section>

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

      <Section title="Data">
        <button onClick={handleExport} className="w-full flex items-center justify-between py-3 text-[#1967d2]">
          <span className="flex items-center gap-3"><Download className="w-5 h-5" />Export all data for medical reference (csv)</span>
        </button>
        <button onClick={handleClear} className="w-full flex items-center justify-between py-3 text-[#a50e0e]">
          <span className="flex items-center gap-3"><Trash2 className="w-5 h-5" />Delete everything</span>
        </button>
      </Section>

      <p className="text-xs text-[#9aa0a6] text-center">
        Circle Of Life · Zero-Cloud · v0.1 MVP
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8eaed] overflow-hidden">
      <div className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-[#5f6368]">{title}</div>
      <div className="px-4 divide-y divide-[#f1f3f4]">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-[#202124]">{label}</span>
      <span className="text-sm text-[#5f6368]">{value}</span>
    </div>
  );
}

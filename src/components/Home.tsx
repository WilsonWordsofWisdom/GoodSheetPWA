"use client";
import { Timeline } from "./Timeline";
import { StreakCard } from "./StreakCard";
import type { AnyLog, UserProfile } from "@/lib/types";
import {
  gutScore,
  recentExerciseCount,
  goodShitStreak,
} from "@/lib/correlation";
import { fibreToday } from "@/lib/fibre";
import { hydrationToday, smartHydrationTarget } from "@/lib/hydration";
import { Bell, Info, X, PlusCircle, Droplet, Leaf } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  logs: AnyLog[];
  profile?: UserProfile;
  reminders: string[];
  onDeleteLog: (id: string) => void;
  onLogEntry: () => void;
}

export function Home({ logs, profile, reminders, onDeleteLog, onLogEntry }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const score = gutScore(logs, profile);
  const fibreG = fibreToday(logs);
  const fibreTarget = profile?.fiberTargetG ?? 25;
  const exercise = recentExerciseCount(logs);
  const streak = goodShitStreak(logs);

  const baseHydration = profile?.hydrationTargetMl ?? 2000;
  const smartEnabled = profile?.smartHydrationEnabled !== false;
  const hydrationTargetMl = smartEnabled
    ? smartHydrationTarget(logs, baseHydration)
    : baseHydration;
  const hydrationMl = hydrationToday(logs);
  const hydrationPct = Math.min(100, Math.round((hydrationMl / hydrationTargetMl) * 100));
  const fibrePct = Math.min(100, Math.round((fibreG / fibreTarget) * 100));

  const hydrationBumped = smartEnabled && hydrationTargetMl > baseHydration;

  const today = logs.filter((l) => {
    const d = new Date(l.timestamp);
    const n = new Date();
    return d.toDateString() === n.toDateString();
  });

  const latestReminder = reminders[0] ?? null;

  return (
    <div className="space-y-6">
      {latestReminder && (
        <div className="flex items-start gap-3 bg-[#fef7e0] border border-[#f9c845]/40 rounded-2xl px-4 py-3">
          <Bell className="w-4 h-4 text-[#FBBC05] mt-0.5 shrink-0" />
          <p className="text-sm text-[#b06000] font-medium leading-snug">{latestReminder}</p>
        </div>
      )}

      <button
        onClick={onLogEntry}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#4285F4] text-white font-medium shadow-sm hover:bg-[#1967d2] active:scale-[0.98] transition-all"
      >
        <PlusCircle className="w-5 h-5" />
        Log entry
      </button>

      <div className="bg-white rounded-3xl border border-[#e8eaed] p-6 flex flex-col items-center relative overflow-hidden">
        <button
          onClick={() => setShowInfo(true)}
          className="absolute top-4 right-4 p-2 text-[#bdc1c6] hover:text-[#4285F4] transition-colors rounded-full hover:bg-blue-50"
          aria-label="How is this calculated?"
        >
          <Info className="w-5 h-5" />
        </button>
        <GutScoreRing score={score} />
        <p className="text-sm text-[#5f6368] mt-3 text-center max-w-xs">
          {score === 0
            ? "Log a few stools this week to see your score."
            : score >= 70
              ? "You're trending in the optimal range."
              : score >= 40
                ? "Some variability — keep logging to spot patterns."
                : "Mostly outside the optimal range this week."}
        </p>

        {/* Fibre progress bar */}
        <div className="w-full mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-sm font-medium text-[#202124]">
              <Leaf className="w-3.5 h-3.5 text-[#34A853]" />
              Dietary fibre
            </span>
            <span className="text-sm font-medium text-[#34A853]">{fibreG} g / {fibreTarget} g</span>
          </div>
          <div className="h-2.5 bg-[#f1f3f4] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${fibrePct}%`, backgroundColor: fibrePct >= 80 ? "#34A853" : fibrePct >= 40 ? "#FBBC05" : "#EA4335" }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[#9aa0a6]">Target: {fibreTarget}g/day (WHO)</span>
            <span className="text-[10px] text-[#9aa0a6]">{Math.max(0, fibreTarget - fibreG).toFixed(1)}g to go</span>
          </div>
        </div>

        {/* Hydration ring row */}
        {hydrationBumped && (
          <div className="w-full mt-3 flex items-start gap-2 bg-[#fffbeb] rounded-xl px-3 py-2 border border-[#fde68a]">
            <Droplet className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
            <p className="text-xs text-[#92400e] leading-relaxed">
              Target raised to {hydrationTargetMl.toLocaleString()} ml — recent stools suggest you need more water.
            </p>
          </div>
        )}
        <div className="w-full mt-3 flex items-center gap-3 bg-[#f8f9fa] rounded-xl px-3 py-2.5">
          <HydrationRing pct={hydrationPct} />
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-[#202124]">
              <Droplet className="w-3.5 h-3.5" style={{ color: hydrationPct >= 80 ? "#1967d2" : "#d97706" }} />
              Hydration
            </div>
            <div className="text-xs text-[#5f6368]">
              {hydrationMl.toLocaleString()} ml of {hydrationTargetMl.toLocaleString()} ml
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative"
            >
              <button
                onClick={() => setShowInfo(false)}
                className="absolute top-4 right-4 p-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-semibold text-[#202124] mb-4 pr-8">
                How is your Gut Score calculated?
              </h3>
              <div className="space-y-4 text-sm text-[#3c4043] leading-relaxed">
                <div className="bg-[#f8f9fa] rounded-2xl p-4 font-mono text-xs border border-[#e8eaed]">
                  <p className="text-[#4285F4] font-bold mb-1">THE FORMULA (v2):</p>
                  <p className="whitespace-pre-wrap">
                    Score = Blended × 100 × Frequency Bonus{"\n"}
                    {"\n"}
                    Blended = bristol×50% + colour×20%{"\n"}
                    {"         "}+ fibre×20% + hydration×10%{"\n"}
                    {"\n"}
                    Frequency Bonus: up to 1.3× for 7{"\n"}
                    optimal stools/week. Score capped at 100.
                  </p>
                </div>
                <ul className="space-y-2 text-xs">
                  <li><strong>Bristol (50%):</strong> Type 3–5, low urgency, easy passage</li>
                  <li><strong>Colour (20%):</strong> Brown shades score highest</li>
                  <li><strong>Fibre (20%):</strong> 7-day avg vs your {fibreTarget}g target (WHO 2003)</li>
                  <li><strong>Hydration (10%):</strong> 7-day avg vs {hydrationTargetMl.toLocaleString()} ml target (EFSA 2010)</li>
                </ul>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="w-full mt-6 py-3 bg-[#4285F4] text-white rounded-2xl font-medium hover:bg-[#1967d2] transition active:scale-[0.98]"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StreakCard
        current={streak.current}
        best={streak.best}
        goodToday={streak.goodToday}
        score={score}
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Logs today" value={today.length} accent="#4285F4" />
        <Stat label="Exercise 24h" value={exercise} accent="#FBBC05" />
        <Stat label="Stools today" value={today.filter((l) => l.type === "stool").length} accent="#34A853" />
      </div>

      <div>
        <h3 className="text-[#202124] mb-3">Daily Dairy</h3>
        <Timeline logs={logs.slice(0, 30)} onDelete={onDeleteLog} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8eaed] p-3 text-center">
      <div className="text-2xl" style={{ color: accent }}>{value}</div>
      <div className="text-xs text-[#5f6368] mt-1">{label}</div>
    </div>
  );
}

function GutScoreRing({ score }: { score: number }) {
  const size = 160;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#34A853" : score >= 40 ? "#FBBC05" : score > 0 ? "#EA4335" : "#e8eaed";
  const label = score >= 70 ? "Great" : score >= 40 ? "Fair" : score > 0 ? "Low" : "—";
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f3f4" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={progress}
            style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-[#202124]">{score}</span>
          <span className="text-xs font-medium mt-0.5" style={{ color }}>{label}</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-[#202124] mt-2">Gut Score</p>
    </div>
  );
}

function HydrationRing({ pct }: { pct: number }) {
  const size = 52;
  const sw = 6;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? "#1967d2" : pct >= 40 ? "#d97706" : "#EA4335";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8eaed" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-medium" style={{ color }}>{pct}%</span>
      </div>
    </div>
  );
}

import type { AnyLog, MealLog, StoolLog, WaterLog } from "./types";
import { findPatterns, recentExerciseCount, gutScore } from "./correlation";
import { fibreToday } from "./fibre";
import { DRINK_MAP } from "./drinks";
import { findColorExplainer } from "./stool-color";

const HOUR = 3600 * 1000;

export interface SaiMessage {
  id: string;
  role: "sai" | "user";
  text: string;
  timestamp: number;
  chips?: string[];
  topic?: string;
}

function msg(text: string, chips?: string[], topic?: string): SaiMessage {
  return { id: crypto.randomUUID(), role: "sai", timestamp: Date.now(), text, chips, topic };
}

function totalStoolLogs(logs: AnyLog[]): number {
  return logs.filter((l) => l.type === "stool").length;
}

// Checks all four log categories, not just stool count, since the active-days
// fix in gutScore and the adaptive lookback in findPatterns both quietly look
// worse for under-logging users — this tells them what to add and why.
function dataSufficiencyNudge(logs: AnyLog[]): string | null {
  const totalStools = totalStoolLogs(logs);
  const totalMeals = logs.filter((l) => l.type === "meal").length;
  const totalDrinks = logs.filter((l) => l.type === "water").length;
  const totalActivity = logs.filter((l) => l.type === "exercise").length;

  const missing: string[] = [];
  if (totalStools < 5) missing.push("stool");
  if (totalMeals < 5) missing.push("food");
  if (totalDrinks < 3) missing.push("drink");
  if (totalActivity < 1) missing.push("activity");

  if (missing.length === 0) return null;
  return `Your Gut Score and patterns get more accurate the more you log. Try adding a few more ${missing.join(", ")} entries this week.`;
}

export function saiGreeting(logs: AnyLog[]): SaiMessage {
  const score = gutScore(logs);
  const totalStools = totalStoolLogs(logs);
  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const scoreText =
    score === 0
      ? "I don't have enough data yet — log a few stools this week and I can start spotting patterns."
      : totalStools < 10
        ? `Your 7-day Gut Score is ${score} — still early days, it'll stabilise after about two weeks of logging.`
        : `Your 7-day Gut Score is ${score}.`;
  return {
    id: crypto.randomUUID(),
    role: "sai",
    timestamp: Date.now(),
    text: `${greet}. ${scoreText} How can I help?`,
    chips: [
      "What should I avoid?",
      "Gut health food tips",
      "How to poop smoothly?",
      "Exercises for bowels",
    ],
  };
}

interface Intent {
  name: string;
  keywords: string[];
  weight: number;
}

// Scored matching replaces the old first-match regex chain — "transit after
// bad food" used to fire "avoid" because it came first in the if/else-if
// chain; now both intents score and the higher one wins.
const INTENTS: Intent[] = [
  { name: "food", keywords: ["eat", "food", "recommend", "suggest", "meal"], weight: 1.0 },
  { name: "remind", keywords: ["remind", "reminder", "nudge"], weight: 1.0 },
  { name: "patterns", keywords: ["pattern", "insight", "trend", "correlation"], weight: 1.0 },
  { name: "score", keywords: ["score", "gut score", "how am i"], weight: 1.0 },
  { name: "transit", keywords: ["transit", "how long", "time", "hours"], weight: 1.0 },
  { name: "avoid", keywords: ["avoid", "bad food", "harmful food", "triggers"], weight: 0.9 },
  { name: "goodfood", keywords: ["good food", "gut health food", "recommend food", "fiber food"], weight: 0.9 },
  { name: "smooth", keywords: ["smooth", "constipat", "hard poop", "difficult", "water"], weight: 0.9 },
  { name: "exercise", keywords: ["exercise", "movement", "workout", "activity", "muscle"], weight: 0.9 },
  { name: "aiinfo", keywords: ["ai", "classifier", "photo", "image", "camera", "tensorflow", "tf.js", "tfjs", "classify", "detect", "scan"], weight: 0.85 },
  { name: "accuracy", keywords: ["accurate", "accuracy", "how good", "reliable", "trust"], weight: 0.85 },
];

const FOLLOW_UP_KEYWORDS = ["more", "why", "explain", "tell me more"];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// These short keywords false-positive as substrings inside unrelated words
// ("ai" inside "dairy", "time" inside "sometimes", "more" inside "anymore"),
// so they get a strict word-boundary match. Everything else keeps plain
// substring matching, since some keywords are deliberate word fragments
// (e.g. "constipat" matches both "constipation" and "constipated") or need
// to match inflected forms (e.g. "avoid" matching "avoided") or plurals
// (e.g. "pattern" matching "patterns") that a strict boundary would break.
const WORD_BOUNDARY_KEYWORDS = new Set(["ai", "time", "more"]);

function hasKeyword(q: string, kw: string): boolean {
  if (WORD_BOUNDARY_KEYWORDS.has(kw)) {
    return new RegExp(`\\b${escapeRegex(kw)}\\b`).test(q);
  }
  return q.includes(kw);
}

function scoreIntents(q: string): { name: string; score: number }[] {
  return INTENTS
    .map((intent) => ({
      name: intent.name,
      score: intent.keywords.filter((kw) => hasKeyword(q, kw)).length * intent.weight,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

function respondTo(intent: string, logs: AnyLog[], now: number): SaiMessage {
  switch (intent) {
    case "food": {
      const fiber = fibreToday(logs);
      const patterns = findPatterns(logs);
      const positive = patterns.filter((p) => p.outcome === "optimal").slice(0, 2);
      const avoid = patterns.filter((p) => p.outcome === "loose").slice(0, 2);

      const parts: string[] = [];
      if (fiber < 2) {
        parts.push("Fiber looks low today — consider lentils, oats, berries, or leafy greens.");
      } else {
        parts.push("Fiber looks on track today.");
      }
      if (positive.length) {
        parts.push(`Tags that pattern with your best days: ${positive.map((p) => "#" + p.tag).join(", ")}.`);
      }
      if (avoid.length) {
        parts.push(`Tags to keep an eye on: ${avoid.map((p) => "#" + p.tag).join(", ")}.`);
      }

      const since7d = now - 7 * 24 * HOUR;
      const recentDrinkTags = new Set<string>();
      for (const l of logs) {
        if (l.type === "water" && l.timestamp >= since7d) {
          const tags = DRINK_MAP.get((l as WaterLog).drinkId ?? "water")?.gutTags ?? [];
          for (const t of tags) recentDrinkTags.add(t);
        }
      }
      if (recentDrinkTags.has("caffeine")) {
        parts.push("You've had caffeinated drinks this week — caffeine stimulates colonic motility and can cause loose stools in sensitive individuals (Rao et al. 1998).");
      }
      if (recentDrinkTags.has("lactose")) {
        parts.push("You've had dairy-based drinks — if you notice loose stools, consider whether lactose tolerance may be a factor.");
      }
      if (recentDrinkTags.has("alcohol")) {
        parts.push("Alcohol logs detected — alcohol impairs gut water absorption; compensate with extra water.");
      }

      parts.push("These are patterns from your own logs, not medical advice.");
      return msg(parts.join(" "), undefined, "food");
    }

    case "remind":
      return msg(
        "I'll nudge you at meal times and at the end of the day to log. (Reminders run while the app is open in MVP.)",
        ["Set quiet hours", "Disable reminders"],
        "remind"
      );

    case "patterns": {
      const totalStools = totalStoolLogs(logs);
      if (totalStools < 10) {
        return msg(
          "I need at least 10 stool logs before patterns become reliable — right now I'd just be guessing.",
          undefined,
          "patterns"
        );
      }
      const patterns = findPatterns(logs);
      if (!patterns.length) {
        return msg("No strong patterns yet — keep logging and I'll let you know when something stands out.", undefined, "patterns");
      }
      const top = patterns.slice(0, 3).map((p) => "• " + p.message).join("\n");
      return msg("Here's what I see:\n" + top, undefined, "patterns");
    }

    case "score": {
      const score = gutScore(logs);
      const totalStools = totalStoolLogs(logs);
      const qualifier = totalStools < 10 ? " Still early days — it'll stabilise after about two weeks of logging." : "";
      return msg(
        `Your 7-day Gut Score is ${score}. It tracks how often your stools fall in the optimal Type 3–5 range.${qualifier}`,
        undefined,
        "score"
      );
    }

    case "transit": {
      const lastStool = logs.find((l): l is StoolLog => l.type === "stool");
      if (!lastStool) return msg("Log a stool first and I can estimate transit time from your last meal.", undefined, "transit");
      const lastMeal = logs.find(
        (l): l is MealLog => l.type === "meal" && l.timestamp < lastStool.timestamp
      );
      if (!lastMeal) return msg("I don't see a meal logged before your last stool.", undefined, "transit");
      const hrs = Math.round((lastStool.timestamp - lastMeal.timestamp) / HOUR);
      return msg(`Approx ${hrs}h transit from your last meal to your last stool.`, undefined, "transit");
    }

    case "avoid":
      return msg(
        "To keep things moving smoothly, try to minimize:\n• Highly processed snacks (low fiber)\n• Excessive red meat (can slow transit)\n• Large amounts of dairy (for some)\n• Fried, greasy foods\n\nCheck your 'Insights' tab to see which specific tags I've flagged as triggers for you!",
        ["What should I eat?", "Show my patterns"],
        "avoid"
      );

    case "goodfood":
      return msg(
        "For a happy gut, aim for:\n• Probiotics: Kimchi, Yogurt, Tempeh\n• Soluble Fiber: Oats, beans, apples\n• Insoluble Fiber: Whole grains, nuts, cauliflower\n• Hydration: Water is key for fiber to work!\n\nPro-tip: Try more Singaporean 'Local' options like Brown Rice or extra kailan.",
        ["How to poop smoothly?", "Exercise for bowels"],
        "goodfood"
      );

    case "smooth":
      return msg(
        "To help things pass smoothly:\n• Hydrate: Aim for 2-3L of water daily.\n• Fiber: Gradually increase your fiber intake.\n• Position: Try using a small stool to elevate your feet (Squatty Potty style).\n• Routine: Go when you feel the urge; don't hold it in!",
        ["Exercise for bowels", "Good food for gut"],
        "smooth"
      );

    case "exercise":
      return msg(
        "Movement is like a massage for your colon! Try:\n• Walking: A brisk 15-min walk after meals.\n• Core Work: Gentle twists or planks to engage abdominal muscles.\n• Yoga: Cat-Cow or Child's Pose help relax the digestive tract.\n• Cardio: Jogging or swimming to stimulate intestinal contractions.",
        ["Tips to poop smoothly", "What's my Gut Score?"],
        "exercise"
      );

    case "aiinfo":
      return msg(
        "Circle of Life now has a built-in Bristol Stool Scale image classifier — and it runs 100% on your device using TensorFlow.js. Here's how it works:\n\n📸 Tap the Stool tab in the Logger, then hit 'Photo for AI Bristol Analysis'.\n🧠 TF.js extracts 4 visual features: brightness, edge density, color warmth, and texture variance.\n🔬 These are compared against calibrated prototypes for all 7 Bristol types.\n✅ The top suggestion is shown with a confidence %. Tap 'Apply' to pre-fill your Bristol picker.\n\nZero data leaves your device — no cloud API, no tracking.",
        ["How accurate is the AI?", "What's the Bristol Scale?"],
        "aiinfo"
      );

    case "accuracy":
      return msg(
        "The AI uses a color + texture heuristic — it's a scientifically-grounded starting point, not a clinical diagnostic. It works best when:\n• The photo is well-lit with a neutral background\n• The subject fills most of the frame\n\nIn practice it's most reliable at distinguishing hard (Types 1-2) from smooth (Type 4) from watery (Type 7). Types 3, 5, and 6 can be closer together visually.\n\nAlways verify with your own judgment — you know best!",
        ["How does the AI work?", "Show my patterns"],
        "accuracy"
      );

    default:
      return msg(
        "I can suggest food for the day, set reminders, or summarize your patterns. What would you like?",
        ["What should I eat today?", "Show my patterns", "What's my Gut Score?"],
        "default"
      );
  }
}

// Appends the data-sufficiency nudge exactly once, regardless of whether
// "score"/"patterns" fired as the primary intent, a composed secondary
// intent, or via a follow-up re-dispatch — avoids the duplicate-nudge bug
// that occurred when each case appended its own copy inline.
function appendNudgeIfNeeded(message: SaiMessage, topics: string[], logs: AnyLog[]): SaiMessage {
  if (!topics.includes("score") && !topics.includes("patterns")) return message;
  const nudge = dataSufficiencyNudge(logs);
  if (!nudge) return message;
  return { ...message, text: message.text + " " + nudge };
}

export function saiReply(input: string, logs: AnyLog[], history: SaiMessage[] = []): SaiMessage {
  const q = input.toLowerCase();
  const now = Date.now();

  const isFollowUp = FOLLOW_UP_KEYWORDS.some((kw) => hasKeyword(q, kw));
  if (isFollowUp) {
    const lastSai = [...history].reverse().find((m) => m.role === "sai" && m.topic && m.topic !== "default");
    if (lastSai?.topic) {
      return appendNudgeIfNeeded(respondTo(lastSai.topic, logs, now), [lastSai.topic], logs);
    }
  }

  const scored = scoreIntents(q);
  if (scored.length === 0) {
    return respondTo("default", logs, now);
  }

  const primary = respondTo(scored[0].name, logs, now);
  const topics = [scored[0].name];
  let combined = primary;
  if (scored.length > 1 && scored[1].score > 0.6 * scored[0].score) {
    const secondary = respondTo(scored[1].name, logs, now);
    topics.push(scored[1].name);
    combined = { ...primary, text: primary.text + "\n\n" + secondary.text };
  }
  return appendNudgeIfNeeded(combined, topics, logs);
}

export function checkReminders(logs: AnyLog[], now = Date.now()): string[] {
  const out: string[] = [];
  const hr = new Date(now).getHours();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todays = logs.filter((l) => l.timestamp >= todayStart.getTime());
  const meals = todays.filter((l) => l.type === "meal").length;
  const exercise = recentExerciseCount(logs, now);
  const stools = todays.filter((l) => l.type === "stool").length;
  const lastStool = logs.find((l): l is StoolLog => l.type === "stool");
  const hrsSinceLastPoop = lastStool ? (now - lastStool.timestamp) / HOUR : Infinity;

  if (hr >= 9 && hr < 11 && meals === 0) out.push("Haven't seen breakfast yet — want to log it?");
  if (hr >= 13 && hr < 15 && meals < 2) out.push("Lunch reminder — tap + to log.");
  if (hr >= 19 && exercise === 0) out.push("No activity logged today. Even a 10-min walk counts.");
  if (hr >= 21 && stools === 0) out.push("End-of-day check: did you log today's bowel movement?");

  if (hrsSinceLastPoop >= 18 && hrsSinceLastPoop < 48) {
    out.push("It's been over 18 hours since your last log. Maybe time to visit the toilet?");
  } else if (hrsSinceLastPoop >= 48) {
    out.push("No logs in 48 hours. Focus on hydration and fiber today!");
  }

  if (lastStool && (lastStool.color === "black" || lastStool.color === "red") && !findColorExplainer(lastStool, logs)) {
    out.push(
      `Your last stool was logged as ${lastStool.color} with no dietary cause found in your recent food log. This can sometimes indicate GI bleeding — please consult a doctor if this persists.`
    );
  }

  const nudge = dataSufficiencyNudge(logs);
  if (nudge) out.push(nudge);

  return out;
}

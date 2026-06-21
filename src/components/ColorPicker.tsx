"use client";
import type { StoolColor } from "@/lib/types";
import { evaluateColorHealth } from "@/lib/stool-color";

interface Props {
  value?: StoolColor;
  onChange: (color: StoolColor) => void;
  detectedColor?: StoolColor;
}

const COLOR_DISPLAY: Record<
  StoolColor,
  { label: string; bgColor: string; description: string }
> = {
  brown: { label: "Brown", bgColor: "#8B5A2B", description: "Healthy" },
  "light-brown": { label: "Light Brown", bgColor: "#A0522D", description: "Healthy" },
  "yellow-brown": { label: "Yellow-Brown", bgColor: "#CD853F", description: "Healthy" },
  "pale-yellow": { label: "Pale Yellow", bgColor: "#F0E68C", description: "Caution" },
  green: { label: "Green", bgColor: "#6B8E23", description: "Caution" },
  black: { label: "Black", bgColor: "#1C1C1C", description: "⚠️ Alert" },
  red: { label: "Red", bgColor: "#DC143C", description: "⚠️ Alert" },
  unknown: { label: "Unknown", bgColor: "#CCCCCC", description: "Not detected" },
};

const SELECTABLE_COLORS: StoolColor[] = [
  "brown",
  "light-brown",
  "yellow-brown",
  "pale-yellow",
  "green",
  "black",
  "red",
];

function descriptionStyle(description: string): string {
  if (description === "Healthy") return "text-[#137333]";
  if (description === "Caution") return "text-[#b06000]";
  if (description.includes("Alert")) return "text-[#a50e0e]";
  return "text-[#5f6368]";
}

export function ColorPicker({ value, onChange, detectedColor }: Props) {
  const health = value ? evaluateColorHealth(value) : null;

  return (
    <div className="space-y-3">
      {detectedColor && detectedColor !== "unknown" && (
        <div className="flex items-center gap-2">
          <span className="text-sm px-3 py-1 rounded-full bg-[#e8f0fe] text-[#4285F4]">
            Detected: {COLOR_DISPLAY[detectedColor].label}
          </span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {SELECTABLE_COLORS.map((color) => {
          const display = COLOR_DISPLAY[color];
          const isSelected = value === color;
          const isDetected = detectedColor === color && !isSelected;

          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all ${
                isSelected
                  ? "border-[#4285F4] ring-2 ring-[#4285F4] bg-[#e8f0fe]"
                  : isDetected
                    ? "border-[#FBBC05] ring-2 ring-[#FBBC05] bg-white"
                    : "border-[#dadce0] bg-white hover:bg-[#f8f9fa]"
              }`}
            >
              <div
                className="w-8 h-8 rounded-full shrink-0 border border-black/10"
                style={{ backgroundColor: display.bgColor }}
              />
              <span className="text-[10px] text-[#202124] text-center leading-tight">
                {display.label}
              </span>
              <span className={`text-[9px] font-medium text-center ${descriptionStyle(display.description)}`}>
                {display.description}
              </span>
            </button>
          );
        })}
      </div>

      {health && value && (
        <div
          className={`rounded-2xl p-3 text-sm space-y-1 ${
            health.isHealthy ? "bg-[#e6f4ea]" : "bg-[#fce8e6]"
          }`}
        >
          <p className={health.isHealthy ? "text-[#137333]" : "text-[#a50e0e]"}>
            {health.message}
          </p>
          {health.concern && (
            <p className="text-[#5f6368] text-xs">{health.concern}</p>
          )}
        </div>
      )}
    </div>
  );
}

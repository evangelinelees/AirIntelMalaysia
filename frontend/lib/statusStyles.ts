import { AlertTriangle, CheckCircle2, CloudFog, HelpCircle } from "lucide-react";

/**
 * Single source of truth for how a safety_status string maps to color,
 * icon, and copy. Previously this lived as three near-identical, slowly
 * diverging maps (FavoriteLocationCard, CurrentLocationAQI, CheckHazeButton)
 * — one of them used raw Tailwind colors instead of the design tokens, so
 * the same status rendered in a different actual color depending on which
 * widget showed it. Import this everywhere instead of redeclaring it.
 */
export type StatusKey =
  | "Clearing Trend"
  | "Incoming Plume Warning"
  | "Unsafe / Stagnant"
  | "default";

export type StatusStyle = {
  /** Tailwind text color class */
  text: string;
  /** Tailwind background color class (tinted, for chips/panels) */
  bg: string;
  /** Tailwind border color class */
  border: string;
  /** Raw hex — for inline CSS custom properties (e.g. --haze-intensity tint) */
  hex: string;
  icon: typeof CheckCircle2;
  /** Short, plain-language label a user recognizes at a glance */
  label: string;
  /** 0–1 — drives the haze-bar / haze-ambient visual density */
  intensity: number;
};

const STATUS_STYLES: Record<StatusKey, StatusStyle> = {
  "Clearing Trend": {
    text: "text-clear",
    bg: "bg-clear/10",
    border: "border-clear/30",
    hex: "#00B8A8",
    icon: CheckCircle2,
    label: "Air is clearing",
    intensity: 0.12,
  },
  "Unsafe / Stagnant": {
    text: "text-warn",
    bg: "bg-warn/10",
    border: "border-warn/30",
    hex: "#FFB01F",
    icon: CloudFog,
    label: "Air is stagnant",
    intensity: 0.45,
  },
  "Incoming Plume Warning": {
    text: "text-alert",
    bg: "bg-alert/10",
    border: "border-alert/30",
    hex: "#E5484D",
    icon: AlertTriangle,
    label: "Haze is approaching",
    intensity: 0.7,
  },
  default: {
    text: "text-haze-400",
    bg: "bg-haze-50",
    border: "border-haze-200/40",
    hex: "#8C99AE",
    icon: HelpCircle,
    label: "No data yet",
    intensity: 0.05,
  },
};

export function getStatusStyle(status: string | null | undefined): StatusStyle {
  if (!status) return STATUS_STYLES.default;
  return STATUS_STYLES[status as StatusKey] || STATUS_STYLES.default;
}

/** AQI category, independent of the "safety_status" business logic — used
 * for the number's own color when a safety_status hasn't come back yet. */
export function aqiCategory(aqi: number | null | undefined): {
  label: string;
  style: StatusStyle;
} {
  if (aqi == null) return { label: "—", style: STATUS_STYLES.default };
  if (aqi <= 50) return { label: "Good", style: STATUS_STYLES["Clearing Trend"] };
  if (aqi <= 100) return { label: "Moderate", style: STATUS_STYLES["Clearing Trend"] };
  if (aqi <= 150) return { label: "Unhealthy (sensitive groups)", style: STATUS_STYLES["Unsafe / Stagnant"] };
  if (aqi <= 200) return { label: "Unhealthy", style: STATUS_STYLES["Unsafe / Stagnant"] };
  return { label: "Very unhealthy / hazardous", style: STATUS_STYLES["Incoming Plume Warning"] };
}

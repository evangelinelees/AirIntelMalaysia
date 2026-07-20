"use client";

import { useState } from "react";
import { MapPin, Sparkles } from "lucide-react";

/**
 * Shown only when the person has zero pinned locations. Deliberately does
 * NOT touch Google Maps — it reads navigator.geolocation directly (same
 * as the hero card already does) and posts straight to
 * /api/register-geofence with the raw coordinates. The full "+ Add new
 * location" button/form stays exactly as it is elsewhere in Dashboard for
 * anyone who wants to search or drop a pin on a map instead.
 */
export default function OnboardingCard({ onAdded }: { onAdded: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function quickAddHome() {
    setSaving(true);
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Location isn't available on this device — use 'Add new location' below instead.");
      setSaving(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch("/api/register-geofence", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: "Home",
              lat: latitude,
              lon: longitude,
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              pm25_threshold: null,
              aqi_threshold: null,
            }),
          });
          if (!res.ok) throw new Error("Couldn't save that location.");
          onAdded();
        } catch (e: any) {
          setError(e.message || "Something went wrong — try 'Add new location' below.");
        } finally {
          setSaving(false);
        }
      },
      () => {
        setError("Location permission was denied — use 'Add new location' below instead.");
        setSaving(false);
      },
    );
  }

  return (
    <div className="rounded-instrument border border-dashed border-brand/40 bg-panelSunken p-5 text-center">
      <Sparkles size={20} className="mx-auto text-brand" />
      <p className="mt-2 font-display text-sm text-ink">Pin your first location</p>
      <p className="mt-1 text-sm text-haze-400">
        Get proactive alerts the moment air quality crosses a safe threshold near you.
      </p>
      <button
        onClick={quickAddHome}
        disabled={saving}
        className="mt-3 inline-flex items-center gap-2 rounded-instrument bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        <MapPin size={15} />
        {saving ? "Finding you…" : "Use my current location as Home"}
      </button>
      {error && <p className="mt-2 text-xs text-alert">{error}</p>}
      <p className="mt-2 text-xs text-haze-200">or search/pin a specific spot with "Add new location" below</p>
    </div>
  );
}

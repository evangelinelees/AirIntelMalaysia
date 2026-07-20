"use client";

import { useState } from "react";
import { Map as MapIcon, ChevronDown } from "lucide-react";
import MapView from "./MapView";

type Pin = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  aqi?: number | null;
  status?: string | null;
  isCurrentLocation?: boolean;
};

export default function MapPanel({ pins, center }: { pins: Pin[]; center: { lat: number; lng: number } }) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-instrument border border-haze-50 bg-panelRaised px-4 py-2.5 text-sm text-ink shadow-instrument transition hover:bg-panelSunken"
      >
        <MapIcon size={16} className="text-brand" />
        {open ? "Hide map" : "View map"}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3">
          <MapView pins={pins} center={center} />
        </div>
      )}
    </section>
  );
}

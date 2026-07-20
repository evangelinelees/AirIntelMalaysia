"use client";

import { useLoadScript, GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useState } from "react";
import { getStatusStyle } from "@/lib/statusStyles";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const containerStyle = { width: "100%", height: "280px" };

type Pin = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  aqi?: number | null;
  status?: string | null;
  isCurrentLocation?: boolean;
};

/**
 * This component — and therefore the Google Maps script — only mounts
 * once the person taps "View map" in Dashboard. It is never rendered on
 * initial page load, so opening the dashboard never fires a Maps
 * request on its own. AddFavoriteLocation follows the same rule: its
 * own useLoadScript only runs once someone taps "+ Add new location".
 */
export default function MapView({ pins, center }: { pins: Pin[]; center: { lat: number; lng: number } }) {
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const [active, setActive] = useState<Pin | null>(null);

  if (loadError) {
    return <p className="text-sm text-alert">Couldn't load the map right now.</p>;
  }
  if (!isLoaded) {
    return <div className="skeleton h-[280px] w-full rounded-instrument" />;
  }

  return (
    <div className="overflow-hidden rounded-instrument border border-haze-50">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={11}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {pins.map((pin) => {
          const style = getStatusStyle(pin.status);
          return (
            <Marker
              key={pin.id}
              position={{ lat: pin.lat, lng: pin.lon }}
              onClick={() => setActive(pin)}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: pin.isCurrentLocation ? 9 : 7,
                fillColor: pin.isCurrentLocation ? "#209CEE" : style.hex,
                fillOpacity: 1,
                strokeColor: "#FFFFFF",
                strokeWeight: 2,
              }}
            />
          );
        })}
        {active && (
          <InfoWindow position={{ lat: active.lat, lng: active.lon }} onCloseClick={() => setActive(null)}>
            <div className="text-xs text-ink">
              <p className="font-semibold">{active.label}</p>
              {active.aqi != null && <p>AQI {active.aqi} · {active.status ?? "No data yet"}</p>}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

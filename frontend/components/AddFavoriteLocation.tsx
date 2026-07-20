"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, MapPin, Pencil, Search } from "lucide-react";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";

const libraries: "places"[] = ["places"];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const mapContainerStyle = { width: "100%", height: "200px" };
const defaultCenter = { lat: 3.139, lng: 101.6869 };

type LocationData = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  pm25_threshold?: number | null;
  aqi_threshold?: number | null;
};

type Props = {
  onAdded: () => void;
  existingLocation?: LocationData | null;
  onCancel?: () => void;
};

export default function AddFavoriteLocation({
  onAdded,
  existingLocation,
  onCancel,
}: Props) {
  const isEditing = !!existingLocation;

  const [label, setLabel] = useState(existingLocation?.label || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] =
    useState(!existingLocation);
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>(
    existingLocation
      ? { lat: existingLocation.lat, lng: existingLocation.lon }
      : defaultCenter,
  );

  const [useCustomThresholds, setUseCustomThresholds] = useState(
    !!(existingLocation?.pm25_threshold || existingLocation?.aqi_threshold),
  );
  const [pm25Threshold, setPm25Threshold] = useState(
    existingLocation?.pm25_threshold?.toString() || "35",
  );
  const [aqiThreshold, setAqiThreshold] = useState(
    existingLocation?.aqi_threshold?.toString() || "100",
  );

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: libraries,
  });

  // Refs for the Autocomplete input
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Initialize Autocomplete when the map is loaded and the input exists
  useEffect(() => {
    if (!isLoaded || !inputRef.current || useCurrentLocation) return;
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["geocode"],
      componentRestrictions: { country: "my" },
      fields: ["formatted_address", "geometry", "name"],
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setCoordinates({ lat, lng });
      setAddress(place.formatted_address || place.name || "");
    });
    autocompleteRef.current = autocomplete;
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, useCurrentLocation]);

  // Reverse geocode when "Use my current location" is toggled on
  useEffect(() => {
    if (useCurrentLocation && navigator.geolocation && !isEditing) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          try {
            const geocoder = new google.maps.Geocoder();
            const result = await new Promise<google.maps.GeocoderResult[]>(
              (resolve, reject) => {
                geocoder.geocode(
                  { location: { lat: latitude, lng: longitude } },
                  (results, status) => {
                    if (status === "OK" && results) resolve(results);
                    else reject(status);
                  },
                );
              },
            );
            if (result.length > 0) {
              setAddress(result[0].formatted_address);
            }
          } catch (e) {
            setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        },
        () => {
          setError("Location permission denied. Please search manually.");
          setUseCurrentLocation(false);
        },
      );
    }
  }, [useCurrentLocation, isEditing]);

  // When editing existing location, set address from lat/lon
  useEffect(() => {
    if (isEditing && existingLocation) {
      setLabel(existingLocation.label);
      setAddress(
        `${existingLocation.lat.toFixed(6)}, ${existingLocation.lon.toFixed(6)}`,
      );
      setCoordinates({ lat: existingLocation.lat, lng: existingLocation.lon });
      setUseCustomThresholds(
        !!(existingLocation.pm25_threshold || existingLocation.aqi_threshold),
      );
      if (existingLocation.pm25_threshold) {
        setPm25Threshold(existingLocation.pm25_threshold.toString());
      }
      if (existingLocation.aqi_threshold) {
        setAqiThreshold(existingLocation.aqi_threshold.toString());
      }
    }
  }, [isEditing, existingLocation]);

  // Handle map click to set coordinates
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setCoordinates({ lat, lng });
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results.length > 0) {
        setAddress(results[0].formatted_address);
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    });
  };

  const handleUseCurrentToggle = (value: boolean) => {
    setUseCurrentLocation(value);
  };

  async function save() {
    if (!label.trim()) {
      setError('Give it a name first — e.g. "Home".');
      return;
    }
    if (!coordinates) {
      setError("Please select a location on the map.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const requestBody: any = {
        label,
        lat: coordinates.lat,
        lon: coordinates.lng,
        address,
        pm25_threshold: useCustomThresholds ? Number(pm25Threshold) : null,
        aqi_threshold: useCustomThresholds ? Number(aqiThreshold) : null,
      };
      if (isEditing && existingLocation?.id) {
        requestBody.location_id = existingLocation.id;
      }

      const res = await fetch("/api/register-geofence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not save that location.");
      }

      if (!isEditing) {
        setLabel("");
        setAddress("");
        setCoordinates(defaultCenter);
        setUseCurrentLocation(true);
        setUseCustomThresholds(false);
        setPm25Threshold("35");
        setAqiThreshold("100");
      }
      onAdded();
    } catch (e: any) {
      setError(e.message || "Location permission was denied.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setLabel("");
    setAddress("");
    setCoordinates(defaultCenter);
    if (onCancel) onCancel();
  }

  if (loadError)
    return (
      <div className="text-alert">
        Failed to load Google Maps. Please try again later.
      </div>
    );
  if (!isLoaded) return <div className="text-haze-200">Loading map…</div>;

  return (
    <div className="rounded-instrument border border-dashed border-haze-200/60 bg-panel p-4">
      <div className="flex items-center gap-2 text-haze-200">
        {isEditing ? <Pencil size={16} /> : <MapPin size={16} />}
        <span className="font-display text-sm">
          {isEditing ? "Edit location" : "Pin a new location"}
        </span>
      </div>

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Home, Office, School…"
        className="mt-3 w-full rounded-instrument border border-haze-50 bg-panelRaised px-3 py-2 text-sm text-ink outline-none"
      />

      <div className="mt-3 flex gap-4 text-sm">
        <label className="flex items-center gap-1.5 text-haze-200">
          <input
            type="radio"
            checked={useCurrentLocation}
            onChange={() => handleUseCurrentToggle(true)}
            disabled={isEditing}
          />
          Use my current location
        </label>
        <label className="flex items-center gap-1.5 text-haze-200">
          <input
            type="radio"
            checked={!useCurrentLocation}
            onChange={() => handleUseCurrentToggle(false)}
          />
          Search or click on map
        </label>
      </div>

      {!useCurrentLocation && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-haze-200" />
            <input
              ref={inputRef}
              placeholder="Search for a place…"
              className="w-full rounded-instrument border border-haze-50 bg-panelRaised px-3 py-2 text-sm text-ink outline-none"
            />
          </div>
        </div>
      )}

      <div className="mt-3 rounded-instrument overflow-hidden border border-haze-50">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={coordinates}
          zoom={15}
          onClick={handleMapClick}
          options={{ streetViewControl: false, mapTypeControl: false }}
        >
          <Marker position={coordinates} />
        </GoogleMap>
      </div>

      {/* Show the address if available */}
      {address && (
        <div className="mt-2">
          <label className="instrument-label text-haze-200">Address</label>
          <input
            value={address}
            readOnly
            className="w-full rounded-instrument border border-haze-50 bg-panel px-3 py-2 text-sm text-ink outline-none"
          />
        </div>
      )}

      <label className="mt-3 flex items-center gap-1.5 text-sm text-haze-200">
        <input
          type="checkbox"
          checked={useCustomThresholds}
          onChange={(e) => setUseCustomThresholds(e.target.checked)}
        />
        Use custom alert thresholds for this location
      </label>

      {useCustomThresholds && (
        <div className="mt-2 flex gap-2">
          <label className="w-1/2">
            <span className="instrument-label">PM2.5</span>
            <input
              type="number"
              value={pm25Threshold}
              onChange={(e) => setPm25Threshold(e.target.value)}
              className="mt-1 w-full rounded-instrument border border-haze-50 bg-panelRaised px-2 py-1.5 font-mono text-sm text-ink outline-none"
            />
          </label>
          <label className="w-1/2">
            <span className="instrument-label">AQI</span>
            <input
              type="number"
              value={aqiThreshold}
              onChange={(e) => setAqiThreshold(e.target.value)}
              className="mt-1 w-full rounded-instrument border border-haze-50 bg-panelRaised px-2 py-1.5 font-mono text-sm text-ink outline-none"
            />
          </label>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-alert">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-instrument bg-brand py-2 font-display text-sm text-white transition hover:opacity-90 disabled:opacity-50"
      >
        <Plus size={16} />
        {saving ? "Saving…" : isEditing ? "Update location" : "Add location"}
      </button>

      {isEditing && (
        <button
          onClick={handleCancel}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-instrument border border-haze-50 py-2 font-display text-sm text-haze-200 transition hover:bg-panel"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

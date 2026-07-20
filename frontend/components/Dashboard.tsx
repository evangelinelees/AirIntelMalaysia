"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { apiPost } from "@/lib/api";
import FavoriteLocationCard, {
  FavoriteLocationCardSkeleton,
} from "./FavoriteLocationCard";
import AddFavoriteLocation from "./AddFavoriteLocation";
import ChatPanel from "./ChatPanel";
import TelegramLinkButton from "./TelegramLinkButton";
import PushNotificationToggle from "./PushNotificationToggle";
import AqiHero from "./AqiHero";
import MapPanel from "./MapPanel";
import AlertsLog from "./AlertsLog";
import OnboardingCard from "./OnboardingCard";
import PushPermissionBanner from "./PushPermissionBanner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, User } from "lucide-react";

type HazeResult = {
  aqi: number;
  pm25: number;
  pm10: number;
  safety_status: string;
};

type FavoriteLocation = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  pm25_threshold?: number | null;
  aqi_threshold?: number | null;
  enable_app_push: boolean;
  enable_telegram_push: boolean;
  last_aqi: number | null;
  last_pm25: number | null;
  last_pm10: number | null;
  safety_status: string | null;
  address: string | null;
};

type UserProfile = {
  username: string | null;
  email: string | null;
};

export default function Dashboard({ userId }: { userId: string }) {
  const [locations, setLocations] = useState<FavoriteLocation[]>([]);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [editingLocation, setEditingLocation] =
    useState<FavoriteLocation | null>(null);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    username: null,
    email: null,
  });
  const router = useRouter();

  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setCurrentLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          }),
        () => {},
      );
    }
  }, []);

  const hasLoaded = useRef(false);

  async function loadLocations() {
    setLoadingLocations(true);
    try {
      const { data: favs } = await supabase
        .from("favorite_locations")
        .select(
          "id, label, lat, lon, pm25_threshold, aqi_threshold, enable_app_push, enable_telegram_push, address",
        )
        .eq("user_id", userId);

      if (!favs || favs.length === 0) {
        setLocations([]);
        return;
      }

      const locationsWithAqi = await Promise.all(
        favs.map(async (loc) => {
          try {
            const data = await apiPost<HazeResult>("/api/haze", {
              lat: loc.lat,
              lon: loc.lon,
            });
            return {
              ...loc,
              last_aqi: data.aqi || null,
              last_pm25: data.pm25 || null,
              last_pm10: data.pm10 || null,
              safety_status: data.safety_status || null,
              enable_app_push: loc.enable_app_push ?? true,
              enable_telegram_push: loc.enable_telegram_push ?? false,
              address: loc.address || null,
            };
          } catch (error) {
            console.error(`Failed to fetch AQI for ${loc.label}:`, error);
            return {
              ...loc,
              last_aqi: null,
              last_pm25: null,
              last_pm10: null,
              safety_status: null,
              enable_app_push: loc.enable_app_push ?? true,
              enable_telegram_push: loc.enable_telegram_push ?? false,
              address: loc.address || null,
            };
          }
        }),
      );

      setLocations(locationsWithAqi);
    } catch (error) {
      console.error("Failed to load locations:", error);
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }

  async function toggleAppPush(locationId: string, enabled: boolean) {
    const { error } = await supabase
      .from("favorite_locations")
      .update({ enable_app_push: enabled })
      .eq("id", locationId);
    if (error) {
      console.error("Failed to toggle app push:", error);
      return;
    }
    await loadLocations();
  }

  async function toggleTelegramPush(locationId: string, enabled: boolean) {
    const { error } = await supabase
      .from("favorite_locations")
      .update({ enable_telegram_push: enabled })
      .eq("id", locationId);
    if (error) {
      console.error("Failed to toggle telegram push:", error);
      return;
    }
    await loadLocations();
  }

  function handleEdit(location: FavoriteLocation) {
    setEditingLocation(location);
    setIsAddingLocation(false);
  }

  function handleAddNew() {
    setIsAddingLocation(true);
    setEditingLocation(null);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    async function load() {
      if (hasLoaded.current) return;
      hasLoaded.current = true;

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("username, email")
        .eq("id", userId)
        .single();

      if (!userError && userData) {
        setUserProfile({
          username: userData.username,
          email: userData.email,
        });
      }

      await loadLocations();

      const { data: userRow } = await supabase
        .from("users")
        .select("telegram_chat_id")
        .eq("id", userId)
        .single();
      setTelegramLinked(!!userRow?.telegram_chat_id);
    }
    load();
  }, [userId]);

  const mapPins = [
    ...(currentLocation
      ? [
          {
            id: "me",
            label: "You",
            lat: currentLocation.lat,
            lon: currentLocation.lon,
            isCurrentLocation: true,
          },
        ]
      : []),
    ...locations.map((loc) => ({
      id: loc.id,
      label: loc.label,
      lat: loc.lat,
      lon: loc.lon,
      aqi: loc.last_aqi,
      status: loc.safety_status,
    })),
  ];
  const mapCenter = currentLocation
    ? { lat: currentLocation.lat, lng: currentLocation.lon }
    : { lat: 3.139, lng: 101.6869 };

  // Get user initial for avatar
  const userInitial = userProfile.username
    ? userProfile.username.charAt(0).toUpperCase()
    : userProfile.email
      ? userProfile.email.charAt(0).toUpperCase()
      : "U";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="instrument-label text-sm text-haze-400">
              AirIntel Malaysia
            </p>
            <h1 className="font-display text-2xl text-ink">Your dashboard</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* User avatar and name */}
          {userProfile.username && (
            <div className="flex items-center gap-2 rounded-instrument border border-haze-50 bg-panelRaised px-3 py-1.5 shadow-instrument sm:px-4 sm:py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-haze-100 text-xs font-medium text-haze-600 sm:h-7 sm:w-7 sm:text-sm">
                {userInitial}
              </div>
              <span className="text-xs text-ink sm:text-sm">
                {userProfile.username}
              </span>
            </div>
          )}
          <PushNotificationToggle userId={userId} />
          <TelegramLinkButton alreadyLinked={telegramLinked} />
          <Link
            href="/settings"
            className="flex items-center gap-1.5 rounded-instrument border border-haze-50 bg-panelRaised px-3 py-1.5 text-xs text-ink shadow-instrument transition hover:bg-panelSunken sm:px-4 sm:py-2 sm:text-sm"
          >
            <Settings size={14} />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          <button
            onClick={logout}
            className="rounded-instrument border border-haze-50 bg-panelRaised px-3 py-1.5 text-xs text-ink shadow-instrument transition hover:bg-panelSunken sm:px-4 sm:py-2 sm:text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Welcome message with username */}
      {userProfile.username && (
        <div className="rounded-instrument border border-haze-50 bg-panelRaised px-4 py-3 shadow-instrument">
          <p className="text-sm text-haze-400">
            Welcome back,{" "}
            <span className="font-medium text-ink">{userProfile.username}</span>
            ! Here's your air quality overview.
          </p>
        </div>
      )}

      <PushPermissionBanner userId={userId} />

      <AqiHero />

      <MapPanel pins={mapPins} center={mapCenter} />

      <section>
        <h2 className="font-display text-lg text-ink">Pinned locations</h2>
        {loadingLocations ? (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FavoriteLocationCardSkeleton />
            <FavoriteLocationCardSkeleton />
            <FavoriteLocationCardSkeleton />
          </div>
        ) : (
          <>
            {locations.length === 0 && !isAddingLocation && (
              <div className="mt-3">
                <OnboardingCard onAdded={loadLocations} />
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((loc) => (
                <FavoriteLocationCard
                  key={loc.id}
                  id={loc.id}
                  label={loc.label}
                  address={loc.address}
                  aqi={loc.last_aqi}
                  pm25={loc.last_pm25}
                  pm10={loc.last_pm10}
                  status={loc.safety_status}
                  enableAppPush={loc.enable_app_push}
                  enableTelegramPush={loc.enable_telegram_push}
                  onToggleAppPush={toggleAppPush}
                  onToggleTelegramPush={toggleTelegramPush}
                  onEdit={() => handleEdit(loc)}
                  onDelete={() => loadLocations()}
                />
              ))}
            </div>

            {/* Kept exactly as an explicit button — Google Maps (and the
                autocomplete/geocoder it pulls in) only loads once this
                flow is opened, never on dashboard load. */}
            <div className="mt-4 max-w-sm">
              {!isAddingLocation && !editingLocation && (
                <button
                  onClick={handleAddNew}
                  className="w-full rounded-instrument border border-dashed border-haze-200/60 bg-panelRaised py-3 text-sm text-haze-400 transition-colors hover:bg-panelSunken"
                >
                  + Add new location
                </button>
              )}
              {(isAddingLocation || editingLocation) && (
                <AddFavoriteLocation
                  onAdded={() => {
                    loadLocations();
                    setIsAddingLocation(false);
                    setEditingLocation(null);
                  }}
                  existingLocation={editingLocation}
                  onCancel={() => {
                    setIsAddingLocation(false);
                    setEditingLocation(null);
                  }}
                />
              )}
            </div>
          </>
        )}
      </section>

      <AlertsLog userId={userId} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-80">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}

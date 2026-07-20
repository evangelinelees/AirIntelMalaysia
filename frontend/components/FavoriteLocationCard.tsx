"use client";

import { MapPin, Pencil, Trash2, Bell, BellOff, Send } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getStatusStyle } from "@/lib/statusStyles";

type Props = {
  id: string;
  label: string;
  address?: string | null;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  status: string | null;
  onEdit?: () => void;
  onDelete?: () => void;
  enableAppPush?: boolean;
  enableTelegramPush?: boolean;
  onToggleAppPush?: (id: string, enabled: boolean) => void;
  onToggleTelegramPush?: (id: string, enabled: boolean) => void;
};

export function FavoriteLocationCardSkeleton() {
  return (
    <div className="rounded-instrument border border-haze-50 bg-panelRaised p-4 shadow-instrument">
      <div className="skeleton h-4 w-20 rounded" />
      <div className="skeleton mt-3 h-8 w-14 rounded" />
      <div className="skeleton mt-3 h-3 w-24 rounded" />
    </div>
  );
}

export default function FavoriteLocationCard({
  id,
  label,
  address,
  aqi,
  pm25,
  pm10,
  status,
  onEdit,
  onDelete,
  enableAppPush = true,
  enableTelegramPush = false,
  onToggleAppPush,
  onToggleTelegramPush,
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const style = getStatusStyle(status);

  async function handleDelete() {
    if (!confirm(`Delete "${label}"?`)) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("favorite_locations").delete().eq("id", id);
      if (error) throw error;
      if (onDelete) onDelete();
    } catch (error) {
      console.error("Error deleting location:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className={`haze-bar relative rounded-instrument border p-4 shadow-instrument transition-shadow hover:shadow-instrumentRaised ${style.border} bg-panelRaised`}
      style={{ ["--haze-intensity" as any]: style.intensity }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-haze-400">
          <MapPin size={16} className="shrink-0" />
          <span className="max-w-[120px] truncate font-display text-sm text-ink">{label}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 text-haze-200 transition-colors hover:text-ink"
              title="Edit location"
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1 text-haze-200 transition-colors hover:text-alert disabled:opacity-50"
              title="Delete location"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {address && (
        <p className="mt-1 truncate text-xs leading-relaxed text-haze-200" title={address}>
          {address}
        </p>
      )}

      <div className="mt-2 flex items-end justify-between">
        <p className="font-mono text-3xl leading-none text-ink">{aqi ?? "—"}</p>
        <p className={`instrument-label flex items-center gap-1 ${style.text}`}>
          <style.icon size={12} />
          {status ?? "No data yet"}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-haze-200">
        <span>PM2.5: {pm25 !== null ? `${pm25} µg/m³` : "—"}</span>
        <span>PM10: {pm10 !== null ? `${pm10} µg/m³` : "—"}</span>
      </div>

      <div className="mt-3 border-t border-haze-50 pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-haze-200">Notifications</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggleAppPush?.(id, !enableAppPush)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                enableAppPush ? "text-clear" : "text-haze-200"
              }`}
              title={enableAppPush ? "App notifications on" : "App notifications off"}
            >
              {enableAppPush ? <Bell size={12} /> : <BellOff size={12} />}
              <span className="hidden sm:inline">App</span>
            </button>
            <button
              onClick={() => onToggleTelegramPush?.(id, !enableTelegramPush)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                enableTelegramPush ? "text-clear" : "text-haze-200"
              }`}
              title={enableTelegramPush ? "Telegram notifications on" : "Telegram notifications off"}
            >
              {enableTelegramPush ? <Send size={12} /> : <Send size={12} className="opacity-30" />}
              <span className="hidden sm:inline">Telegram</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

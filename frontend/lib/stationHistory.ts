import { supabase } from "./supabaseClient";

export type StationPoint = {
  time: string;
  aqi: number;
};

/**
 * Reads the last N hours of readings for a station straight from
 * real_time_stations (now a history table, one row per ingestion run —
 * see the 01-ingestion-cron workflow). This is a direct-from-client
 * Supabase read, not an n8n round trip: it's read-only, low-stakes, and
 * saves a webhook hop just to draw a sparkline.
 *
 * Fails soft: any error or empty result returns [] rather than throwing,
 * so the hero card can just hide the sparkline instead of showing a
 * broken chart.
 */
export async function getStationHistory(
  stationName: string | null | undefined,
  hours = 24,
): Promise<StationPoint[]> {
  if (!stationName) return [];
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("real_time_stations")
      .select("last_aqi, last_updated")
      .eq("station_name", stationName)
      .gte("last_updated", since)
      .order("last_updated", { ascending: true });

    if (error || !data) return [];

    return data
      .filter((row) => row.last_aqi != null)
      .map((row) => ({ time: row.last_updated, aqi: row.last_aqi }));
  } catch {
    return [];
  }
}

"use client";

import { useEffect, useState } from "react";
import {
  Wind,
  RefreshCw,
  ChevronDown,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { apiPost } from "@/lib/api";
import { getStatusStyle, aqiCategory } from "@/lib/statusStyles";
import { relativeTime } from "@/lib/format";
import { getStationHistory, type StationPoint } from "@/lib/stationHistory";
import Sparkline from "./Sparkline";

type HazeResult = {
  aqi: number;
  pm25: number;
  pm10: number;
  nearest_station: string;
  upwind_station?: string;
  upwind_aqi?: number;
  safety_status: string;
  estimated_clearance_hours: number | null;
  temperature: number;
  humidity: number;
  wind_speed_kmh: number;
  forecast_pm25_tomorrow?: number;
  last_updated?: string;
  message?: string;
};

/**
 * The one hero moment on the dashboard (and the guest landing page).
 * Replaces two separate widgets that both answered "what's the air like
 * right now" with different data shapes and different visual treatment —
 * CurrentLocationAQI (silent auto-load) and CheckHazeButton (manual,
 * LLM-narrated). Now there's exactly one number, one status color, one
 * card. "Refresh" re-checks and also fetches the plain-language message;
 * the initial silent load skips the LLM call entirely to stay fast.
 */
export default function AqiHero() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<HazeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<StationPoint[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);

  function locate(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("Geolocation not supported on this device."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, () =>
        reject(
          new Error(
            "Location permission was denied — allow it to check your local haze.",
          ),
        ),
      );
    });
  }

  async function load(withMessage: boolean) {
    setError(null);
    try {
      const pos = await locate();
      console.log(
        "📍 AqiHero location:",
        pos.coords.latitude,
        pos.coords.longitude,
      );
      const result = await apiPost<HazeResult>("/api/haze", {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        requireLLM: withMessage,
      });

      console.log("📦 AqiHero result:", result);
      console.log("🕐 last_updated from API:", result.last_updated);
      console.log("🕐 last_updated type:", typeof result.last_updated);

      setData(result);
      getStationHistory(result.nearest_station).then(setHistory);
    } catch (e: any) {
      console.error("❌ Error in load:", e);
      setError(e.message || "Could not reach the haze forecast right now.");
    }
  }

  useEffect(() => {
    load(false).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await load(showInsights);
    setRefreshing(false);
  }

  async function handleExpandInsights() {
    const next = !showInsights;
    setShowInsights(next);
    if (next && !insightsLoading) {
      setInsightsLoading(true);
      try {
        await load(true);
      } catch {
        // error already handled
      } finally {
        setInsightsLoading(false);
      }
    }
  }

  const category = aqiCategory(data?.aqi);
  const style = data ? getStatusStyle(data.safety_status) : category.style;

  const forecastTrend = (() => {
    if (!data?.forecast_pm25_tomorrow || !data?.pm25) return null;
    const delta = data.forecast_pm25_tomorrow - data.pm25;
    if (Math.abs(delta) < 3) return { label: "Steady tomorrow", Icon: Minus };
    if (delta < 0) return { label: "Improving tomorrow", Icon: TrendingDown };
    return { label: "Worsening tomorrow", Icon: TrendingUp };
  })();

  if (loading) {
    return (
      <div className="rounded-instrument border border-haze-50 bg-panelRaised p-6 shadow-instrument">
        <div className="skeleton h-4 w-32 rounded-instrument" />
        <div className="skeleton mt-4 h-16 w-40 rounded-instrument" />
        <div className="skeleton mt-3 h-4 w-48 rounded-instrument" />
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="skeleton h-12 rounded-instrument" />
          <div className="skeleton h-12 rounded-instrument" />
          <div className="skeleton h-12 rounded-instrument" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="haze-ambient relative overflow-hidden isolate rounded-instrument border border-haze-50 bg-panelRaised p-6 shadow-instrument"
      style={{ ["--haze-tint" as any]: `${style.hex}22` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="instrument-label">Current location</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-instrument border border-haze-50 px-2.5 py-1 text-xs text-haze-400 transition hover:bg-panelSunken hover:text-ink disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-alert">{error}</p>}

      {data && (
        <>
          <div className="haze-bar relative overflow-hidden mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-6xl leading-none text-ink sm:text-7xl">
                {data.aqi}
              </p>
              <p
                className={`instrument-label mt-2 flex items-center gap-1.5 ${style.text}`}
              >
                <style.icon size={14} />
                {data.safety_status || category.label}
              </p>
            </div>

            <div className="text-right text-sm text-haze-400">
              <div>PM2.5 · {data.pm25} µg/m³</div>
              <div>PM10 · {data.pm10} µg/m³</div>
              {forecastTrend && (
                <div className="mt-1 flex items-center justify-end gap-1 text-brand">
                  <forecastTrend.Icon size={13} />
                  {forecastTrend.label}
                </div>
              )}
            </div>
          </div>

          {history.length >= 2 && (
            <div className="mt-4">
              <p className="instrument-label mb-1">Last 24h</p>
              <Sparkline data={history} color={style.hex} />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => setShowDetail((v) => !v)}
              className="flex items-center gap-1 rounded-instrument border border-haze-50 px-2.5 py-1.5 text-haze-400 transition hover:bg-panelSunken hover:text-ink"
            >
              Conditions
              <ChevronDown
                size={12}
                className={`transition-transform ${showDetail ? "rotate-180" : ""}`}
              />
            </button>
            <button
              onClick={handleExpandInsights}
              className="flex items-center gap-1 rounded-instrument border border-haze-50 px-2.5 py-1.5 text-haze-400 transition hover:bg-panelSunken hover:text-ink"
            >
              <Wind size={12} />
              Insights
              <ChevronDown
                size={12}
                className={`transition-transform ${showInsights ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {showDetail && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-instrument bg-panelSunken p-2">
                <p className="instrument-label">Temp</p>
                <p className="mt-0.5 font-mono text-ink">
                  {data.temperature}°C
                </p>
              </div>
              <div className="rounded-instrument bg-panelSunken p-2">
                <p className="instrument-label">Humidity</p>
                <p className="mt-0.5 font-mono text-ink">{data.humidity}%</p>
              </div>
              <div className="rounded-instrument bg-panelSunken p-2">
                <p className="instrument-label">Wind</p>
                <p className="mt-0.5 font-mono text-ink">
                  {data.wind_speed_kmh} km/h
                </p>
              </div>
              {data.upwind_station &&
                data.upwind_station !== data.nearest_station && (
                  <div className="col-span-3 rounded-instrument bg-panelSunken p-2 text-left">
                    <p className="instrument-label">
                      Upwind — where the air is coming from
                    </p>
                    <p className="mt-0.5 text-sm text-ink">
                      {data.upwind_station} (AQI {data.upwind_aqi})
                      {data.estimated_clearance_hours != null &&
                        ` · clearing in ~${data.estimated_clearance_hours}h`}
                    </p>
                  </div>
                )}
            </div>
          )}

          {showInsights && (
            <div className="mt-3 rounded-instrument bg-panelSunken p-3">
              {insightsLoading || !data.message ? (
                <div className="space-y-2">
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-5/6 rounded" />
                  <div className="skeleton h-3 w-2/3 rounded" />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-ink prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-li:my-1">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 text-sm">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc space-y-1 pl-4 my-2">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-sm">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-ink">
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {data.message}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* Trust footer — a number with no source or timestamp reads as
              possibly stale or fabricated. This is the one line that says
              "this is real, and here's when it was true." */}
          <p className="mt-4 text-xs text-haze-200">
            Source: DOE Malaysia · Station: {data.nearest_station} · Updated{" "}
            {relativeTime(data.last_updated)}
          </p>
        </>
      )}
    </div>
  );
}

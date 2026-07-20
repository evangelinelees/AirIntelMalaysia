"use client";

import { useEffect, useState } from "react";
import { Bell, Send, Smartphone } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getStatusStyle } from "@/lib/statusStyles";
import { relativeTime } from "@/lib/format";

type AlertRow = {
  id: string;
  sent_at: string;
  safety_status: string | null;
  aqi_at_trigger: number | null;
  pm25_at_trigger: number | null;
  triggered_by: string | null; // 'app_push' or 'telegram_push'
  label: string | null;
  station_name: string | null;
  pm25_threshold: number | null;
  aqi_threshold: number | null;
  message: string | null;
};

export default function AlertsLog({ userId }: { userId: string }) {
  const [rows, setRows] = useState<AlertRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("haze_alert_logs")
        .select(
          "id, sent_at, safety_status, aqi_at_trigger, pm25_at_trigger, triggered_by, label, station_name, pm25_threshold, aqi_threshold",
        )
        .eq("user_id", userId)
        .order("sent_at", { ascending: false })
        .limit(20);
      if (error) {
        setError(error.message);
        return;
      }
      setRows((data as AlertRow[]) ?? []);
    }
    load();
  }, [userId]);

  return (
    <section className="rounded-instrument border border-haze-50 bg-panelRaised p-6 shadow-instrument">
      <h2 className="flex items-center gap-2 font-display text-lg text-ink">
        <Bell size={18} className="text-brand" />
        Alert history
      </h2>

      {error && (
        <p className="mt-2 text-sm text-haze-200">
          Couldn't load alert history.
        </p>
      )}

      {rows === null && !error && (
        <div className="mt-3 space-y-2">
          <div className="skeleton h-10 w-full rounded-instrument" />
          <div className="skeleton h-10 w-full rounded-instrument" />
        </div>
      )}

      {rows && rows.length === 0 && (
        <p className="mt-3 text-sm text-haze-200">
          No alerts yet — you'll see a log here once a pinned location crosses
          its threshold.
        </p>
      )}

      {rows && rows.length > 0 && (
        <ul className="mt-3 divide-y divide-haze-50">
          {rows.map((row) => {
            const style = getStatusStyle(row.safety_status);
            const isTelegram = row.triggered_by === "telegram_push";
            return (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 py-3"
              >
                <div className="flex items-start gap-2">
                  <style.icon
                    size={16}
                    className={`mt-0.5 shrink-0 ${style.text}`}
                  />
                  <div>
                    <p className="text-sm text-ink">
                      {row.label || "Location"} ·
                      {row.station_name
                        ? ` ${row.station_name}`
                        : " Unknown station"}
                    </p>
                    <p className="text-xs text-haze-200">
                      {row.aqi_at_trigger != null
                        ? `AQI ${row.aqi_at_trigger}`
                        : ""}
                      {row.aqi_at_trigger != null && row.pm25_at_trigger != null
                        ? " · "
                        : ""}
                      {row.pm25_at_trigger != null
                        ? `PM2.5 ${row.pm25_at_trigger} µg/m³`
                        : ""}
                      {row.aqi_threshold != null &&
                        row.pm25_threshold != null && (
                          <>
                            {" · "}
                            <span className="text-haze-300">
                              (thresholds: AQI {row.aqi_threshold} / PM2.5{" "}
                              {row.pm25_threshold})
                            </span>
                          </>
                        )}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-right text-xs text-haze-200">
                  {isTelegram ? <Send size={12} /> : <Smartphone size={12} />}
                  {relativeTime(row.sent_at)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

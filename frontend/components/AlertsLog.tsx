"use client";

import { useEffect, useState } from "react";
import { Bell, Send, Smartphone, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getStatusStyle } from "@/lib/statusStyles";
import { relativeTime } from "@/lib/format";

type AlertRow = {
  id: string;
  sent_at: string;
  safety_status: string | null;
  aqi: number | null;
  pm25: number | null;
  channel: string | null;
  station_name: string | null;
  message: string | null;
};

const PAGE_SIZE = 5;

/**
 * Reads haze_alert_logs directly via Supabase (RLS scopes it to the
 * signed-in user). Selecting "*" rather than named columns on purpose —
 * this table is written by two different n8n workflows (proactive
 * threshold alerts and manual checks) whose exact column sets may drift,
 * and the render below only reads fields it can find.
 *
 * Pagination is keyset-based (cursor = last row's sent_at), not
 * offset-based — an offset page would skip or duplicate rows if a new
 * alert lands while you're scrolling through history, since everything
 * shifts by however many new rows arrived. A "less than this timestamp"
 * cursor doesn't have that problem.
 */
export default function AlertsLog({ userId }: { userId: string }) {
  const [rows, setRows] = useState<AlertRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function loadPage(before?: string) {
    let query = supabase
      .from("haze_alert_logs")
      .select("*")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (before) query = query.lt("sent_at", before);

    const { data, error } = await query;
    if (error) {
      setError(error.message);
      return;
    }

    const page = (data as AlertRow[]) ?? [];
    setHasMore(page.length === PAGE_SIZE);
    setRows((prev) => (before ? [...(prev ?? []), ...page] : page));
  }

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleLoadMore() {
    if (!rows || rows.length === 0) return;
    setLoadingMore(true);
    await loadPage(rows[rows.length - 1].sent_at);
    setLoadingMore(false);
  }

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
        <>
          <ul className="mt-3 divide-y divide-haze-50">
            {rows.map((row) => {
              const style = getStatusStyle(row.safety_status);
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
                        {row.safety_status ?? "Alert"}
                        {row.station_name ? ` · ${row.station_name}` : ""}
                      </p>
                      {(row.aqi != null || row.pm25 != null) && (
                        <p className="text-xs text-haze-200">
                          {row.aqi != null ? `AQI ${row.aqi}` : ""}
                          {row.aqi != null && row.pm25 != null ? " · " : ""}
                          {row.pm25 != null ? `PM2.5 ${row.pm25} µg/m³` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-right text-xs text-haze-200">
                    {row.channel === "telegram" ? (
                      <Send size={12} />
                    ) : (
                      <Smartphone size={12} />
                    )}
                    {relativeTime(row.sent_at)}
                  </div>
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-instrument border border-haze-50 py-2 text-xs text-haze-400 transition hover:bg-panelSunken hover:text-ink disabled:opacity-50"
            >
              <ChevronDown size={13} />
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </section>
  );
}

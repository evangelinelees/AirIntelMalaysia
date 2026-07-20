"use client";

import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import type { StationPoint } from "@/lib/stationHistory";

export default function Sparkline({
  data,
  color = "#209CEE",
  height = 56,
}: {
  data: StationPoint[];
  color?: string;
  height?: number;
}) {
  if (data.length < 2) return null;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="sparklineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
          <Area
            type="monotone"
            dataKey="aqi"
            stroke={color}
            strokeWidth={2}
            fill="url(#sparklineFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

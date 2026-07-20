"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BellRing, X } from "lucide-react";
import { requestWebPushPermission } from "@/lib/oneSignal";
import { supabase } from "@/lib/supabaseClient";

const dismissedKey = (userId: string) => `airintel:push-banner-dismissed:${userId}`;

/**
 * Two persistence signals, layered:
 *
 * 1. device_push_tokens — the authoritative "already subscribed" record.
 *    If a `web` row exists for this user, they've completed opt-in
 *    (possibly from a different browser/device), so never show this
 *    again. This is a real DB row, so it survives cache clears and
 *    follows the account, not just the browser.
 * 2. localStorage — only for "I clicked dismiss without subscribing."
 *    There's no DB column for that (dismissing creates no token row), so
 *    this is deliberately browser-local: dismissing on a phone won't
 *    hide the banner on a laptop, which is the right behavior for a
 *    "not now" click rather than a real subscription decision.
 */
export default function PushPermissionBanner({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function evaluate() {
      if (Capacitor.isNativePlatform()) return; // native asks at initOneSignal time
      if (typeof window === "undefined" || !("Notification" in window)) return;

      // Browser has already decided (granted or denied) — nothing to ask.
      if (Notification.permission !== "default") return;

      // Dismissed "not now" in this browser already.
      if (localStorage.getItem(dismissedKey(userId)) === "1") return;

      // Already has a registered web token (e.g. subscribed from another
      // device, or before a permission reset raced with cleanup) — treat
      // as opted in and don't nag.
      const { data } = await supabase
        .from("device_push_tokens")
        .select("id")
        .eq("user_id", userId)
        .eq("platform", "web")
        .limit(1)
        .maybeSingle();

      if (!cancelled && !data) setVisible(true);
    }

    evaluate();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function enable() {
    await requestWebPushPermission(userId);
    setVisible(false);
  }

  function dismiss() {
    localStorage.setItem(dismissedKey(userId), "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-instrument border border-brand/30 bg-panelSunken px-4 py-3">
      <div className="flex items-center gap-2">
        <BellRing size={16} className="text-brand" />
        <p className="text-sm text-ink">
          Turn on push alerts to get notified the moment haze crosses your threshold.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={enable}
          className="rounded-instrument bg-brand px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
        >
          Turn on alerts
        </button>
        <button
          onClick={dismiss}
          className="p-1 text-haze-200 hover:text-ink"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

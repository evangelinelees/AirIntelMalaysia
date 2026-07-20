"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Bell, BellOff, BellRing } from "lucide-react";
import { requestWebPushPermission } from "@/lib/oneSignal";
import { supabase } from "@/lib/supabaseClient";

type Status =
  | "unsupported"
  | "native"
  | "checking"
  | "linked"
  | "blocked"
  | "not-linked";

/**
 * "Linked" here means *this account* has a row in device_push_tokens —
 * not just "the browser allows notifications." Those are different
 * things: Notification permission is scoped to the browser/origin, so a
 * shared browser that granted permission for a previous account would
 * make every subsequent account look subscribed even though nobody on
 * this account ever opted in. Checking the DB row instead means a fresh
 * account always starts as "not linked" and only flips to "Alerts on"
 * after an explicit click here (or on the banner) — even if the browser
 * technically already has permission and requestPermission() is a no-op.
 */
export default function PushNotificationToggle({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [requesting, setRequesting] = useState(false);

  async function evaluate() {
    if (Capacitor.isNativePlatform()) {
      setStatus("native");
      return;
    }
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }

    const { data } = await supabase
      .from("device_push_tokens")
      .select("id")
      .eq("user_id", userId)
      .eq("platform", "web")
      .limit(1)
      .maybeSingle();

    if (data) {
      setStatus("linked");
      return;
    }
    setStatus(Notification.permission === "denied" ? "blocked" : "not-linked");
  }

  useEffect(() => {
    evaluate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // async function enable() {
  //   setRequesting(true);
  //   await requestWebPushPermission(userId);
  //   await evaluate();
  //   setRequesting(false);
  // }

  async function forceSyncTokenToSupabase(userId: string) {
    try {
      const OneSignalWeb = (await import("react-onesignal")).default;

      // 1. Strictly verify the current environment registration state first
      const isPushEnabled = OneSignalWeb.User?.PushSubscription?.optedIn;
      const currentTokenId = OneSignalWeb.User?.PushSubscription?.id;

      // 🛑 STOP: If the user isn't fully opted-in natively yet, do not attempt to log in or sync
      if (!isPushEnabled || !currentTokenId) {
        console.log(
          "⏳ OneSignal subscription state is not fully active yet. Skipping sync.",
        );
        return;
      }

      // 2. Only proceed with linking if the user isn't already tied to this subscription context identity
      if (OneSignalWeb.User?.externalId !== userId) {
        console.log(
          "🔗 Binding active subscription state directly to current authenticated user identity...",
        );
        await OneSignalWeb.login(userId);
      }

      // 3. Update your single active tracking record inside your database instance
      const { error } = await supabase.from("device_push_tokens").upsert(
        {
          user_id: userId,
          onesignal_player_id: currentTokenId, // Maps safely to your lone "Subscribed" ID (a1b9bf7a...)
          platform: "web",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform" }, // Keeps it restricted to a single row entry structure per system environment profile
      );

      if (error) throw error;
      console.log("✅ Successfully mapped single active tracking reference!");
    } catch (err) {
      console.error(
        "❌ Link synchronization mapping caught an exception:",
        err,
      );
    }
  }

  async function handleToggleClick() {
    setRequesting(true);
    try {
      // SCENARIO 1: Browser permissions are completely fresh or unset
      if (Notification.permission === "default") {
        console.log("Asking for brand-new browser permission...");
        await requestWebPushPermission(userId);
      }

      // SCENARIO 2: Browser says yes, but database row is missing ("not-linked")
      else if (
        Notification.permission === "granted" &&
        status === "not-linked"
      ) {
        console.log("Permission exists, repairing database token row...");
        await forceSyncTokenToSupabase(userId);
      }

      // SCENARIO 3: The user has manually blocked notifications
      else if (Notification.permission === "denied") {
        alert(
          "Notifications are blocked. Please reset your browser site settings to allow alerts.",
        );
      }
    } catch (error) {
      console.error("Error handling toggle click:", error);
    } finally {
      // Always re-check the database and update the UI states immediately after clicking
      await evaluate();
      setRequesting(false);
    }
  }

  if (status === "unsupported" || status === "native" || status === "checking")
    return null;

  if (status === "linked") {
    return (
      <span
        className="flex items-center gap-1.5 text-xs text-clear"
        title="Push alerts are on for this account"
      >
        <Bell size={14} />
        <span className="hidden sm:inline">Alerts on</span>
      </span>
    );
  }

  if (status === "blocked") {
    return (
      <span
        className="flex items-center gap-1.5 text-xs text-haze-200"
        title="Blocked in your browser's site settings — this app can't re-prompt you; re-enable it there to receive alerts."
      >
        <BellOff size={14} />
        <span className="hidden sm:inline">Alerts blocked</span>
      </span>
    );
  }

  return (
    <button
      onClick={handleToggleClick}
      disabled={requesting}
      className="flex items-center gap-1.5 rounded-instrument border border-haze-50 bg-panelRaised px-2.5 py-1.5 text-xs text-ink shadow-instrument transition hover:bg-panelSunken disabled:opacity-50"
    >
      <BellRing size={14} className="text-brand" />
      <span className="hidden sm:inline">
        {requesting ? "Requesting…" : "Enable push alerts"}
      </span>
    </button>
  );
}

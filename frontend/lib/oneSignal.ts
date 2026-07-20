import { Capacitor } from "@capacitor/core";
import OneSignal from "@onesignal/capacitor-plugin";
import { supabase } from "./supabaseClient";

let webInitStarted = false;

export async function initOneSignal(userId: string) {
  if (!Capacitor.isNativePlatform()) {
    if (webInitStarted) return;
    webInitStarted = true;

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      console.log("🌐 Web push isn't supported in this browser context.");
      return;
    }

    try {
      const OneSignalWeb = (await import("react-onesignal")).default;

      await OneSignalWeb.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
        safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID,
        serviceWorkerPath: "/OneSignalSDKWorker.js",
        promptForPushNotificationsPermission: false,
      });

      // 🔥 FIX 1: Link identity context on web initialization
      if (userId) {
        await OneSignalWeb.login(userId);
        console.log("🔗 OneSignal Web User ID linked successfully:", userId);
      }
    } catch (error) {
      console.error("❌ Failed to initialize OneSignal Web SDK:", error);
    }
    return;
  }

  // Native platform — unchanged.
  try {
    await OneSignal.initialize(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!);
    await OneSignal.Notifications.requestPermission(true);

    const playerId = await OneSignal.User.getOnesignalId();
    if (playerId) {
      await supabase.from("device_push_tokens").upsert(
        {
          user_id: userId,
          onesignal_player_id: playerId,
          platform: Capacitor.getPlatform(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,onesignal_player_id" },
      );
    }

    OneSignal.User.pushSubscription.addEventListener(
      "change",
      async (event: any) => {
        const newPlayerId = event.current?.id || event.current;
        if (!newPlayerId) return;
        await supabase.from("device_push_tokens").upsert(
          {
            user_id: userId,
            onesignal_player_id: newPlayerId,
            platform: Capacitor.getPlatform(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,onesignal_player_id" },
        );
      },
    );
  } catch (error) {
    console.error("❌ Failed to initialize OneSignal:", error);
  }
}

export async function requestWebPushPermission(userId: string) {
  if (Capacitor.isNativePlatform()) return;
  const OneSignalWeb = (await import("react-onesignal")).default;

  // Ensure user identity alignment before triggering the display permission banner
  if (userId) {
    await OneSignalWeb.login(userId);
  }

  await OneSignalWeb.Notifications.requestPermission();

  async function saveCurrentSubscription(explicitId?: string) {
    // Check passed event data token values or fall back to native context check
    const id = explicitId || OneSignalWeb.User?.PushSubscription?.id;
    if (!id) {
      console.log("⚠️ No active Web subscription ID available yet.");
      return;
    }

    // Clean old references
    await supabase
      .from("device_push_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("platform", "web")
      .neq("onesignal_player_id", id);

    // Save fresh record
    await supabase.from("device_push_tokens").upsert(
      {
        user_id: userId,
        onesignal_player_id: id,
        platform: "web",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,onesignal_player_id" },
    );
    console.log("🚀 Web push token mapped successfully:", id);
  }

  // Run immediate registration check update
  await saveCurrentSubscription();

  // 🔥 FIX 2: Correct listener state tracking for dynamic token shifts
  OneSignalWeb.User.PushSubscription.addEventListener(
    "change",
    async (event: any) => {
      const freshTokenId = event.current?.id;
      if (freshTokenId) {
        await saveCurrentSubscription(freshTokenId);
      }
    },
  );
}

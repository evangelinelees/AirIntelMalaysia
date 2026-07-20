import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { randomBytes } from "crypto";

export async function POST() {
  const supabase = createSupabaseRouteClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const nonce = randomBytes(16).toString("hex");

  const { error } = await supabase
    .from("users")
    .update({ telegram_pairing_nonce: nonce })
    .eq("id", session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const botUsername =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "AirIntelMalaysiaBot";
  return NextResponse.json({
    deepLink: `https://t.me/${botUsername}?start=${nonce}`,
  });
}

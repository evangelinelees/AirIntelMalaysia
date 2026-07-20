import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseRouteClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Read the request body
  const body = await req.json();
  const { message, lat, lon } = body; // lat/lon are optional

  // Prepare payload for n8n
  const payload: any = {
    message,
    userId: session.user.id,
  };
  if (lat !== undefined && lon !== undefined) {
    payload.lat = lat;
    payload.lon = lon;
  }

  // Call n8n webhook
  const n8nRes = await fetch(`${process.env.N8N_HOST}/webhook/v1/app-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AirIntel-Secret": process.env.AIRINTEL_SHARED_SECRET!,
    },
    body: JSON.stringify(payload),
  });

  const data = await n8nRes.json();

  // You can also include the original lat/lon in the response
  const responseData = {
    ...data,
    // optionally echo back the coordinates
    sentLat: lat,
    sentLon: lon,
  };

  return NextResponse.json(responseData, { status: n8nRes.status });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const supabase = createSupabaseRouteClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Body
    const body = await req.json();
    const {
      label,
      lat,
      lon,
      address,
      pm25_threshold,
      aqi_threshold,
      location_id,
    } = body;

    // 3. Validation
    if (!label?.trim() || lat == null || lon == null) {
      return NextResponse.json(
        { error: "Missing required fields (label, lat, lon)" },
        { status: 400 },
      );
    }

    // 4. Upsert
    let result;
    if (location_id) {
      // Update existing
      result = await supabase
        .from("favorite_locations")
        .update({
          label,
          lat,
          lon,
          location: `SRID=4326;POINT(${lon} ${lat})`,
          address: address || null,
          pm25_threshold: pm25_threshold ?? null,
          aqi_threshold: aqi_threshold ?? null,
          created_at: new Date().toISOString(),
        })
        .eq("id", location_id)
        .eq("user_id", session.user.id) // security: only own records
        .select()
        .single();
    } else {
      // Insert new
      result = await supabase
        .from("favorite_locations")
        .insert({
          user_id: session.user.id,
          label,
          lat,
          lon,
          address: address || null,
          location: `SRID=4326;POINT(${lon} ${lat})`,
          pm25_threshold: pm25_threshold ?? null,
          aqi_threshold: aqi_threshold ?? null,
          enable_app_push: true, // default
          enable_telegram_push: false,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error("Supabase error:", result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error("❌ /api/register-geofence error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

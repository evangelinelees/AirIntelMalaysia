import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

// PATCH — update the caller's own username.
export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseRouteClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { username } = await req.json();
  if (!username || typeof username !== "string" || username.trim().length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
  }

  // users_self_update RLS policy already restricts this to auth.uid() = id,
  // so no need to re-check ownership here — the anon-key client enforces it.
  const { error } = await supabase
    .from("users")
    .update({ username: username.trim() })
    .eq("id", session.user.id);

  if (error) {
    // Unique violation on the username column, if you've added one.
    if (error.code === "23505") {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE — permanently deletes the caller's account and every row that
// references it. public.users.id has ON DELETE CASCADE back to
// auth.users(id), and favorite_locations / device_push_tokens /
// haze_alert_logs all cascade from public.users — so deleting the
// auth.users record (which requires the service-role key, hence the
// separate admin client) takes everything else down with it in one call.
export async function DELETE() {
  const supabase = createSupabaseRouteClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

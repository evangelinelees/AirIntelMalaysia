import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

// PATCH — update the caller's own username.
export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseRouteClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { username } = await req.json();

  // Validate username
  if (!username || typeof username !== "string") {
    return NextResponse.json(
      { error: "Username is required." },
      { status: 400 },
    );
  }

  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3) {
    return NextResponse.json(
      { error: "Username must be at least 3 characters." },
      { status: 400 },
    );
  }

  if (trimmedUsername.length > 30) {
    return NextResponse.json(
      { error: "Username must be at most 30 characters." },
      { status: 400 },
    );
  }

  // Check if username contains only allowed characters
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
    return NextResponse.json(
      {
        error:
          "Username can only contain letters, numbers, underscores, and hyphens.",
      },
      { status: 400 },
    );
  }

  // Check if username is already taken by another user
  const { data: existingUser, error: checkError } = await supabase
    .from("users")
    .select("id")
    .eq("username", trimmedUsername)
    .neq("id", session.user.id)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking username:", checkError);
    return NextResponse.json(
      { error: "Failed to check username availability." },
      { status: 500 },
    );
  }

  if (existingUser) {
    return NextResponse.json(
      { error: "That username is already taken." },
      { status: 409 },
    );
  }

  // Update the username
  const { error } = await supabase
    .from("users")
    .update({ username: trimmedUsername })
    .eq("id", session.user.id);

  if (error) {
    console.error("Error updating username:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, username: trimmedUsername });
}

// DELETE — permanently deletes the caller's account
export async function DELETE() {
  const supabase = createSupabaseRouteClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(session.user.id);

  if (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS entirely and can call
 * supabase.auth.admin.*. Only ever import this from route handlers
 * (app/api/**), never from a client component; the key must stay out of
 * anything bundled to the browser (no NEXT_PUBLIC_ prefix on purpose).
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

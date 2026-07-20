import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Route-handler-scoped Supabase client that reads the user's session
 * from cookies. This replaces @supabase/auth-helpers-nextjs, which
 * Supabase has deprecated in favor of @supabase/ssr — same job
 * (verifying who's logged in server-side before we act on their behalf),
 * current package.
 */
export function createSupabaseRouteClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component context where cookies can't
            // be set — safe to ignore here since middleware isn't in use.
          }
        },
      },
    }
  );
}

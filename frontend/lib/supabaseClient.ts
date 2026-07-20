import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// createBrowserClient (not the plain supabase-js createClient) stores the
// session in cookies instead of localStorage — that's what lets the
// server-side route handlers (lib/supabaseServer.ts, which reads cookies)
// actually see that you're logged in. Using the two mismatched clients
// together is why /api/telegram-link returned "Not authenticated" even
// while signed in in the browser.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

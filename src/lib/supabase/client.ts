import { createBrowserClient } from "@supabase/ssr";

// Client de browser (Client Components). Sessão persistida em cookies pelo @supabase/ssr.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client de servidor (Server Components, Route Handlers, Server Actions).
// cookies() é assíncrono no Next 16 — por isso a factory é async.
export async function createClient() {
  const cookieStore = await cookies();

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
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component (cookies read-only).
            // Ignorável: o proxy renova a sessão a cada request.
          }
        },
      },
    },
  );
}

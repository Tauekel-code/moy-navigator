import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Клиент для Server Components / Server Actions / Route Handlers.
// Работает от имени вошедшего пользователя (анонимный ключ + сессия из cookies),
// поэтому все запросы проходят через Row Level Security.
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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // вызвано из Server Component без возможности записи cookie —
            // сессия будет обновлена в middleware
          }
        },
      },
    },
  );
}

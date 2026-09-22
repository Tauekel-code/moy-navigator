import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isLocalMode } from "@/lib/config";
import { createLocalSupabaseStub } from "@/lib/local/fake-supabase";

// Клиент для Server Components / Server Actions / Route Handlers.
// Работает от имени вошедшего пользователя (анонимный ключ + сессия из cookies),
// поэтому все запросы проходят через Row Level Security.
// В локальном режиме (без Supabase) возвращает заглушку — см. lib/local/fake-supabase.ts.
export async function createClient() {
  if (isLocalMode()) return createLocalSupabaseStub();

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

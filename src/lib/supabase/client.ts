import { createBrowserClient } from "@supabase/ssr";
import { isLocalMode } from "@/lib/config";
import { createLocalSupabaseStub } from "@/lib/local/fake-supabase";

export function createClient() {
  if (isLocalMode()) return createLocalSupabaseStub();

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

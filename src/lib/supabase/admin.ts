import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Служебный клиент с service-role ключом — используется ТОЛЬКО в защищённых
// серверных контекстах без пользовательской сессии: cron-задачи (рассылка
// напоминаний, утренний план, вечерний итог) и Telegram webhook.
// Обходит RLS, поэтому каждый запрос обязан сам фильтровать по user_id.
// Ключ никогда не должен попасть во frontend-бандл (защищено пакетом server-only).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL не заданы");
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

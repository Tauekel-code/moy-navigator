import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/**
 * Получатели Telegram-рассылок: настройки уведомлений + подключение Telegram + профиль.
 * Три отдельных запроса вместо вложенного select: между этими таблицами нет прямых
 * внешних ключей, поэтому PostgREST не умеет их объединять.
 */
export async function loadTelegramRecipients(supabase: SupabaseClient, enabledColumn: string): Promise<Row[]> {
  const { data: settings, error } = await supabase
    .from("notification_settings")
    .select("*")
    .eq(enabledColumn, true)
    .eq("telegram_enabled", true);
  if (error) throw new Error(error.message);
  if (!settings?.length) return [];

  const ids = settings.map((s) => s.user_id);
  const [{ data: telegram }, { data: profiles }] = await Promise.all([
    supabase.from("telegram_connections").select("*").in("user_id", ids),
    supabase.from("user_profiles").select("*").in("id", ids),
  ]);
  const tgBy = new Map((telegram ?? []).map((t) => [t.user_id, t]));
  const prBy = new Map((profiles ?? []).map((p) => [p.id, p]));

  return settings.map((s) => ({ ...s, telegram: tgBy.get(s.user_id) ?? null, profile: prBy.get(s.user_id) ?? null }));
}

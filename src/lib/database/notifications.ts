import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationLogEntry } from "@/types/notification";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLog(row: any): NotificationLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    actionId: row.action_id,
    reminderId: row.reminder_id,
    notificationType: row.notification_type,
    channel: row.channel,
    payload: row.payload,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function listNotifications(supabase: SupabaseClient, userId: string, limit = 30): Promise<NotificationLogEntry[]> {
  const { data, error } = await supabase
    .from("notifications_log")
    .select("*")
    .eq("user_id", userId)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapLog);
}

export async function countUnreadNotifications(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("channel", "in_app")
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("notifications_log").update({ is_read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications_log")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
}

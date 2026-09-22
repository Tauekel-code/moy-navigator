import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/notifications";
import * as local from "@/lib/local/notifications";
import type { NotificationLogEntry } from "@/types/notification";

export async function listNotifications(supabase: SupabaseClient, userId: string, limit = 30): Promise<NotificationLogEntry[]> {
  return isLocalMode() ? local.listNotifications(userId, limit) : cloud.listNotifications(supabase, userId, limit);
}

export async function countUnreadNotifications(supabase: SupabaseClient, userId: string): Promise<number> {
  return isLocalMode() ? local.countUnreadNotifications(userId) : cloud.countUnreadNotifications(supabase, userId);
}

export async function markNotificationRead(supabase: SupabaseClient, id: string): Promise<void> {
  return isLocalMode() ? local.markNotificationRead(id) : cloud.markNotificationRead(supabase, id);
}

export async function markAllNotificationsRead(supabase: SupabaseClient, userId: string): Promise<void> {
  return isLocalMode() ? local.markAllNotificationsRead(userId) : cloud.markAllNotificationsRead(supabase, userId);
}

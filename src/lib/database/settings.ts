import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/settings";
import * as local from "@/lib/local/settings";
import type { UserProfile, UserProfileInput } from "@/types/user";
import type { NotificationSettings } from "@/types/notification";

export async function getUserProfile(supabase: SupabaseClient, userId: string): Promise<UserProfile | null> {
  return isLocalMode() ? local.getUserProfile(userId) : cloud.getUserProfile(supabase, userId);
}

export async function updateUserProfile(supabase: SupabaseClient, userId: string, patch: Partial<UserProfileInput>): Promise<UserProfile> {
  return isLocalMode() ? local.updateUserProfile(userId, patch) : cloud.updateUserProfile(supabase, userId, patch);
}

export async function getNotificationSettings(supabase: SupabaseClient, userId: string): Promise<NotificationSettings | null> {
  return isLocalMode() ? local.getNotificationSettings(userId) : cloud.getNotificationSettings(supabase, userId);
}

export async function updateNotificationSettings(
  supabase: SupabaseClient,
  userId: string,
  patch: Parameters<typeof cloud.updateNotificationSettings>[2],
): Promise<NotificationSettings> {
  return isLocalMode() ? local.updateNotificationSettings(userId, patch) : cloud.updateNotificationSettings(supabase, userId, patch);
}

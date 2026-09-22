import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/history";
import * as local from "@/lib/local/history";
import type { ActionHistoryEntry } from "@/types/history";

export async function listHistoryForAction(supabase: SupabaseClient, actionId: string): Promise<ActionHistoryEntry[]> {
  return isLocalMode() ? local.listHistoryForAction(actionId) : cloud.listHistoryForAction(supabase, actionId);
}

export async function listHistoryForUser(
  supabase: SupabaseClient,
  userId: string,
  opts: { page?: number; pageSize?: number; from?: string; to?: string } = {},
): Promise<{ entries: ActionHistoryEntry[]; total: number }> {
  return isLocalMode() ? local.listHistoryForUser(userId, opts) : cloud.listHistoryForUser(supabase, userId, opts);
}

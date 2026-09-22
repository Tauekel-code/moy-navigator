import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/archive";
import * as local from "@/lib/local/archive";
import type { Action } from "@/types/action";

export async function listArchivedActions(
  supabase: SupabaseClient,
  userId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<{ actions: Action[]; total: number }> {
  return isLocalMode() ? local.listArchivedActions(userId, opts) : cloud.listArchivedActions(supabase, userId, opts);
}

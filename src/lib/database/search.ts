import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/search";
import * as local from "@/lib/local/search";

export type { SearchResult } from "./cloud/search";

export async function globalSearch(supabase: SupabaseClient, userId: string, query: string) {
  return isLocalMode() ? local.globalSearch(userId, query) : cloud.globalSearch(supabase, userId, query);
}

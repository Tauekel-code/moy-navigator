import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/related";
import * as local from "@/lib/local/related";
import type { Action } from "@/types/action";

export async function listRelatedActions(supabase: SupabaseClient, actionId: string): Promise<Action[]> {
  return isLocalMode() ? local.listRelatedActions(actionId) : cloud.listRelatedActions(supabase, actionId);
}

export async function linkRelatedAction(supabase: SupabaseClient, actionId: string, relatedActionId: string, order = 0): Promise<void> {
  return isLocalMode() ? local.linkRelatedAction(actionId, relatedActionId, order) : cloud.linkRelatedAction(supabase, actionId, relatedActionId, order);
}

export async function unlinkRelatedAction(supabase: SupabaseClient, actionId: string, relatedActionId: string): Promise<void> {
  return isLocalMode() ? local.unlinkRelatedAction(actionId, relatedActionId) : cloud.unlinkRelatedAction(supabase, actionId, relatedActionId);
}

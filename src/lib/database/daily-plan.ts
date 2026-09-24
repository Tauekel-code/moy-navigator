import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/daily-plan";
import * as local from "@/lib/local/daily-plan";
import type { DailyPlan } from "@/types/daily-plan";

export async function getDailyPlan(supabase: SupabaseClient, userId: string, planDate: string): Promise<DailyPlan | null> {
  return isLocalMode() ? local.getDailyPlan(userId, planDate) : cloud.getDailyPlan(supabase, userId, planDate);
}

export async function saveDailyPlan(
  supabase: SupabaseClient,
  userId: string,
  planDate: string,
  items: { actionId: string; isRequired: boolean; included?: boolean }[],
  status: "accepted" | "modified" = "accepted",
): Promise<DailyPlan> {
  return isLocalMode() ? local.saveDailyPlan(userId, planDate, items, status) : cloud.saveDailyPlan(supabase, userId, planDate, items, status);
}

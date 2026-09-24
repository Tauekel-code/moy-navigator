import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDailyPlan, mapDailyPlanItem, mapAction } from "../mappers";
import type { DailyPlan } from "@/types/daily-plan";

export async function getDailyPlan(supabase: SupabaseClient, userId: string, planDate: string): Promise<DailyPlan | null> {
  const { data: planRow, error } = await supabase.from("daily_plans").select("*").eq("user_id", userId).eq("plan_date", planDate).maybeSingle();
  if (error) throw error;
  if (!planRow) return null;

  const { data: itemRows, error: itemsErr } = await supabase
    .from("daily_plan_items")
    .select("*, action:actions(*)")
    .eq("daily_plan_id", planRow.id)
    .order("sort_order", { ascending: true });
  if (itemsErr) throw itemsErr;

  const items = (itemRows ?? []).map((row) => ({
    ...mapDailyPlanItem(row),
    action: mapAction((row as unknown as { action: Record<string, unknown> }).action),
  }));

  return mapDailyPlan(planRow, items);
}

export async function saveDailyPlan(
  supabase: SupabaseClient,
  userId: string,
  planDate: string,
  items: { actionId: string; isRequired: boolean; included?: boolean }[],
  status: "accepted" | "modified" = "accepted",
): Promise<DailyPlan> {
  const now = new Date().toISOString();

  const { data: existing } = await supabase.from("daily_plans").select("id").eq("user_id", userId).eq("plan_date", planDate).maybeSingle();

  let planId: string;
  if (existing) {
    planId = existing.id;
    await supabase.from("daily_plans").update({ status, accepted_at: now }).eq("id", planId);
    await supabase.from("daily_plan_items").delete().eq("daily_plan_id", planId);
  } else {
    const { data, error } = await supabase
      .from("daily_plans")
      .insert({ user_id: userId, plan_date: planDate, status, accepted_at: now })
      .select()
      .single();
    if (error) throw error;
    planId = data.id;
  }

  if (items.length > 0) {
    const rows = items.map((item, index) => ({
      daily_plan_id: planId,
      action_id: item.actionId,
      user_id: userId,
      sort_order: index,
      is_required: item.isRequired,
      included: item.included !== false,
    }));
    const { error } = await supabase.from("daily_plan_items").insert(rows);
    if (error) throw error;
  }

  return (await getDailyPlan(supabase, userId, planDate))!;
}

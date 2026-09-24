import type { SupabaseClient } from "@supabase/supabase-js";
import { mapGoal, mapSubgoal, mapGoalHistoryEntry } from "../mappers";
import { logGenericHistory } from "./generic-history";
import type { Goal, GoalInput, GoalScoreInput, Subgoal, SubgoalInput } from "@/types/goal";

const GOAL_SELECT = `*, life_area:life_areas ( name, color )`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenGoal(row: any): Goal {
  return mapGoal({ ...row, life_area_name: row.life_area?.name ?? null, life_area_color: row.life_area?.color ?? null });
}

export interface GoalFilters {
  lifeAreaId?: string;
  status?: string[];
  includeArchived?: boolean;
}

export async function listGoals(supabase: SupabaseClient, userId: string, filters: GoalFilters = {}): Promise<Goal[]> {
  let query = supabase.from("goals").select(GOAL_SELECT).eq("user_id", userId).eq("is_archived", !!filters.includeArchived).order("created_at", { ascending: false });
  if (filters.lifeAreaId) query = query.eq("life_area_id", filters.lifeAreaId);
  if (filters.status?.length) query = query.in("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;

  const goals = (data ?? []).map(flattenGoal);
  for (const goal of goals) {
    const [{ count: tasksCount }, { count: tasksDone }, { count: subCount }, { count: subDone }] = await Promise.all([
      supabase.from("actions").select("*", { count: "exact", head: true }).eq("goal_id", goal.id).eq("is_archived", false),
      supabase.from("actions").select("*", { count: "exact", head: true }).eq("goal_id", goal.id).eq("is_archived", false).eq("status", "completed"),
      supabase.from("subgoals").select("*", { count: "exact", head: true }).eq("goal_id", goal.id),
      supabase.from("subgoals").select("*", { count: "exact", head: true }).eq("goal_id", goal.id).eq("status", "completed"),
    ]);
    goal.tasksCount = tasksCount ?? 0;
    goal.tasksCompletedCount = tasksDone ?? 0;
    goal.subgoalsCount = subCount ?? 0;
    goal.subgoalsCompletedCount = subDone ?? 0;
  }

  return goals;
}

export async function getGoalById(supabase: SupabaseClient, id: string): Promise<Goal | null> {
  const { data, error } = await supabase.from("goals").select(GOAL_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? flattenGoal(data) : null;
}

export async function createGoal(supabase: SupabaseClient, userId: string, input: GoalInput): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      life_area_id: input.lifeAreaId,
      title: input.title,
      description: input.description,
      goal_type: input.goalType,
      metric_type: input.metricType,
      metric_unit: input.metricUnit,
      current_value: input.currentValue,
      target_value: input.targetValue,
      start_date: input.startDate,
      deadline: input.deadline,
      priority: input.priority,
      status: input.status,
      criteria: input.criteria,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) throw error;

  await logGenericHistory(supabase, "goal_history", "goal_id", { id: data.id, userId, eventType: "created", newValue: { title: input.title } });
  return mapGoal(data);
}

export async function updateGoal(supabase: SupabaseClient, id: string, userId: string, patch: Partial<GoalInput>): Promise<Goal> {
  const { data: before } = await supabase.from("goals").select("*").eq("id", id).single();

  const dbPatch: Record<string, unknown> = {};
  if (patch.lifeAreaId !== undefined) dbPatch.life_area_id = patch.lifeAreaId;
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.goalType !== undefined) dbPatch.goal_type = patch.goalType;
  if (patch.metricType !== undefined) dbPatch.metric_type = patch.metricType;
  if (patch.metricUnit !== undefined) dbPatch.metric_unit = patch.metricUnit;
  if (patch.currentValue !== undefined) dbPatch.current_value = patch.currentValue;
  if (patch.targetValue !== undefined) dbPatch.target_value = patch.targetValue;
  if (patch.startDate !== undefined) dbPatch.start_date = patch.startDate;
  if (patch.deadline !== undefined) dbPatch.deadline = patch.deadline;
  if (patch.priority !== undefined) dbPatch.priority = patch.priority;
  if (patch.criteria !== undefined) dbPatch.criteria = patch.criteria;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes;

  let eventType: "updated" | "status_changed" | "progress_updated" = "updated";
  if (patch.status !== undefined && patch.status !== before?.status) {
    dbPatch.status = patch.status;
    if (patch.status === "completed") dbPatch.completed_at = new Date().toISOString();
    eventType = "status_changed";
  }
  if (patch.currentValue !== undefined && patch.currentValue !== before?.current_value) {
    eventType = "progress_updated";
  }

  const { data, error } = await supabase.from("goals").update(dbPatch).eq("id", id).select().single();
  if (error) throw error;

  await logGenericHistory(supabase, "goal_history", "goal_id", { id, userId, eventType, oldValue: before, newValue: patch });
  return mapGoal(data);
}

export async function archiveGoal(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from("goals").update({ is_archived: true, archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  await logGenericHistory(supabase, "goal_history", "goal_id", { id, userId, eventType: "archived" });
}

export async function restoreGoal(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from("goals").update({ is_archived: false, archived_at: null }).eq("id", id);
  if (error) throw error;
  await logGenericHistory(supabase, "goal_history", "goal_id", { id, userId, eventType: "restored" });
}

export async function addGoalScore(supabase: SupabaseClient, userId: string, goalId: string, input: GoalScoreInput) {
  const { data, error } = await supabase
    .from("goal_scores")
    .insert({ goal_id: goalId, user_id: userId, value: input.value, recorded_at: input.recordedAt ?? new Date().toISOString().slice(0, 10), comment: input.comment ?? null })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("goals").update({ current_value: input.value, updated_at: new Date().toISOString() }).eq("id", goalId);
  await logGenericHistory(supabase, "goal_history", "goal_id", { id: goalId, userId, eventType: "progress_updated", newValue: { value: input.value } });

  return data;
}

export async function listGoalScores(supabase: SupabaseClient, goalId: string) {
  const { data, error } = await supabase.from("goal_scores").select("*").eq("goal_id", goalId).order("recorded_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listGoalHistory(supabase: SupabaseClient, goalId: string) {
  const { data, error } = await supabase.from("goal_history").select("*").eq("goal_id", goalId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapGoalHistoryEntry);
}

// ---------------------------------------------------------------------------
// Подцели
// ---------------------------------------------------------------------------

export async function listSubgoals(supabase: SupabaseClient, goalId: string): Promise<Subgoal[]> {
  const { data, error } = await supabase.from("subgoals").select("*").eq("goal_id", goalId).order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapSubgoal);
}

export async function createSubgoal(supabase: SupabaseClient, userId: string, goalId: string, input: SubgoalInput): Promise<Subgoal> {
  const { count } = await supabase.from("subgoals").select("*", { count: "exact", head: true }).eq("goal_id", goalId);

  const { data, error } = await supabase
    .from("subgoals")
    .insert({
      goal_id: goalId,
      user_id: userId,
      title: input.title,
      deadline: input.deadline,
      status: input.status,
      metric_value: input.metricValue,
      metric_target: input.metricTarget,
      metric_unit: input.metricUnit,
      sort_order: count ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return mapSubgoal(data);
}

export async function updateSubgoal(supabase: SupabaseClient, id: string, patch: Partial<SubgoalInput>): Promise<Subgoal> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.deadline !== undefined) dbPatch.deadline = patch.deadline;
  if (patch.status !== undefined) {
    dbPatch.status = patch.status;
    if (patch.status === "completed") dbPatch.completed_at = new Date().toISOString();
  }
  if (patch.metricValue !== undefined) dbPatch.metric_value = patch.metricValue;
  if (patch.metricTarget !== undefined) dbPatch.metric_target = patch.metricTarget;
  if (patch.metricUnit !== undefined) dbPatch.metric_unit = patch.metricUnit;

  const { data, error } = await supabase.from("subgoals").update(dbPatch).eq("id", id).select().single();
  if (error) throw error;
  return mapSubgoal(data);
}

export async function deleteSubgoal(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("subgoals").delete().eq("id", id);
  if (error) throw error;
}

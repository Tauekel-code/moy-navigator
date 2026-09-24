import type { SupabaseClient } from "@supabase/supabase-js";
import { mapIdea, mapIdeaHistoryEntry } from "../mappers";
import { logGenericHistory } from "./generic-history";
import { createAction } from "./actions";
import { createGoal } from "./goals";
import type { Idea, IdeaInput, IdeaStatus } from "@/types/idea";
import type { Action } from "@/types/action";
import type { Goal } from "@/types/goal";

const IDEA_SELECT = `*, life_area:life_areas ( name ), goal:goals ( title ), project:projects ( name )`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenIdea(row: any): Idea {
  return mapIdea({
    ...row,
    life_area_name: row.life_area?.name ?? null,
    goal_title: row.goal?.title ?? null,
    project_name: row.project?.name ?? null,
  });
}

export async function listIdeas(supabase: SupabaseClient, userId: string, status?: IdeaStatus[], includeArchived = false): Promise<Idea[]> {
  let query = supabase.from("ideas").select(IDEA_SELECT).eq("user_id", userId).eq("is_archived", includeArchived).order("created_at", { ascending: false });
  if (status?.length) query = query.in("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(flattenIdea);
}

export async function getIdeaById(supabase: SupabaseClient, id: string): Promise<Idea | null> {
  const { data, error } = await supabase.from("ideas").select(IDEA_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? flattenIdea(data) : null;
}

export async function createIdea(supabase: SupabaseClient, userId: string, input: IdeaInput): Promise<Idea> {
  const { data, error } = await supabase
    .from("ideas")
    .insert({
      user_id: userId,
      text: input.text,
      source: input.source ?? "text",
      life_area_id: input.lifeAreaId ?? null,
      goal_id: input.goalId ?? null,
      project_id: input.projectId ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await logGenericHistory(supabase, "idea_history", "idea_id", { id: data.id, userId, eventType: "created", newValue: { text: input.text } });
  return mapIdea(data);
}

export async function updateIdea(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  patch: Partial<{ text: string; status: IdeaStatus; lifeAreaId: string | null; goalId: string | null; projectId: string | null; notes: string | null }>,
): Promise<Idea> {
  const { data: before } = await supabase.from("ideas").select("*").eq("id", id).single();

  const dbPatch: Record<string, unknown> = {};
  if (patch.text !== undefined) dbPatch.text = patch.text;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.lifeAreaId !== undefined) dbPatch.life_area_id = patch.lifeAreaId;
  if (patch.goalId !== undefined) dbPatch.goal_id = patch.goalId;
  if (patch.projectId !== undefined) dbPatch.project_id = patch.projectId;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes;

  const { data, error } = await supabase.from("ideas").update(dbPatch).eq("id", id).select().single();
  if (error) throw error;

  await logGenericHistory(supabase, "idea_history", "idea_id", {
    id,
    userId,
    eventType: patch.status && patch.status !== before?.status ? "status_changed" : "updated",
    oldValue: before,
    newValue: patch,
  });

  return mapIdea(data);
}

export async function archiveIdea(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from("ideas").update({ is_archived: true, archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  await logGenericHistory(supabase, "idea_history", "idea_id", { id, userId, eventType: "archived" });
}

export async function restoreIdea(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase.from("ideas").update({ is_archived: false, archived_at: null }).eq("id", id);
  if (error) throw error;
  await logGenericHistory(supabase, "idea_history", "idea_id", { id, userId, eventType: "restored" });
}

export async function deleteIdea(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  await logGenericHistory(supabase, "idea_history", "idea_id", { id, userId, eventType: "deleted" });
  const { error } = await supabase.from("ideas").delete().eq("id", id);
  if (error) throw error;
}

export async function convertIdeaToTask(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  overrides: { actionDate?: string | null; startTime?: string | null } = {},
): Promise<{ idea: Idea; action: Action }> {
  const idea = await getIdeaById(supabase, id);
  if (!idea) throw new Error("Идея не найдена");

  const action = await createAction(supabase, userId, {
    title: idea.text,
    type: "task",
    actionDate: overrides.actionDate ?? null,
    startTime: overrides.startTime ?? null,
    endTime: null,
    allDay: false,
    timezone: null,
    priority: "normal",
    status: "planned",
    projectId: idea.projectId,
    lifeAreaId: idea.lifeAreaId,
    goalId: idea.goalId,
    ideaId: id,
  });

  await supabase.from("ideas").update({ status: "planned", converted_action_id: action.id, updated_at: new Date().toISOString() }).eq("id", id);
  await logGenericHistory(supabase, "idea_history", "idea_id", { id, userId, eventType: "converted_to_task", newValue: { actionId: action.id } });

  const updatedIdea = await getIdeaById(supabase, id);
  return { idea: updatedIdea!, action };
}

export async function convertIdeaToGoal(supabase: SupabaseClient, id: string, userId: string): Promise<{ idea: Idea; goal: Goal }> {
  const idea = await getIdeaById(supabase, id);
  if (!idea) throw new Error("Идея не найдена");

  const goal = await createGoal(supabase, userId, {
    lifeAreaId: idea.lifeAreaId,
    title: idea.text,
    description: idea.notes,
    goalType: "one_time",
    metricType: "text",
    metricUnit: null,
    currentValue: null,
    targetValue: null,
    startDate: new Date().toISOString().slice(0, 10),
    deadline: null,
    priority: "normal",
    status: "active",
    criteria: null,
    notes: null,
  });

  await supabase.from("ideas").update({ status: "implemented", converted_goal_id: goal.id, updated_at: new Date().toISOString() }).eq("id", id);
  await logGenericHistory(supabase, "idea_history", "idea_id", { id, userId, eventType: "converted_to_goal", newValue: { goalId: goal.id } });

  const updatedIdea = await getIdeaById(supabase, id);
  return { idea: updatedIdea!, goal };
}

export async function listIdeaHistory(supabase: SupabaseClient, ideaId: string) {
  const { data, error } = await supabase.from("idea_history").select("*").eq("idea_id", ideaId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapIdeaHistoryEntry);
}

export async function countUnreviewedIdeas(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase.from("ideas").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "new").eq("is_archived", false);
  if (error) throw error;
  return count ?? 0;
}

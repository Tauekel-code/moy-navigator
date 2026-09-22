import type { SupabaseClient } from "@supabase/supabase-js";
import { mapProject } from "../mappers";
import type { Project, ProjectInput } from "@/types/project";

export async function listProjects(supabase: SupabaseClient, userId: string, includeArchived = false): Promise<Project[]> {
  let query = supabase
    .from("projects")
    .select("*, action_projects(count)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!includeArchived) query = query.neq("status", "archived");

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) =>
    mapProject({ ...row, actions_count: row.action_projects?.[0]?.count ?? 0 }),
  );
}

export async function getProjectById(supabase: SupabaseClient, id: string): Promise<Project | null> {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapProject(data) : null;
}

export async function createProject(supabase: SupabaseClient, userId: string, input: ProjectInput): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description,
      status: input.status,
      color: input.color,
      icon: input.icon,
    })
    .select()
    .single();
  if (error) throw error;
  return mapProject(data);
}

export async function updateProject(supabase: SupabaseClient, id: string, patch: Partial<ProjectInput>): Promise<Project> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.status !== undefined) {
    dbPatch.status = patch.status;
    if (patch.status === "completed") dbPatch.completed_at = new Date().toISOString();
    if (patch.status === "archived") dbPatch.archived_at = new Date().toISOString();
  }
  if (patch.color !== undefined) dbPatch.color = patch.color;
  if (patch.icon !== undefined) dbPatch.icon = patch.icon;

  const { data, error } = await supabase.from("projects").update(dbPatch).eq("id", id).select().single();
  if (error) throw error;
  return mapProject(data);
}

export async function deleteProject(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

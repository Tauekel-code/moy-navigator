import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/projects";
import * as local from "@/lib/local/projects";
import type { Project, ProjectInput } from "@/types/project";

export async function listProjects(supabase: SupabaseClient, userId: string, includeArchived = false): Promise<Project[]> {
  return isLocalMode() ? local.listProjects(userId, includeArchived) : cloud.listProjects(supabase, userId, includeArchived);
}

export async function getProjectById(supabase: SupabaseClient, id: string): Promise<Project | null> {
  return isLocalMode() ? local.getProjectById(id) : cloud.getProjectById(supabase, id);
}

export async function createProject(supabase: SupabaseClient, userId: string, input: ProjectInput): Promise<Project> {
  return isLocalMode() ? local.createProject(userId, input) : cloud.createProject(supabase, userId, input);
}

export async function updateProject(supabase: SupabaseClient, id: string, patch: Partial<ProjectInput>): Promise<Project> {
  return isLocalMode() ? local.updateProject(id, patch) : cloud.updateProject(supabase, id, patch);
}

export async function deleteProject(supabase: SupabaseClient, id: string): Promise<void> {
  return isLocalMode() ? local.deleteProject(id) : cloud.deleteProject(supabase, id);
}

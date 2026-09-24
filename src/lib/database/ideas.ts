import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/ideas";
import * as local from "@/lib/local/ideas";
import type { Idea, IdeaInput, IdeaStatus } from "@/types/idea";

export async function listIdeas(supabase: SupabaseClient, userId: string, status?: IdeaStatus[], includeArchived = false): Promise<Idea[]> {
  return isLocalMode() ? local.listIdeas(userId, status, includeArchived) : cloud.listIdeas(supabase, userId, status, includeArchived);
}

export async function getIdeaById(supabase: SupabaseClient, id: string): Promise<Idea | null> {
  return isLocalMode() ? local.getIdeaById(id) : cloud.getIdeaById(supabase, id);
}

export async function createIdea(supabase: SupabaseClient, userId: string, input: IdeaInput): Promise<Idea> {
  return isLocalMode() ? local.createIdea(userId, input) : cloud.createIdea(supabase, userId, input);
}

export async function updateIdea(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  patch: Parameters<typeof cloud.updateIdea>[3],
): Promise<Idea> {
  return isLocalMode() ? local.updateIdea(id, userId, patch) : cloud.updateIdea(supabase, id, userId, patch);
}

export async function archiveIdea(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  return isLocalMode() ? local.archiveIdea(id, userId) : cloud.archiveIdea(supabase, id, userId);
}

export async function restoreIdea(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  return isLocalMode() ? local.restoreIdea(id, userId) : cloud.restoreIdea(supabase, id, userId);
}

export async function deleteIdea(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  return isLocalMode() ? local.deleteIdea(id, userId) : cloud.deleteIdea(supabase, id, userId);
}

export async function convertIdeaToTask(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  overrides: { actionDate?: string | null; startTime?: string | null } = {},
) {
  return isLocalMode() ? local.convertIdeaToTask(id, userId, overrides) : cloud.convertIdeaToTask(supabase, id, userId, overrides);
}

export async function convertIdeaToGoal(supabase: SupabaseClient, id: string, userId: string) {
  return isLocalMode() ? local.convertIdeaToGoal(id, userId) : cloud.convertIdeaToGoal(supabase, id, userId);
}

export async function listIdeaHistory(supabase: SupabaseClient, ideaId: string) {
  return isLocalMode() ? local.listIdeaHistory(ideaId) : cloud.listIdeaHistory(supabase, ideaId);
}

export async function countUnreviewedIdeas(supabase: SupabaseClient, userId: string): Promise<number> {
  return isLocalMode() ? local.countUnreviewedIdeas(userId) : cloud.countUnreviewedIdeas(supabase, userId);
}

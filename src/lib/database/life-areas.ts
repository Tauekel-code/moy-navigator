import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/life-areas";
import * as local from "@/lib/local/life-areas";
import type { LifeArea, LifeAreaInput, LifeAreaScore, LifeAreaScoreInput } from "@/types/life-area";

export async function listLifeAreas(supabase: SupabaseClient, userId: string, includeArchived = false): Promise<LifeArea[]> {
  return isLocalMode() ? local.listLifeAreas(userId, includeArchived) : cloud.listLifeAreas(supabase, userId, includeArchived);
}

export async function getLifeAreaById(supabase: SupabaseClient, id: string): Promise<LifeArea | null> {
  return isLocalMode() ? local.getLifeAreaById(id) : cloud.getLifeAreaById(supabase, id);
}

export async function createLifeArea(supabase: SupabaseClient, userId: string, input: LifeAreaInput): Promise<LifeArea> {
  return isLocalMode() ? local.createLifeArea(userId, input) : cloud.createLifeArea(supabase, userId, input);
}

export async function updateLifeArea(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<LifeAreaInput & { sortOrder: number }>,
): Promise<LifeArea> {
  return isLocalMode() ? local.updateLifeArea(id, patch) : cloud.updateLifeArea(supabase, id, patch);
}

export async function archiveLifeArea(supabase: SupabaseClient, id: string): Promise<void> {
  return isLocalMode() ? local.archiveLifeArea(id) : cloud.archiveLifeArea(supabase, id);
}

export async function restoreLifeArea(supabase: SupabaseClient, id: string): Promise<void> {
  return isLocalMode() ? local.restoreLifeArea(id) : cloud.restoreLifeArea(supabase, id);
}

export async function addLifeAreaScore(supabase: SupabaseClient, userId: string, lifeAreaId: string, input: LifeAreaScoreInput): Promise<LifeAreaScore> {
  return isLocalMode() ? local.addLifeAreaScore(userId, lifeAreaId, input) : cloud.addLifeAreaScore(supabase, userId, lifeAreaId, input);
}

export async function listLifeAreaScores(supabase: SupabaseClient, lifeAreaId: string, opts: { from?: string; to?: string } = {}): Promise<LifeAreaScore[]> {
  return isLocalMode() ? local.listLifeAreaScores(lifeAreaId, opts) : cloud.listLifeAreaScores(supabase, lifeAreaId, opts);
}

export async function seedDefaultLifeAreas(supabase: SupabaseClient, userId: string): Promise<LifeArea[]> {
  return isLocalMode() ? local.seedDefaultLifeAreas(userId) : cloud.seedDefaultLifeAreas(supabase, userId);
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapLifeArea, mapLifeAreaScore } from "../mappers";
import type { LifeArea, LifeAreaInput, LifeAreaScore, LifeAreaScoreInput } from "@/types/life-area";
import { DEFAULT_LIFE_AREAS } from "@/types/life-area";

async function withLatestScore(supabase: SupabaseClient, areas: Record<string, unknown>[]): Promise<LifeArea[]> {
  const results: LifeArea[] = [];
  for (const row of areas) {
    const [{ data: scoreRow }, { count: goalsCount }] = await Promise.all([
      supabase
        .from("life_area_scores")
        .select("score, desired_score, scored_at")
        .eq("life_area_id", row.id)
        .order("scored_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("goals").select("*", { count: "exact", head: true }).eq("life_area_id", row.id).eq("is_archived", false),
    ]);

    results.push(
      mapLifeArea({
        ...row,
        latest_score: scoreRow?.score ?? null,
        latest_desired_score: scoreRow?.desired_score ?? null,
        latest_score_date: scoreRow?.scored_at ?? null,
        goals_count: goalsCount ?? 0,
      }),
    );
  }
  return results;
}

export async function listLifeAreas(supabase: SupabaseClient, userId: string, includeArchived = false): Promise<LifeArea[]> {
  let query = supabase.from("life_areas").select("*").eq("user_id", userId).order("sort_order", { ascending: true });
  if (!includeArchived) query = query.eq("is_archived", false);

  const { data, error } = await query;
  if (error) throw error;
  return withLatestScore(supabase, data ?? []);
}

export async function getLifeAreaById(supabase: SupabaseClient, id: string): Promise<LifeArea | null> {
  const { data, error } = await supabase.from("life_areas").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [result] = await withLatestScore(supabase, [data]);
  return result;
}

export async function createLifeArea(supabase: SupabaseClient, userId: string, input: LifeAreaInput): Promise<LifeArea> {
  const { count } = await supabase.from("life_areas").select("*", { count: "exact", head: true }).eq("user_id", userId);

  const { data, error } = await supabase
    .from("life_areas")
    .insert({ user_id: userId, name: input.name, description: input.description, color: input.color, icon: input.icon, sort_order: count ?? 0 })
    .select()
    .single();
  if (error) throw error;
  return mapLifeArea(data);
}

export async function updateLifeArea(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<LifeAreaInput & { sortOrder: number }>,
): Promise<LifeArea> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.color !== undefined) dbPatch.color = patch.color;
  if (patch.icon !== undefined) dbPatch.icon = patch.icon;
  if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder;

  const { data, error } = await supabase.from("life_areas").update(dbPatch).eq("id", id).select().single();
  if (error) throw error;
  return mapLifeArea(data);
}

export async function archiveLifeArea(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("life_areas").update({ is_archived: true, archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function restoreLifeArea(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("life_areas").update({ is_archived: false, archived_at: null }).eq("id", id);
  if (error) throw error;
}

export async function addLifeAreaScore(supabase: SupabaseClient, userId: string, lifeAreaId: string, input: LifeAreaScoreInput): Promise<LifeAreaScore> {
  const { data, error } = await supabase
    .from("life_area_scores")
    .insert({
      life_area_id: lifeAreaId,
      user_id: userId,
      score: input.score,
      desired_score: input.desiredScore ?? null,
      scored_at: input.scoredAt ?? new Date().toISOString().slice(0, 10),
      comment: input.comment ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapLifeAreaScore(data);
}

export async function listLifeAreaScores(supabase: SupabaseClient, lifeAreaId: string, opts: { from?: string; to?: string } = {}): Promise<LifeAreaScore[]> {
  let query = supabase.from("life_area_scores").select("*").eq("life_area_id", lifeAreaId).order("scored_at", { ascending: true });
  if (opts.from) query = query.gte("scored_at", opts.from);
  if (opts.to) query = query.lte("scored_at", opts.to);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapLifeAreaScore);
}

export async function seedDefaultLifeAreas(supabase: SupabaseClient, userId: string): Promise<LifeArea[]> {
  const { count } = await supabase.from("life_areas").select("*", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) > 0) return listLifeAreas(supabase, userId);

  const rows = DEFAULT_LIFE_AREAS.map((area, i) => ({ user_id: userId, name: area.name, color: area.color, icon: area.icon, sort_order: i }));
  const { error } = await supabase.from("life_areas").insert(rows);
  if (error) throw error;

  return listLifeAreas(supabase, userId);
}

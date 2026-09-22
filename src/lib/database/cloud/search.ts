import type { SupabaseClient } from "@supabase/supabase-js";
import { mapAction } from "../mappers";
import type { Action } from "@/types/action";

export interface SearchResult {
  actions: Action[];
  projects: { id: string; name: string }[];
  contacts: { id: string; name: string }[];
}

/** Раздел 36: глобальный поиск по названию, контексту, результату, проекту, контакту, заметкам. */
export async function globalSearch(supabase: SupabaseClient, userId: string, query: string): Promise<SearchResult> {
  const like = `%${query}%`;

  const [titleMatches, contextMatches, resultMatches, projects, contacts] = await Promise.all([
    supabase.from("actions").select("*").eq("user_id", userId).eq("is_archived", false).ilike("title", like).limit(30),
    supabase
      .from("action_context")
      .select("action:actions!inner(*)")
      .eq("action.user_id", userId)
      .eq("action.is_archived", false)
      .or(
        `why_text.ilike.${like},goal_text.ilike.${like},dont_forget_text.ilike.${like},main_argument.ilike.${like},questions_text.ilike.${like},preparation_text.ilike.${like},next_step.ilike.${like}`,
      )
      .limit(30),
    supabase
      .from("action_results")
      .select("action:actions!inner(*)")
      .eq("action.user_id", userId)
      .eq("action.is_archived", false)
      .ilike("result_text", like)
      .limit(30),
    supabase.from("projects").select("id, name").eq("user_id", userId).ilike("name", like).limit(10),
    supabase.from("contacts").select("id, name").eq("user_id", userId).ilike("name", like).limit(10),
  ]);

  const actionMap = new Map<string, Action>();

  for (const row of titleMatches.data ?? []) actionMap.set(row.id, mapAction(row));
  for (const row of contextMatches.data ?? []) {
    const a = (row as unknown as { action: Record<string, unknown> }).action;
    if (a) actionMap.set(a.id as string, mapAction(a));
  }
  for (const row of resultMatches.data ?? []) {
    const a = (row as unknown as { action: Record<string, unknown> }).action;
    if (a) actionMap.set(a.id as string, mapAction(a));
  }

  return {
    actions: Array.from(actionMap.values()).sort((a, b) => (b.actionDate ?? "").localeCompare(a.actionDate ?? "")),
    projects: projects.data ?? [],
    contacts: contacts.data ?? [],
  };
}

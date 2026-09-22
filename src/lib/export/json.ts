import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripJoinedAction(row: any) {
  const rest = { ...row };
  delete rest.action;
  return rest;
}

/** Раздел 39, 67: полная резервная копия всех данных пользователя. */
export async function exportUserDataAsJson(supabase: SupabaseClient, userId: string) {
  const [actions, projects, contacts, contexts, results, reminders, history, reviews, recurrenceRules] = await Promise.all([
    supabase.from("actions").select("*").eq("user_id", userId),
    supabase.from("projects").select("*").eq("user_id", userId),
    supabase.from("contacts").select("*").eq("user_id", userId),
    supabase.from("action_context").select("*, action:actions!inner(user_id)").eq("action.user_id", userId),
    supabase.from("action_results").select("*, action:actions!inner(user_id)").eq("action.user_id", userId),
    supabase.from("reminders").select("*").eq("user_id", userId),
    supabase.from("action_history").select("*").eq("user_id", userId),
    supabase.from("daily_reviews").select("*").eq("user_id", userId),
    supabase.from("recurrence_rules").select("*").eq("user_id", userId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      actions: actions.data ?? [],
      projects: projects.data ?? [],
      contacts: contacts.data ?? [],
      actionContext: (contexts.data ?? []).map(stripJoinedAction),
      actionResults: (results.data ?? []).map(stripJoinedAction),
      reminders: reminders.data ?? [],
      actionHistory: history.data ?? [],
      dailyReviews: reviews.data ?? [],
      recurrenceRules: recurrenceRules.data ?? [],
    },
  };
}

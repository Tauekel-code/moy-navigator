import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import { getLocalDb } from "@/lib/local/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripJoinedAction(row: any) {
  const rest = { ...row };
  delete rest.action;
  return rest;
}

/** Раздел 39, 67: полная резервная копия всех данных пользователя. */
export async function exportUserDataAsJson(supabase: SupabaseClient, userId: string) {
  if (isLocalMode()) return exportLocalUserDataAsJson(userId);

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

function exportLocalUserDataAsJson(userId: string) {
  const db = getLocalDb();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = (sql: string): any[] => db.prepare(sql).all(userId);

  const actionContext = q(
    "select c.* from action_context c join actions a on a.id = c.action_id where a.user_id = ?",
  ).map((row) => ({ ...row, links: JSON.parse(row.links ?? "[]") }));

  const actionHistory = q("select * from action_history where user_id = ?").map((row) => ({
    ...row,
    old_value: row.old_value ? JSON.parse(row.old_value) : null,
    new_value: row.new_value ? JSON.parse(row.new_value) : null,
  }));

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      actions: q("select * from actions where user_id = ?").map((row) => ({ ...row, all_day: !!row.all_day, is_archived: !!row.is_archived })),
      projects: q("select * from projects where user_id = ?"),
      contacts: q("select * from contacts where user_id = ?"),
      actionContext,
      actionResults: q("select r.* from action_results r join actions a on a.id = r.action_id where a.user_id = ?"),
      reminders: q("select * from reminders where user_id = ?").map((row) => ({ ...row, is_sent: !!row.is_sent })),
      actionHistory,
      dailyReviews: q("select * from daily_reviews where user_id = ?"),
      recurrenceRules: q("select * from recurrence_rules where user_id = ?"),
    },
  };
}

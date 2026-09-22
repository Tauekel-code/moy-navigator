import type { SupabaseClient } from "@supabase/supabase-js";
import { mapHistoryEntry } from "../mappers";
import type { ActionHistoryEntry } from "@/types/history";

export async function listHistoryForAction(supabase: SupabaseClient, actionId: string): Promise<ActionHistoryEntry[]> {
  const { data, error } = await supabase
    .from("action_history")
    .select("*")
    .eq("action_id", actionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapHistoryEntry);
}

export async function listHistoryForUser(
  supabase: SupabaseClient,
  userId: string,
  opts: { page?: number; pageSize?: number; from?: string; to?: string } = {},
): Promise<{ entries: ActionHistoryEntry[]; total: number }> {
  const page = opts.page ?? 0;
  const pageSize = opts.pageSize ?? 50;

  let query = supabase
    .from("action_history")
    .select("*, action:actions(title)", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (opts.from) query = query.gte("created_at", opts.from);
  if (opts.to) query = query.lte("created_at", opts.to);

  const { data, error, count } = await query;
  if (error) throw error;

  const entries = (data ?? []).map((row) =>
    mapHistoryEntry({ ...row, action_title: (row as unknown as { action?: { title?: string } }).action?.title }),
  );

  return { entries, total: count ?? entries.length };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapAction } from "./mappers";
import type { Action } from "@/types/action";

/** Раздел 38: архив реализован через soft delete (actions.is_archived). */
export async function listArchivedActions(
  supabase: SupabaseClient,
  userId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<{ actions: Action[]; total: number }> {
  const page = opts.page ?? 0;
  const pageSize = opts.pageSize ?? 50;

  const { data, error, count } = await supabase
    .from("actions")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .eq("is_archived", true)
    .order("archived_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw error;

  return { actions: (data ?? []).map(mapAction), total: count ?? 0 };
}

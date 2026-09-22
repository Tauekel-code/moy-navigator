import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDailyReview } from "./mappers";
import { listActionsForRange } from "./actions";
import { combineDateTimeToInstant } from "@/lib/dates";
import type { DailyReview, DailyReviewNoteInput } from "@/types/review";

/**
 * Раздел 30, 46, 71 ТЗ: собирает статистику дня и сохраняет её,
 * не затирая уже введённые пользователем ручные заметки.
 */
export async function generateOrUpdateDailyReview(
  supabase: SupabaseClient,
  userId: string,
  reviewDate: string,
  timezone: string,
): Promise<DailyReview> {
  const actions = await listActionsForRange(supabase, userId, reviewDate, reviewDate, { includeArchived: false });

  const counts = {
    planned_count: actions.length,
    completed_count: actions.filter((a) => a.status === "completed").length,
    cancelled_count: actions.filter((a) => a.status === "cancelled").length,
    overdue_count: actions.filter((a) => a.status === "overdue").length,
    in_progress_count: actions.filter((a) => a.status === "in_progress").length,
  };

  const dayStart = combineDateTimeToInstant(reviewDate, "00:00", timezone).toISOString();
  const dayEnd = combineDateTimeToInstant(reviewDate, "23:59", timezone).toISOString();

  const { data: reschedules, error: histErr } = await supabase
    .from("action_history")
    .select("old_value")
    .eq("user_id", userId)
    .eq("event_type", "rescheduled")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);
  if (histErr) throw histErr;

  const postponedCount = (reschedules ?? []).filter(
    (r) => (r.old_value as { action_date?: string } | null)?.action_date === reviewDate,
  ).length;

  const { data, error } = await supabase
    .from("daily_reviews")
    .upsert(
      {
        user_id: userId,
        review_date: reviewDate,
        ...counts,
        postponed_count: postponedCount,
      },
      { onConflict: "user_id,review_date" },
    )
    .select()
    .single();
  if (error) throw error;

  return mapDailyReview(data);
}

export async function getDailyReview(supabase: SupabaseClient, userId: string, reviewDate: string): Promise<DailyReview | null> {
  const { data, error } = await supabase
    .from("daily_reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("review_date", reviewDate)
    .maybeSingle();
  if (error) throw error;
  return data ? mapDailyReview(data) : null;
}

export async function updateDailyReviewNotes(
  supabase: SupabaseClient,
  userId: string,
  reviewDate: string,
  notes: DailyReviewNoteInput,
): Promise<DailyReview> {
  const { data, error } = await supabase
    .from("daily_reviews")
    .upsert(
      {
        user_id: userId,
        review_date: reviewDate,
        main_result: notes.mainResult,
        what_failed: notes.whatFailed,
        important_tomorrow: notes.importantTomorrow,
        personal_note: notes.personalNote,
      },
      { onConflict: "user_id,review_date" },
    )
    .select()
    .single();
  if (error) throw error;
  return mapDailyReview(data);
}

export async function listRecentReviews(supabase: SupabaseClient, userId: string, limit = 30): Promise<DailyReview[]> {
  const { data, error } = await supabase
    .from("daily_reviews")
    .select("*")
    .eq("user_id", userId)
    .order("review_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapDailyReview);
}

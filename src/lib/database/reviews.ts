import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/reviews";
import * as local from "@/lib/local/reviews";
import type { DailyReview, DailyReviewNoteInput } from "@/types/review";

export async function generateOrUpdateDailyReview(supabase: SupabaseClient, userId: string, reviewDate: string, timezone: string): Promise<DailyReview> {
  return isLocalMode() ? local.generateOrUpdateDailyReview(userId, reviewDate, timezone) : cloud.generateOrUpdateDailyReview(supabase, userId, reviewDate, timezone);
}

export async function getDailyReview(supabase: SupabaseClient, userId: string, reviewDate: string): Promise<DailyReview | null> {
  return isLocalMode() ? local.getDailyReview(userId, reviewDate) : cloud.getDailyReview(supabase, userId, reviewDate);
}

export async function updateDailyReviewNotes(supabase: SupabaseClient, userId: string, reviewDate: string, notes: DailyReviewNoteInput): Promise<DailyReview> {
  return isLocalMode() ? local.updateDailyReviewNotes(userId, reviewDate, notes) : cloud.updateDailyReviewNotes(supabase, userId, reviewDate, notes);
}

export async function listRecentReviews(supabase: SupabaseClient, userId: string, limit = 30): Promise<DailyReview[]> {
  return isLocalMode() ? local.listRecentReviews(userId, limit) : cloud.listRecentReviews(supabase, userId, limit);
}

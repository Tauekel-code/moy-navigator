import "server-only";
import { getLocalDb, nowIso, newId } from "./db";
import { listActionsForRange } from "./actions";
import { mapDailyReview } from "@/lib/database/mappers";
import { combineDateTimeToInstant } from "@/lib/dates";
import type { DailyReview, DailyReviewNoteInput } from "@/types/review";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function generateOrUpdateDailyReview(userId: string, reviewDate: string, timezone: string): Promise<DailyReview> {
  const db = getLocalDb();
  const actions = await listActionsForRange(userId, reviewDate, reviewDate, { includeArchived: false });

  const plannedCount = actions.length;
  const completedCount = actions.filter((a) => a.status === "completed").length;
  const cancelledCount = actions.filter((a) => a.status === "cancelled").length;
  const overdueCount = actions.filter((a) => a.status === "overdue").length;
  const inProgressCount = actions.filter((a) => a.status === "in_progress").length;

  const dayStart = combineDateTimeToInstant(reviewDate, "00:00", timezone).toISOString();
  const dayEnd = combineDateTimeToInstant(reviewDate, "23:59", timezone).toISOString();

  const reschedules = db
    .prepare("select old_value from action_history where user_id = ? and event_type = 'rescheduled' and created_at >= ? and created_at <= ?")
    .all(userId, dayStart, dayEnd) as Row[];

  const postponedCount = reschedules.filter((r) => {
    try {
      return r.old_value && JSON.parse(r.old_value)?.action_date === reviewDate;
    } catch {
      return false;
    }
  }).length;

  const now = nowIso();
  const existing = db.prepare("select id from daily_reviews where user_id = ? and review_date = ?").get(userId, reviewDate) as Row | undefined;

  if (existing) {
    db.prepare(
      `update daily_reviews set planned_count=?, completed_count=?, postponed_count=?, cancelled_count=?, overdue_count=?, in_progress_count=?, updated_at=? where id=?`,
    ).run(plannedCount, completedCount, postponedCount, cancelledCount, overdueCount, inProgressCount, now, existing.id);
  } else {
    db.prepare(
      `insert into daily_reviews (id, user_id, review_date, planned_count, completed_count, postponed_count, cancelled_count, overdue_count, in_progress_count, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(newId(), userId, reviewDate, plannedCount, completedCount, postponedCount, cancelledCount, overdueCount, inProgressCount, now, now);
  }

  const row = db.prepare("select * from daily_reviews where user_id = ? and review_date = ?").get(userId, reviewDate) as Row;
  return mapDailyReview(row);
}

export async function getDailyReview(userId: string, reviewDate: string): Promise<DailyReview | null> {
  const db = getLocalDb();
  const row = db.prepare("select * from daily_reviews where user_id = ? and review_date = ?").get(userId, reviewDate) as Row | undefined;
  return row ? mapDailyReview(row) : null;
}

export async function updateDailyReviewNotes(userId: string, reviewDate: string, notes: DailyReviewNoteInput): Promise<DailyReview> {
  const db = getLocalDb();
  const now = nowIso();
  const existing = db.prepare("select id from daily_reviews where user_id = ? and review_date = ?").get(userId, reviewDate) as Row | undefined;

  if (existing) {
    db.prepare("update daily_reviews set main_result=?, what_failed=?, important_tomorrow=?, personal_note=?, updated_at=? where id=?").run(
      notes.mainResult,
      notes.whatFailed,
      notes.importantTomorrow,
      notes.personalNote,
      now,
      existing.id,
    );
  } else {
    db.prepare(
      `insert into daily_reviews (id, user_id, review_date, main_result, what_failed, important_tomorrow, personal_note, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(newId(), userId, reviewDate, notes.mainResult, notes.whatFailed, notes.importantTomorrow, notes.personalNote, now, now);
  }

  const row = db.prepare("select * from daily_reviews where user_id = ? and review_date = ?").get(userId, reviewDate) as Row;
  return mapDailyReview(row);
}

export async function listRecentReviews(userId: string, limit = 30): Promise<DailyReview[]> {
  const db = getLocalDb();
  const rows = db.prepare("select * from daily_reviews where user_id = ? order by review_date desc limit ?").all(userId, limit) as Row[];
  return rows.map(mapDailyReview);
}

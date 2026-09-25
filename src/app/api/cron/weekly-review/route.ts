import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadTelegramRecipients } from "@/lib/cron/recipients";
import { verifyCronRequest } from "@/lib/cron/verify";
import { isWithinWindow } from "@/lib/cron/time-window";
import { listActionsFiltered } from "@/lib/database/actions";
import { listLifeAreas } from "@/lib/database/life-areas";
import { listGoals } from "@/lib/database/goals";
import { countUnreviewedIdeas } from "@/lib/database/ideas";
import { computePeriodStats } from "@/lib/stats/compute";
import { formatWeeklyReview } from "@/lib/telegram/messages";
import { dispatchNotification } from "@/lib/notifications/service";
import { addCalendarDays, todayInTz, formatInstant } from "@/lib/dates";

export const maxDuration = 60;

/**
 * Раздел 21-22 ТЗ: раз в неделю (воскресенье, в время вечернего итога
 * пользователя) — недельный обзор в Telegram: план/факт, цели без движения,
 * неразобранные идеи.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const rows = await loadTelegramRecipients(supabase, "evening_review_enabled");

  let sent = 0;

  for (const row of rows ?? []) {
    const telegram = (row as unknown as { telegram: { status: string; telegram_chat_id: string } | null }).telegram;
    const profile = (row as unknown as { profile: { timezone: string } | null }).profile;
    if (!telegram || telegram.status !== "connected" || !telegram.telegram_chat_id) continue;

    const timezone = profile?.timezone ?? "UTC";
    if (formatInstant(new Date(), timezone, "i") !== "7") continue; // 7 = воскресенье (ISO)
    if (!isWithinWindow(formatInstant(new Date(), timezone, "HH:mm"), row.evening_review_time.slice(0, 5), 5)) continue;

    const today = todayInTz(timezone);
    const { data: already } = await supabase
      .from("notifications_log")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("notification_type", "weekly_review")
      .gte("created_at", `${addCalendarDays(today, -1)}T00:00:00.000Z`)
      .limit(1);
    if (already?.length) continue;

    const weekStart = addCalendarDays(today, -6);
    const stalledSince = addCalendarDays(today, -14);
    const [{ actions }, { actions: recent }, areas, goals, unreviewedIdeas] = await Promise.all([
      listActionsFiltered(supabase, row.user_id, { from: weekStart, to: today, pageSize: 100000 }),
      listActionsFiltered(supabase, row.user_id, { from: stalledSince, to: today, pageSize: 100000 }),
      listLifeAreas(supabase, row.user_id),
      listGoals(supabase, row.user_id, { status: ["active"] }),
      countUnreviewedIdeas(supabase, row.user_id),
    ]);

    const stats = computePeriodStats(actions, areas, weekStart, today);
    const moved = new Set(recent.filter((a) => a.status === "completed" && a.goalId).map((a) => a.goalId));
    const stalledGoals = goals.filter((g) => !moved.has(g.id) && g.updatedAt.slice(0, 10) < stalledSince).length;

    await dispatchNotification(supabase, {
      userId: row.user_id,
      notificationType: "weekly_review",
      channels: ["telegram"],
      telegramChatId: telegram.telegram_chat_id,
      telegramText: formatWeeklyReview({
        completed: stats.completedCount,
        planned: stats.plannedCount,
        rate: stats.completionRate,
        stalledGoals,
        unreviewedIdeas,
      }),
    });
    sent++;
  }

  return NextResponse.json({ sent });
}

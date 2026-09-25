import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadTelegramRecipients } from "@/lib/cron/recipients";
import { verifyCronRequest } from "@/lib/cron/verify";
import { isWithinWindow } from "@/lib/cron/time-window";
import { listGoals } from "@/lib/database/goals";
import { countUnreviewedIdeas } from "@/lib/database/ideas";
import { formatGoalReminder, formatIdeasReminder } from "@/lib/telegram/messages";
import { dispatchNotification } from "@/lib/notifications/service";
import { addCalendarDays, todayInTz, formatInstant } from "@/lib/dates";

export const maxDuration = 60;

/**
 * Раздел 22 ТЗ: ежедневно в время утреннего плана — напоминание о целях с дедлайном
 * в ближайшие 3 дня (или просроченным); по понедельникам — о неразобранных идеях.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const rows = await loadTelegramRecipients(supabase, "morning_plan_enabled");

  let sent = 0;

  for (const row of rows ?? []) {
    const telegram = (row as unknown as { telegram: { status: string; telegram_chat_id: string } | null }).telegram;
    const profile = (row as unknown as { profile: { timezone: string } | null }).profile;
    if (!telegram || telegram.status !== "connected" || !telegram.telegram_chat_id) continue;

    const timezone = profile?.timezone ?? "UTC";
    if (!isWithinWindow(formatInstant(new Date(), timezone, "HH:mm"), row.morning_plan_time.slice(0, 5), 5)) continue;

    const today = todayInTz(timezone);
    const sentToday = async (type: string) => {
      const { data } = await supabase
        .from("notifications_log")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("notification_type", type)
        .gte("created_at", `${addCalendarDays(today, -1)}T12:00:00.000Z`)
        .limit(1);
      return !!data?.length;
    };

    const goals = (await listGoals(supabase, row.user_id, { status: ["active"] })).filter(
      (g) => g.deadline && g.deadline <= addCalendarDays(today, 3),
    );
    if (goals.length > 0 && !(await sentToday("goal_reminder"))) {
      await dispatchNotification(supabase, {
        userId: row.user_id,
        notificationType: "goal_reminder",
        channels: ["telegram"],
        telegramChatId: telegram.telegram_chat_id,
        telegramText: formatGoalReminder(goals.map((g) => ({ title: g.title, deadline: g.deadline! })), today),
      });
      sent++;
    }

    if (formatInstant(new Date(), timezone, "i") === "1") {
      const ideas = await countUnreviewedIdeas(supabase, row.user_id);
      if (ideas > 0 && !(await sentToday("ideas_reminder"))) {
        await dispatchNotification(supabase, {
          userId: row.user_id,
          notificationType: "ideas_reminder",
          channels: ["telegram"],
          telegramChatId: telegram.telegram_chat_id,
          telegramText: formatIdeasReminder(ideas),
        });
        sent++;
      }
    }
  }

  return NextResponse.json({ sent });
}

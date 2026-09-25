import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadTelegramRecipients } from "@/lib/cron/recipients";
import { verifyCronRequest } from "@/lib/cron/verify";
import { isWithinWindow } from "@/lib/cron/time-window";
import { listActionsForRange } from "@/lib/database/actions";
import { computeFreeSlots } from "@/lib/database/schedule";
import { formatMorningPlan } from "@/lib/telegram/messages";
import { dispatchNotification } from "@/lib/notifications/service";
import { todayInTz, formatInstant } from "@/lib/dates";

export const maxDuration = 60;

/**
 * Раздел 29, 73: утренний план в Telegram. Запускается часто (см.
 * vercel.json, каждые 5 минут) и сам определяет, чьё локальное время
 * сейчас совпадает с их настройками morning_plan_time.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const windowMinutes = 5;

  const settingsRows = await loadTelegramRecipients(supabase, "morning_plan_enabled");

  let sent = 0;

  for (const row of settingsRows ?? []) {
    const telegram = (row as unknown as { telegram: { status: string; telegram_chat_id: string } | null }).telegram;
    const profile = (row as unknown as { profile: { timezone: string } | null }).profile;
    if (!telegram || telegram.status !== "connected" || !telegram.telegram_chat_id) continue;

    const timezone = profile?.timezone ?? "UTC";
    const nowLocal = formatInstant(new Date(), timezone, "HH:mm");
    if (!isWithinWindow(nowLocal, row.morning_plan_time.slice(0, 5), windowMinutes)) continue;

    const today = todayInTz(timezone);

    const { data: alreadySent } = await supabase
      .from("notifications_log")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("notification_type", "morning_plan")
      .gte("created_at", `${today}T00:00:00.000Z`)
      .limit(1);
    if (alreadySent?.length) continue;

    const actions = await listActionsForRange(supabase, row.user_id, today, today);
    const freeMinutes = computeFreeSlots(actions).reduce((sum, s) => sum + s.minutes, 0);

    await dispatchNotification(supabase, {
      userId: row.user_id,
      notificationType: "morning_plan",
      channels: ["telegram"],
      telegramChatId: telegram.telegram_chat_id,
      telegramText: formatMorningPlan(actions, freeMinutes),
    });

    sent++;
  }

  return NextResponse.json({ sent });
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronRequest } from "@/lib/cron/verify";
import { isWithinWindow } from "@/lib/cron/time-window";
import { generateOrUpdateDailyReview } from "@/lib/database/reviews";
import { listActionsForRange } from "@/lib/database/actions";
import { formatEveningReview } from "@/lib/telegram/messages";
import { dispatchNotification } from "@/lib/notifications/service";
import { todayInTz, formatInstant } from "@/lib/dates";

export const maxDuration = 60;

/** Раздел 30, 72: вечерний итог дня в Telegram. */
export async function GET(req: NextRequest) {
  if (!verifyCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const windowMinutes = 5;

  const { data: settingsRows, error } = await supabase
    .from("notification_settings")
    .select("*, telegram:telegram_connections(*), profile:user_profiles(*)")
    .eq("evening_review_enabled", true)
    .eq("telegram_enabled", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;

  for (const row of settingsRows ?? []) {
    const telegram = (row as unknown as { telegram: { status: string; telegram_chat_id: string } | null }).telegram;
    const profile = (row as unknown as { profile: { timezone: string } | null }).profile;
    if (!telegram || telegram.status !== "connected" || !telegram.telegram_chat_id) continue;

    const timezone = profile?.timezone ?? "UTC";
    const nowLocal = formatInstant(new Date(), timezone, "HH:mm");
    if (!isWithinWindow(nowLocal, row.evening_review_time.slice(0, 5), windowMinutes)) continue;

    const today = todayInTz(timezone);

    const { data: alreadySent } = await supabase
      .from("notifications_log")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("notification_type", "evening_review")
      .gte("created_at", `${today}T00:00:00.000Z`)
      .limit(1);
    if (alreadySent?.length) continue;

    const review = await generateOrUpdateDailyReview(supabase, row.user_id, today, timezone);
    const allActions = await listActionsForRange(supabase, row.user_id, today, today);
    const remaining = allActions.filter((a) => a.status === "planned" || a.status === "in_progress");

    await dispatchNotification(supabase, {
      userId: row.user_id,
      notificationType: "evening_review",
      channels: ["telegram"],
      telegramChatId: telegram.telegram_chat_id,
      telegramText: formatEveningReview(review, remaining),
    });

    await supabase.from("daily_reviews").update({ sent_to_telegram_at: new Date().toISOString() }).eq("id", review.id);

    sent++;
  }

  return NextResponse.json({ sent });
}

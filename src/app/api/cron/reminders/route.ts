import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronRequest } from "@/lib/cron/verify";
import { mapAction } from "@/lib/database/mappers";
import { dispatchNotification } from "@/lib/notifications/service";
import { formatReminderMessage } from "@/lib/telegram/messages";

export const maxDuration = 60;

/**
 * Раздел 27, 61, 77: отдельный notification service, вызываемый по
 * расписанию (см. vercel.json) — рассылает напоминания, у которых
 * наступило trigger_at, по всем каналам пользователя.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: dueReminders, error } = await supabase
    .from("reminders")
    .select("*, action:actions(*)")
    .lte("trigger_at", now)
    .eq("is_sent", false)
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;

  for (const reminder of dueReminders ?? []) {
    const actionRow = (reminder as unknown as { action: Record<string, unknown> | null }).action;
    if (!actionRow) {
      await supabase.from("reminders").update({ is_sent: true, sent_at: now }).eq("id", reminder.id);
      continue;
    }

    const action = mapAction(actionRow);
    if (action.status === "cancelled" || action.isArchived) {
      await supabase.from("reminders").update({ is_sent: true, sent_at: now }).eq("id", reminder.id);
      continue;
    }

    const [{ data: settings }, { data: telegram }] = await Promise.all([
      supabase.from("notification_settings").select("*").eq("user_id", reminder.user_id).maybeSingle(),
      supabase.from("telegram_connections").select("*").eq("user_id", reminder.user_id).maybeSingle(),
    ]);

    const channels: ("in_app" | "telegram")[] = [];
    if (settings?.in_app_enabled ?? true) channels.push("in_app");
    if (settings?.telegram_enabled && telegram?.status === "connected" && telegram.telegram_chat_id) channels.push("telegram");

    await dispatchNotification(supabase, {
      userId: reminder.user_id,
      notificationType: "reminder",
      channels,
      telegramChatId: telegram?.telegram_chat_id,
      telegramText: formatReminderMessage(action),
      actionId: action.id,
      reminderId: reminder.id,
      payload: { title: action.title, actionDate: action.actionDate, startTime: action.startTime },
    });

    await supabase.from("reminders").update({ is_sent: true, sent_at: now }).eq("id", reminder.id);
    sent++;
  }

  return NextResponse.json({ processed: dueReminders?.length ?? 0, sent });
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronRequest } from "@/lib/cron/verify";
import { combineDateTimeToInstant, todayInTz } from "@/lib/dates";
import { logActionHistory } from "@/lib/history/log";
import { dispatchNotification } from "@/lib/notifications/service";
import { formatOverdueMessage } from "@/lib/telegram/messages";
import { mapAction } from "@/lib/database/mappers";

export const maxDuration = 60;

/**
 * Раздел 15, 48, 61 ТЗ: периодическая проверка просроченных действий.
 * Действие считается просроченным, если наступило его время окончания
 * (или дедлайн), а статус всё ещё planned/in_progress.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const now = new Date();

  const { data: candidates, error } = await supabase
    .from("actions")
    .select("*, profile:user_profiles(timezone)")
    .in("status", ["planned", "in_progress"])
    .eq("is_archived", false)
    .not("action_date", "is", null)
    .lte("action_date", todayInTz("UTC"))
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const overdueByUser = new Map<string, ReturnType<typeof mapAction>[]>();

  for (const row of candidates ?? []) {
    const profile = (row as unknown as { profile: { timezone: string } | null }).profile;
    const timezone = row.timezone ?? profile?.timezone ?? "UTC";

    const endTime = row.end_time ?? row.start_time;
    let overdueInstant: Date | null = null;

    if (row.deadline_at) {
      overdueInstant = new Date(row.deadline_at);
    } else if (endTime) {
      overdueInstant = combineDateTimeToInstant(row.action_date, endTime, timezone);
    } else {
      overdueInstant = combineDateTimeToInstant(row.action_date, "23:59", timezone);
    }

    if (overdueInstant >= now) continue;

    await supabase.from("actions").update({ status: "overdue" }).eq("id", row.id);
    await logActionHistory(supabase, {
      actionId: row.id,
      userId: row.user_id,
      eventType: "status_changed",
      oldValue: { status: row.status },
      newValue: { status: "overdue" },
    });

    const action = mapAction(row);
    const list = overdueByUser.get(row.user_id) ?? [];
    list.push(action);
    overdueByUser.set(row.user_id, list);
  }

  let notifiedUsers = 0;

  for (const [userId, actions] of overdueByUser) {
    const [{ data: settings }, { data: telegram }] = await Promise.all([
      supabase.from("notification_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("telegram_connections").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    if (!(settings?.overdue_notify ?? true)) continue;

    const channels: ("in_app" | "telegram")[] = ["in_app"];
    if (settings?.telegram_enabled && telegram?.status === "connected" && telegram.telegram_chat_id) channels.push("telegram");

    await dispatchNotification(supabase, {
      userId,
      notificationType: "overdue",
      channels,
      telegramChatId: telegram?.telegram_chat_id,
      telegramText: formatOverdueMessage(actions),
      payload: { count: actions.length },
    });
    notifiedUsers++;
  }

  return NextResponse.json({ marked: [...overdueByUser.values()].flat().length, notifiedUsers });
}

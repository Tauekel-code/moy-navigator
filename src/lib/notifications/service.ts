import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTelegramMessage, type InlineKeyboard } from "@/lib/telegram/bot";
import type { NotificationType, NotificationChannel } from "@/types/notification";

/**
 * Раздел 61 ТЗ: единая точка отправки уведомлений (in-app + Telegram,
 * в будущем — email/push/WhatsApp). Вызывается из cron-обработчиков
 * (напоминания, утренний план, вечерний итог) и из бизнес-логики (конфликт,
 * просрочка). Каждый вызов пишет запись в notifications_log — это и есть
 * лента уведомлений внутри приложения (раздел 48) и источник данных для
 * отладки статусов синхронизации.
 */
export interface DispatchNotificationParams {
  userId: string;
  notificationType: NotificationType;
  channels: NotificationChannel[];
  telegramChatId?: string | null;
  telegramText?: string;
  telegramKeyboard?: InlineKeyboard;
  actionId?: string | null;
  reminderId?: string | null;
  payload?: Record<string, unknown>;
}

export async function dispatchNotification(supabase: SupabaseClient, params: DispatchNotificationParams): Promise<void> {
  for (const channel of params.channels) {
    if (channel === "telegram") {
      if (!params.telegramChatId || !params.telegramText) continue;
      try {
        await sendTelegramMessage(params.telegramChatId, params.telegramText, params.telegramKeyboard);
      } catch (err) {
        await supabase.from("notifications_log").insert({
          user_id: params.userId,
          action_id: params.actionId ?? null,
          reminder_id: params.reminderId ?? null,
          notification_type: "sync_error",
          channel: "telegram",
          payload: { error: String(err), originalType: params.notificationType },
        });
        continue;
      }
    }

    const { error } = await supabase.from("notifications_log").insert({
      user_id: params.userId,
      action_id: params.actionId ?? null,
      reminder_id: params.reminderId ?? null,
      notification_type: params.notificationType,
      channel,
      payload: params.payload ?? null,
    });
    if (error) throw error;
  }
}

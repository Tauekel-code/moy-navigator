import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmTelegramConnection, findUserByTelegramChatId } from "@/lib/database/telegram";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { formatConnectSuccessMessage, formatMorningPlan } from "@/lib/telegram/messages";
import { listActionsForRange } from "@/lib/database/actions";
import { computeFreeSlots } from "@/lib/database/schedule";
import { getUserProfile } from "@/lib/database/settings";
import { todayInTz, addCalendarDays } from "@/lib/dates";
import type { TelegramUpdate } from "@/lib/telegram/bot";

/**
 * Раздел 27, 62 ТЗ: Telegram webhook. Публичный маршрут (исключён из
 * middleware-защиты), подлинность запроса проверяется секретным
 * заголовком, который Telegram присылает после setWebhook(secret_token=...).
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!secret || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = (await req.json()) as TelegramUpdate;
  const message = update.message;
  if (!message?.text) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const text = message.text.trim();
  const supabase = createAdminClient();

  if (text.startsWith("/start")) {
    const code = text.replace("/start", "").trim();
    if (!code) {
      await sendTelegramMessage(chatId, "Откройте настройки в приложении «Моё личное расписание» и нажмите «Подключить Telegram».");
      return NextResponse.json({ ok: true });
    }

    const result = await confirmTelegramConnection(supabase, code, chatId, message.from?.username ?? null);
    await sendTelegramMessage(
      chatId,
      result ? formatConnectSuccessMessage() : "Код недействителен или устарел. Получите новый код в настройках приложения.",
    );
    return NextResponse.json({ ok: true });
  }

  const userId = await findUserByTelegramChatId(supabase, chatId);
  if (!userId) {
    await sendTelegramMessage(chatId, "Этот чат ещё не подключён к аккаунту. Используйте ссылку из настроек приложения.");
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/today")) {
    const profile = await getUserProfile(supabase, userId);
    const timezone = profile?.timezone ?? "UTC";
    const date = todayInTz(timezone);

    const actions = await listActionsForRange(supabase, userId, date, date);
    const freeMinutes = computeFreeSlots(actions).reduce((sum, s) => sum + s.minutes, 0);

    await sendTelegramMessage(chatId, formatMorningPlan(actions, freeMinutes));
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/tomorrow")) {
    const profile = await getUserProfile(supabase, userId);
    const timezone = profile?.timezone ?? "UTC";
    const date = addCalendarDays(todayInTz(timezone), 1);

    const actions = await listActionsForRange(supabase, userId, date, date);
    const freeMinutes = computeFreeSlots(actions).reduce((sum, s) => sum + s.minutes, 0);

    await sendTelegramMessage(chatId, formatMorningPlan(actions, freeMinutes));
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(chatId, "Команда пока не поддерживается. Доступно: /today, /tomorrow.");
  return NextResponse.json({ ok: true });
}

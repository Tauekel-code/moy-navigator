import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { createTelegramConnectCode } from "@/lib/database/telegram";

/** Раздел 27: шаг 2-3 — пользователь нажимает «Подключить Telegram» и получает ссылку. */
export async function POST() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    const code = await createTelegramConnectCode(supabase, user.id);
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

    const link = botUsername ? `https://t.me/${botUsername}?start=${code}` : null;

    return NextResponse.json({ code, link });
  } catch (err) {
    return handleApiError(err);
  }
}

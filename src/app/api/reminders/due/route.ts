import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { checkDueReminders } from "@/lib/database/reminders";

/**
 * Раздел 48 ТЗ: уведомления внутри приложения. Клиент опрашивает этот
 * маршрут, пока вкладка открыта — дополняет cron (который в локальном
 * режиме отсутствует, а на бесплатном Vercel ограничен раз в сутки).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    const due = await checkDueReminders(supabase, user.id);
    return NextResponse.json({ due });
  } catch (err) {
    return handleApiError(err);
  }
}

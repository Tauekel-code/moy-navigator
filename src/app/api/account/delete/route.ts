import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { isLocalMode } from "@/lib/config";
import { wipeLocalData } from "@/lib/local/db";

/**
 * Раздел 68: удаление аккаунта. Подтверждение и экспорт данных
 * запрашиваются на клиенте ПЕРЕД вызовом этого маршрута.
 * В облачном режиме — удаление пользователя Supabase (данные каскадно
 * удаляются через FK "on delete cascade" из миграции 0001_init.sql).
 * В локальном режиме аккаунта как такового нет — "удаление" означает
 * полную очистку локальной базы данных на этом компьютере.
 */
export async function POST() {
  try {
    if (isLocalMode()) {
      wipeLocalData();
      return NextResponse.json({ ok: true });
    }

    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

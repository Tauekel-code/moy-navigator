import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";

/**
 * Раздел 68: удаление аккаунта. Подтверждение и экспорт данных
 * запрашиваются на клиенте ПЕРЕД вызовом этого маршрута.
 * Все данные пользователя удаляются каскадно через FK "on delete cascade"
 * из миграции 0001_init.sql — здесь остаётся только удалить сам auth.users.
 */
export async function POST() {
  try {
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

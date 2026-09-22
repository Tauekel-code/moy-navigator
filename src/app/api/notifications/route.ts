import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listNotifications, markAllNotificationsRead, countUnreadNotifications } from "@/lib/database/notifications";

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    const [notifications, unreadCount] = await Promise.all([
      listNotifications(supabase, user.id),
      countUnreadNotifications(supabase, user.id),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    await markAllNotificationsRead(supabase, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

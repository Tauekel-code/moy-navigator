import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { disconnectTelegram } from "@/lib/database/telegram";

export async function POST() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    await disconnectTelegram(supabase, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

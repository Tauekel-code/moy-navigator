import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { getTelegramConnection } from "@/lib/database/telegram";

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    const connection = await getTelegramConnection(supabase, user.id);
    return NextResponse.json({ connection });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { completeOnboarding } from "@/lib/database/settings";

/** Раздел 34: завершение мастера первого запуска. */
export async function POST() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    const profile = await completeOnboarding(supabase, user.id);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}

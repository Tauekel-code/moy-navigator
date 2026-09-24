import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listActionsForRange } from "@/lib/database/actions";
import { listGoals } from "@/lib/database/goals";
import { listIdeas } from "@/lib/database/ideas";
import { getUserProfile } from "@/lib/database/settings";
import { computeHints } from "@/lib/hints/compute";
import { addCalendarDays, todayInTz } from "@/lib/dates";

/** Раздел 32 ТЗ: умные подсказки. Только предложения — применяет пользователь. */
export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const profile = await getUserProfile(supabase, user.id);
    const today = todayInTz(profile?.timezone ?? "UTC");
    const tomorrow = addCalendarDays(today, 1);

    const [todayActions, tomorrowActions, goals, ideas] = await Promise.all([
      listActionsForRange(supabase, user.id, today, today),
      listActionsForRange(supabase, user.id, tomorrow, tomorrow),
      listGoals(supabase, user.id, { status: ["active"] }),
      listIdeas(supabase, user.id, ["new", "reviewing"]),
    ]);

    return NextResponse.json({ hints: computeHints({ todayActions, tomorrowActions, tomorrow, goals, ideas }) });
  } catch (err) {
    return handleApiError(err);
  }
}

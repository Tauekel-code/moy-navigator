import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { getDailyPlan, saveDailyPlan } from "@/lib/database/daily-plan";
import { listActionsForRange } from "@/lib/database/actions";
import { getUserProfile } from "@/lib/database/settings";
import { suggestDailyPlan } from "@/lib/planner/day-planner";
import { dailyPlanSaveSchema } from "@/lib/validation/schemas";

/** Раздел 11-12: если план ещё не принят — вернуть предложение AI-алгоритма, иначе сохранённый план. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { date } = await params;

    const existingPlan = await getDailyPlan(supabase, user.id, date);
    if (existingPlan) {
      return NextResponse.json({ plan: existingPlan, suggestion: null });
    }

    const [actions, profile] = await Promise.all([
      listActionsForRange(supabase, user.id, date, date),
      getUserProfile(supabase, user.id),
    ]);

    const suggestion = suggestDailyPlan(actions, profile?.workStartTime ?? "09:00", profile?.workEndTime ?? "19:00", date);
    return NextResponse.json({ plan: null, suggestion });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { date } = await params;
    const { items, status } = dailyPlanSaveSchema.parse(await req.json());

    const plan = await saveDailyPlan(supabase, user.id, date, items, status);
    return NextResponse.json({ plan });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError, jsonError } from "@/lib/api/respond";
import { listActionsFiltered } from "@/lib/database/actions";
import { listLifeAreas } from "@/lib/database/life-areas";
import { computePeriodStats } from "@/lib/stats/compute";

/** Раздел 15-20 ТЗ: план/факт и баланс сфер за произвольный период. */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to) return jsonError("Нужны параметры from и to", 400);

    const [{ actions }, lifeAreas] = await Promise.all([
      listActionsFiltered(supabase, user.id, { from, to, includeArchived: false, pageSize: 100000 }),
      listLifeAreas(supabase, user.id),
    ]);

    const stats = computePeriodStats(actions, lifeAreas, from, to);
    return NextResponse.json({ stats });
  } catch (err) {
    return handleApiError(err);
  }
}

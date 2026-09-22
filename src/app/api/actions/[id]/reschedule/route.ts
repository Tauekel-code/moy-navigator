import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { rescheduleAction, findTimeConflicts } from "@/lib/database/schedule";
import { getUserProfile } from "@/lib/database/settings";
import { getActionById } from "@/lib/database/actions";
import { rescheduleSchema } from "@/lib/validation/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const input = rescheduleSchema.parse(await req.json());

    const profile = await getUserProfile(supabase, user.id);
    const timezone = profile?.timezone ?? "UTC";

    const { targetActionId } = await rescheduleAction(
      supabase,
      user.id,
      id,
      input.newDate,
      input.newTime,
      timezone,
      input.scope,
      input.occurrenceDate,
    );

    const action = await getActionById(supabase, targetActionId);

    let conflicts: Awaited<ReturnType<typeof findTimeConflicts>> = [];
    if (action?.startTime && action?.endTime && action.actionDate) {
      conflicts = await findTimeConflicts(supabase, user.id, action.actionDate, action.startTime, action.endTime, action.id);
    }

    return NextResponse.json({ action, conflicts });
  } catch (err) {
    return handleApiError(err);
  }
}

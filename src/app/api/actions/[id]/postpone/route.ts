import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError, jsonError } from "@/lib/api/respond";
import { rescheduleAction, resolvePostponeShortcut } from "@/lib/database/schedule";
import { getActionById } from "@/lib/database/actions";
import { getUserProfile } from "@/lib/database/settings";
import { postponeSchema } from "@/lib/validation/schemas";

/** Раздел 42: быстрое откладывание. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const input = postponeSchema.parse(await req.json());

    const current = await getActionById(supabase, id.split("::")[0]);
    if (!current) return jsonError("Действие не найдено", 404);

    const currentDate = id.includes("::") ? id.split("::")[1] : current.actionDate;
    if (!currentDate) return jsonError("У действия без даты нельзя использовать быстрое откладывание", 400);

    const target = input.shortcut
      ? resolvePostponeShortcut(input.shortcut, currentDate, current.startTime)
      : { date: input.date!, time: input.time ?? current.startTime };

    const profile = await getUserProfile(supabase, user.id);
    const timezone = profile?.timezone ?? "UTC";

    const { targetActionId } = await rescheduleAction(
      supabase,
      user.id,
      id,
      target.date,
      target.time,
      timezone,
      input.scope,
      input.occurrenceDate ?? currentDate,
    );

    const action = await getActionById(supabase, targetActionId);
    return NextResponse.json({ action });
  } catch (err) {
    return handleApiError(err);
  }
}

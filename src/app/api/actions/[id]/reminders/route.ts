import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { addReminder, listRemindersForAction } from "@/lib/database/reminders";
import { getActionById } from "@/lib/database/actions";
import { getUserProfile } from "@/lib/database/settings";
import { reminderInputSchema } from "@/lib/validation/schemas";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    const reminders = await listRemindersForAction(supabase, id.split("::")[0]);
    return NextResponse.json({ reminders });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const masterId = id.split("::")[0];
    const input = reminderInputSchema.parse(await req.json());

    const action = await getActionById(supabase, masterId);
    const profile = await getUserProfile(supabase, user.id);
    const timezone = profile?.timezone ?? "UTC";

    const reminder = await addReminder(supabase, user.id, masterId, input, action?.actionDate ?? null, action?.startTime ?? null, timezone);
    return NextResponse.json({ reminder }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { removeReminder } from "@/lib/database/reminders";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; reminderId: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { reminderId } = await params;

    await removeReminder(supabase, reminderId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}

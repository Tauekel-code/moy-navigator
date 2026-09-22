import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listActionsFiltered } from "@/lib/database/actions";
import { actionsToIcs } from "@/lib/export/ics";

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    const { actions } = await listActionsFiltered(supabase, user.id, { pageSize: 100000 });
    const ics = actionsToIcs(actions);

    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="moe-raspisanie-${new Date().toISOString().slice(0, 10)}.ics"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

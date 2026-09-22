import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listActionsFiltered } from "@/lib/database/actions";
import { actionsToCsv } from "@/lib/export/csv";

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    const { actions } = await listActionsFiltered(supabase, user.id, { pageSize: 100000, includeArchived: true });
    const csv = actionsToCsv(actions);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="moe-raspisanie-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

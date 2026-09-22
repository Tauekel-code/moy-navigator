import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listArchivedActions } from "@/lib/database/archive";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { searchParams } = new URL(req.url);

    const { actions, total } = await listArchivedActions(supabase, user.id, {
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
    });

    return NextResponse.json({ actions, total });
  } catch (err) {
    return handleApiError(err);
  }
}

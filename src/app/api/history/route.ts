import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listHistoryForUser } from "@/lib/database/history";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { searchParams } = new URL(req.url);

    const { entries, total } = await listHistoryForUser(supabase, user.id, {
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    return NextResponse.json({ entries, total });
  } catch (err) {
    return handleApiError(err);
  }
}

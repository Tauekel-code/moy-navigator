import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listRecentReviews } from "@/lib/database/reviews";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const limit = new URL(req.url).searchParams.get("limit");

    const reviews = await listRecentReviews(supabase, user.id, limit ? Number(limit) : undefined);
    return NextResponse.json({ reviews });
  } catch (err) {
    return handleApiError(err);
  }
}

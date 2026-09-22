import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { generateOrUpdateDailyReview } from "@/lib/database/reviews";
import { getUserProfile } from "@/lib/database/settings";

export async function GET(_req: Request, { params }: { params: Promise<{ date: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { date } = await params;

    const profile = await getUserProfile(supabase, user.id);
    const review = await generateOrUpdateDailyReview(supabase, user.id, date, profile?.timezone ?? "UTC");

    return NextResponse.json({ review });
  } catch (err) {
    return handleApiError(err);
  }
}

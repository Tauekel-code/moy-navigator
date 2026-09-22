import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { updateDailyReviewNotes } from "@/lib/database/reviews";
import { dailyReviewNotesSchema } from "@/lib/validation/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { date } = await params;
    const input = dailyReviewNotesSchema.parse(await req.json());

    const review = await updateDailyReviewNotes(supabase, user.id, date, {
      mainResult: input.mainResult ?? null,
      whatFailed: input.whatFailed ?? null,
      importantTomorrow: input.importantTomorrow ?? null,
      personalNote: input.personalNote ?? null,
    });

    return NextResponse.json({ review });
  } catch (err) {
    return handleApiError(err);
  }
}

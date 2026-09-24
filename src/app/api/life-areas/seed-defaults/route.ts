import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { seedDefaultLifeAreas } from "@/lib/database/life-areas";

/** Раздел 34, шаг 1: создание базовых сфер при первом запуске. */
export async function POST() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    const lifeAreas = await seedDefaultLifeAreas(supabase, user.id);
    return NextResponse.json({ lifeAreas });
  } catch (err) {
    return handleApiError(err);
  }
}

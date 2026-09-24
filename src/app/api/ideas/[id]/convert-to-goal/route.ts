import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { convertIdeaToGoal } from "@/lib/database/ideas";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    const result = await convertIdeaToGoal(supabase, id, user.id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

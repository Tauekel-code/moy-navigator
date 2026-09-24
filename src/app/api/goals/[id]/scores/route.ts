import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { addGoalScore, listGoalScores } from "@/lib/database/goals";
import { goalScoreInputSchema } from "@/lib/validation/schemas";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    const scores = await listGoalScores(supabase, id);
    return NextResponse.json({ scores });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const input = goalScoreInputSchema.parse(await req.json());

    const score = await addGoalScore(supabase, user.id, id, input);
    return NextResponse.json({ score }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

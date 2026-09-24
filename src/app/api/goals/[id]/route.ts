import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError, jsonError } from "@/lib/api/respond";
import { getGoalById, updateGoal } from "@/lib/database/goals";
import { goalUpdateSchema } from "@/lib/validation/schemas";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    const goal = await getGoalById(supabase, id);
    if (!goal) return jsonError("Цель не найдена", 404);
    return NextResponse.json({ goal });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const input = goalUpdateSchema.parse(await req.json());

    const goal = await updateGoal(supabase, id, user.id, input);
    return NextResponse.json({ goal });
  } catch (err) {
    return handleApiError(err);
  }
}

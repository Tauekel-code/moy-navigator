import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listGoals, createGoal } from "@/lib/database/goals";
import { goalInputSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const goals = await listGoals(supabase, user.id, {
      lifeAreaId: searchParams.get("lifeAreaId") ?? undefined,
      status: status ? status.split(",") : undefined,
      includeArchived: searchParams.get("includeArchived") === "1",
    });
    return NextResponse.json({ goals });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const input = goalInputSchema.parse(await req.json());

    const goal = await createGoal(supabase, user.id, {
      lifeAreaId: input.lifeAreaId ?? null,
      title: input.title,
      description: input.description ?? null,
      goalType: input.goalType,
      metricType: input.metricType,
      metricUnit: input.metricUnit ?? null,
      currentValue: input.currentValue ?? null,
      targetValue: input.targetValue ?? null,
      startDate: input.startDate,
      deadline: input.deadline ?? null,
      priority: input.priority,
      status: input.status,
      criteria: input.criteria ?? null,
      notes: input.notes ?? null,
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

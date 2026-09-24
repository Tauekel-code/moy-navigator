import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listSubgoals, createSubgoal } from "@/lib/database/goals";
import { subgoalInputSchema } from "@/lib/validation/schemas";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    const subgoals = await listSubgoals(supabase, id);
    return NextResponse.json({ subgoals });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const input = subgoalInputSchema.parse(await req.json());

    const subgoal = await createSubgoal(supabase, user.id, id, {
      title: input.title,
      deadline: input.deadline ?? null,
      status: input.status,
      metricValue: input.metricValue ?? null,
      metricTarget: input.metricTarget ?? null,
      metricUnit: input.metricUnit ?? null,
    });

    return NextResponse.json({ subgoal }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listIdeas, createIdea } from "@/lib/database/ideas";
import { ideaInputSchema, ideaStatusSchema } from "@/lib/validation/schemas";
import type { IdeaStatus } from "@/types/idea";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    let status: IdeaStatus[] | undefined;
    if (statusParam) {
      status = z.array(ideaStatusSchema).parse(statusParam.split(","));
    }

    const ideas = await listIdeas(supabase, user.id, status, searchParams.get("includeArchived") === "1");
    return NextResponse.json({ ideas });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Раздел 6-7: быстрая запись идеи (текст или расшифровка голоса). */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const input = ideaInputSchema.parse(await req.json());

    const idea = await createIdea(supabase, user.id, {
      text: input.text,
      source: input.source,
      lifeAreaId: input.lifeAreaId ?? null,
      goalId: input.goalId ?? null,
      projectId: input.projectId ?? null,
      notes: input.notes ?? null,
    });

    return NextResponse.json({ idea }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

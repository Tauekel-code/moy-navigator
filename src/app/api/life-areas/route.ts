import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listLifeAreas, createLifeArea } from "@/lib/database/life-areas";
import { lifeAreaInputSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const includeArchived = new URL(req.url).searchParams.get("includeArchived") === "1";

    const lifeAreas = await listLifeAreas(supabase, user.id, includeArchived);
    return NextResponse.json({ lifeAreas });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const input = lifeAreaInputSchema.parse(await req.json());

    const lifeArea = await createLifeArea(supabase, user.id, {
      name: input.name,
      description: input.description ?? null,
      color: input.color,
      icon: input.icon ?? null,
    });

    return NextResponse.json({ lifeArea }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

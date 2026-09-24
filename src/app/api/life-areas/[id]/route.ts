import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError, jsonError } from "@/lib/api/respond";
import { getLifeAreaById, updateLifeArea, archiveLifeArea } from "@/lib/database/life-areas";
import { lifeAreaInputSchema } from "@/lib/validation/schemas";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    const lifeArea = await getLifeAreaById(supabase, id);
    if (!lifeArea) return jsonError("Сфера не найдена", 404);
    return NextResponse.json({ lifeArea });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchSchema = lifeAreaInputSchema.partial().extend({ sortOrder: z.number().int().optional() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const input = patchSchema.parse(await req.json());

    const lifeArea = await updateLifeArea(supabase, id, input);
    return NextResponse.json({ lifeArea });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    await archiveLifeArea(supabase, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError, jsonError } from "@/lib/api/respond";
import { getIdeaById, updateIdea, deleteIdea } from "@/lib/database/ideas";
import { ideaUpdateSchema } from "@/lib/validation/schemas";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    const idea = await getIdeaById(supabase, id);
    if (!idea) return jsonError("Идея не найдена", 404);
    return NextResponse.json({ idea });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const input = ideaUpdateSchema.parse(await req.json());

    const idea = await updateIdea(supabase, id, user.id, input);
    return NextResponse.json({ idea });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Раздел 6: удаление идеи через отдельную процедуру (не архив). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    await deleteIdea(supabase, id, user.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}

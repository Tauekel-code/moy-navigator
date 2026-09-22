import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError, jsonError } from "@/lib/api/respond";
import { getProjectById, updateProject, deleteProject } from "@/lib/database/projects";
import { projectInputSchema } from "@/lib/validation/schemas";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    const project = await getProjectById(supabase, id);
    if (!project) return jsonError("Проект не найден", 404);
    return NextResponse.json({ project });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const input = projectInputSchema.partial().parse(await req.json());

    const project = await updateProject(supabase, id, input);
    return NextResponse.json({ project });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    await deleteProject(supabase, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}

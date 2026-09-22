import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listProjects, createProject } from "@/lib/database/projects";
import { projectInputSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const includeArchived = new URL(req.url).searchParams.get("includeArchived") === "1";

    const projects = await listProjects(supabase, user.id, includeArchived);
    return NextResponse.json({ projects });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const input = projectInputSchema.parse(await req.json());

    const project = await createProject(supabase, user.id, {
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      color: input.color,
      icon: input.icon ?? null,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { convertIdeaToTask } from "@/lib/database/ideas";
import { ideaConvertToTaskSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const input = ideaConvertToTaskSchema.parse(body);

    const result = await convertIdeaToTask(supabase, id, user.id, input);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

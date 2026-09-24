import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listIdeaHistory } from "@/lib/database/ideas";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    const entries = await listIdeaHistory(supabase, id);
    return NextResponse.json({ entries });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { getContactInteractionHistory } from "@/lib/database/contacts";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    const actions = await getContactInteractionHistory(supabase, id);
    return NextResponse.json({ actions });
  } catch (err) {
    return handleApiError(err);
  }
}

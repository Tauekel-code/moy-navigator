import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { globalSearch } from "@/lib/database/search";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const q = new URL(req.url).searchParams.get("q") ?? "";

    if (q.trim().length < 2) return NextResponse.json({ actions: [], projects: [], contacts: [] });

    const result = await globalSearch(supabase, user.id, q.trim());
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

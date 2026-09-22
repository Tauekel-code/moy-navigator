import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { upsertActionContext } from "@/lib/database/actions";
import { contextInputSchema } from "@/lib/validation/schemas";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const input = contextInputSchema.parse(await req.json());

    await upsertActionContext(supabase, id.split("::")[0], input);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

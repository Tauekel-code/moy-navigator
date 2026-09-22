import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { setActionStatus } from "@/lib/database/actions";
import { actionStatusSchema } from "@/lib/validation/schemas";

const bodySchema = z.object({ status: actionStatusSchema });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const masterId = id.split("::")[0];
    const { status } = bodySchema.parse(await req.json());

    const action = await setActionStatus(supabase, masterId, user.id, status);
    return NextResponse.json({ action });
  } catch (err) {
    return handleApiError(err);
  }
}

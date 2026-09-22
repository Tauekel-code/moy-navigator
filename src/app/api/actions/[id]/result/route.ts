import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { setActionResult } from "@/lib/database/actions";
import { logActionHistory } from "@/lib/history/log";
import { resultInputSchema } from "@/lib/validation/schemas";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const masterId = id.split("::")[0];
    const { resultText } = resultInputSchema.parse(await req.json());

    await setActionResult(supabase, masterId, resultText);
    await logActionHistory(supabase, { actionId: masterId, userId: user.id, eventType: "updated", newValue: { result: resultText } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { exportUserDataAsJson } from "@/lib/export/json";

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    const data = await exportUserDataAsJson(supabase, user.id);

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="moe-raspisanie-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

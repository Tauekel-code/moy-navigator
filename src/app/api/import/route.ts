import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { importActions, parseCsvRows, parseIcsRows, type ImportRow } from "@/lib/export/import";

const bodySchema = z.object({
  format: z.enum(["json", "csv", "ics"]),
  content: z.string(),
});

/** Раздел 40: импорт JSON/CSV/ICS с проверкой дублей. */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { format, content } = bodySchema.parse(await req.json());

    let rows: ImportRow[] = [];

    if (format === "csv") {
      rows = parseCsvRows(content);
    } else if (format === "ics") {
      rows = parseIcsRows(content);
    } else {
      const parsed = JSON.parse(content);
      const actions = parsed?.data?.actions ?? [];
      rows = actions.map((a: Record<string, unknown>) => ({
        title: a.title as string,
        actionDate: (a.action_date as string) ?? null,
        startTime: (a.start_time as string) ?? null,
        endTime: (a.end_time as string) ?? null,
        type: (a.type as ImportRow["type"]) ?? "task",
        priority: (a.priority as ImportRow["priority"]) ?? "normal",
      }));
    }

    const result = await importActions(supabase, user.id, rows);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

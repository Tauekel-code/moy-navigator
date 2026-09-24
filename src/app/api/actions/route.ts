import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { createAction, listActionsForRange, listActionsFiltered } from "@/lib/database/actions";
import { createRecurringAction } from "@/lib/database/recurrence";
import { addReminder } from "@/lib/database/reminders";
import { upsertActionContext } from "@/lib/database/actions";
import { getUserProfile } from "@/lib/database/settings";
import { actionInputSchema, quickAddSchema, recurrenceInputSchema, reminderInputSchema, contextInputSchema } from "@/lib/validation/schemas";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (searchParams.get("range") === "1" && from && to) {
      const actions = await listActionsForRange(supabase, user.id, from, to, {
        includeArchived: searchParams.get("includeArchived") === "1",
      });
      return NextResponse.json({ actions });
    }

    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const priority = searchParams.get("priority");

    const { actions, total } = await listActionsFiltered(supabase, user.id, {
      status: status ? (status.split(",") as never) : undefined,
      type: type ? (type.split(",") as never) : undefined,
      priority: priority ? (priority.split(",") as never) : undefined,
      projectId: searchParams.get("projectId") ?? undefined,
      contactId: searchParams.get("contactId") ?? undefined,
      goalId: searchParams.get("goalId") ?? undefined,
      lifeAreaId: searchParams.get("lifeAreaId") ?? undefined,
      from: from ?? undefined,
      to: to ?? undefined,
      includeArchived: searchParams.get("includeArchived") === "1",
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
    });

    return NextResponse.json({ actions, total });
  } catch (err) {
    return handleApiError(err);
  }
}

const fullCreateSchema = z.object({
  action: actionInputSchema,
  recurrence: recurrenceInputSchema.optional(),
  reminders: z.array(reminderInputSchema).optional(),
  context: contextInputSchema.optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const body = await req.json();

    // Раздел 17: быстрое создание — только название (+ опционально дата/время)
    if ("title" in body && !("action" in body)) {
      const input = quickAddSchema.parse(body);
      const profile = await getUserProfile(supabase, user.id);
      const timezone = profile?.timezone ?? "UTC";

      const action = await createAction(supabase, user.id, {
        title: input.title,
        type: "task",
        actionDate: input.date ?? null,
        startTime: input.time ?? null,
        endTime: null,
        durationMinutes: null,
        allDay: false,
        timezone,
        priority: "normal",
        status: "planned",
        deadlineAt: null,
        projectId: null,
        contactId: null,
      });

      return NextResponse.json({ action }, { status: 201 });
    }

    const { action: actionInput, recurrence, reminders, context } = fullCreateSchema.parse(body);
    const profile = await getUserProfile(supabase, user.id);
    const timezone = actionInput.timezone ?? profile?.timezone ?? "UTC";

    const action = recurrence
      ? await createRecurringAction(supabase, user.id, { ...actionInput, timezone }, recurrence)
      : await createAction(supabase, user.id, { ...actionInput, timezone });

    if (context) {
      await upsertActionContext(supabase, action.id, context);
    }

    if (reminders?.length) {
      for (const r of reminders) {
        await addReminder(supabase, user.id, action.id, r, actionInput.actionDate, actionInput.startTime, timezone);
      }
    }

    return NextResponse.json({ action }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError, jsonError } from "@/lib/api/respond";
import { getActionById, updateActionFields, archiveAction, permanentlyDeleteAction } from "@/lib/database/actions";
import { editRecurringOccurrence } from "@/lib/database/recurrence";
import { actionUpdateSchema } from "@/lib/validation/schemas";

function parseVirtualId(id: string) {
  const idx = id.indexOf("::");
  if (idx === -1) return { masterId: id, occurrenceDate: null as string | null };
  return { masterId: id.slice(0, idx), occurrenceDate: id.slice(idx + 2) };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const { masterId } = parseVirtualId(id);

    const action = await getActionById(supabase, masterId);
    if (!action) return jsonError("Действие не найдено", 404);

    return NextResponse.json({ action });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const { masterId, occurrenceDate } = parseVirtualId(id);

    const body = await req.json();
    const patch = actionUpdateSchema.parse(body);
    const scope = (body.scope as "this" | "this_and_future" | "all") ?? "all";

    const { data: master } = await supabase.from("actions").select("recurrence_rule_id").eq("id", masterId).single();

    if (master?.recurrence_rule_id && occurrenceDate) {
      const result = await editRecurringOccurrence(supabase, user.id, masterId, occurrenceDate, scope, {
        title: patch.title,
        startTime: patch.startTime ?? undefined,
        endTime: patch.endTime ?? undefined,
        priority: patch.priority,
        status: patch.status,
      });
      const action = await getActionById(supabase, result.targetActionId);
      return NextResponse.json({ action });
    }

    const action = await updateActionFields(supabase, masterId, user.id, {
      title: patch.title,
      type: patch.type,
      actionDate: patch.actionDate,
      startTime: patch.startTime,
      endTime: patch.endTime,
      allDay: patch.allDay,
      priority: patch.priority,
      deadlineAt: patch.deadlineAt,
      projectId: patch.projectId,
      contactId: patch.contactId,
    });

    return NextResponse.json({ action });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const { masterId } = parseVirtualId(id);
    const { searchParams } = new URL(req.url);

    if (searchParams.get("permanent") === "1") {
      await permanentlyDeleteAction(supabase, masterId);
      return new NextResponse(null, { status: 204 });
    }

    await archiveAction(supabase, masterId, user.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}

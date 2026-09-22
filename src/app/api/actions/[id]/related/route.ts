import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listRelatedActions, linkRelatedAction, unlinkRelatedAction } from "@/lib/database/related";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    const actions = await listRelatedActions(supabase, id.split("::")[0]);
    return NextResponse.json({ actions });
  } catch (err) {
    return handleApiError(err);
  }
}

const linkSchema = z.object({ relatedActionId: z.string().uuid(), order: z.number().int().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const { relatedActionId, order } = linkSchema.parse(await req.json());

    await linkRelatedAction(supabase, id.split("::")[0], relatedActionId, order);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const relatedActionId = searchParams.get("relatedActionId");
    if (!relatedActionId) return NextResponse.json({ error: "relatedActionId обязателен" }, { status: 400 });

    await unlinkRelatedAction(supabase, id.split("::")[0], relatedActionId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}

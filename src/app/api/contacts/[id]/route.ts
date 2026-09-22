import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError, jsonError } from "@/lib/api/respond";
import { getContactById, updateContact, archiveContact, deleteContact } from "@/lib/database/contacts";
import { contactInputSchema } from "@/lib/validation/schemas";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;

    const contact = await getContactById(supabase, id);
    if (!contact) return jsonError("Контакт не найден", 404);
    return NextResponse.json({ contact });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const input = contactInputSchema.partial().parse(await req.json());

    const contact = await updateContact(supabase, id, {
      ...input,
      phone: input.phone || null,
      email: input.email || null,
      company: input.company || null,
      note: input.note || null,
    });

    return NextResponse.json({ contact });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const permanent = new URL(req.url).searchParams.get("permanent") === "1";

    if (permanent) {
      await deleteContact(supabase, id);
    } else {
      await archiveContact(supabase, id);
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}

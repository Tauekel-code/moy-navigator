import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listContacts, createContact } from "@/lib/database/contacts";
import { contactInputSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const includeArchived = new URL(req.url).searchParams.get("includeArchived") === "1";

    const contacts = await listContacts(supabase, user.id, includeArchived);
    return NextResponse.json({ contacts });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const input = contactInputSchema.parse(await req.json());

    const contact = await createContact(supabase, user.id, {
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      company: input.company || null,
      note: input.note || null,
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

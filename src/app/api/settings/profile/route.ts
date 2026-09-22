import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { getUserProfile, updateUserProfile } from "@/lib/database/settings";
import { userProfileSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    const profile = await getUserProfile(supabase, user.id);
    return NextResponse.json({ profile, email: user.email });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const input = userProfileSchema.parse(await req.json());

    const profile = await updateUserProfile(supabase, user.id, input);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}

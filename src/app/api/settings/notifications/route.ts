import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { getNotificationSettings, updateNotificationSettings } from "@/lib/database/settings";
import { notificationSettingsSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);

    const settings = await getNotificationSettings(supabase, user.id);
    return NextResponse.json({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const input = notificationSettingsSchema.parse(await req.json());

    const settings = await updateNotificationSettings(supabase, user.id, input);
    return NextResponse.json({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

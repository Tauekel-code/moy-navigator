import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/database/settings";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { ScheduleView } from "@/components/schedule/ScheduleView";

export default async function SchedulePage() {
  const supabase = await createClient();
  const user = await getCurrentUserOrThrow(supabase);
  const profile = await getUserProfile(supabase, user.id);

  return <ScheduleView timezone={profile?.timezone ?? "UTC"} />;
}

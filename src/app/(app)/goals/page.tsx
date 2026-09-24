import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/database/settings";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { GoalsView } from "@/components/goals/GoalsView";

export default async function GoalsPage() {
  const supabase = await createClient();
  const user = await getCurrentUserOrThrow(supabase);
  const profile = await getUserProfile(supabase, user.id);

  return <GoalsView timezone={profile?.timezone ?? "UTC"} />;
}

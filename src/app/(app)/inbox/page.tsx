import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/database/settings";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { InboxView } from "@/components/ideas/InboxView";

export default async function InboxPage() {
  const supabase = await createClient();
  const user = await getCurrentUserOrThrow(supabase);
  const profile = await getUserProfile(supabase, user.id);

  return <InboxView timezone={profile?.timezone ?? "UTC"} />;
}

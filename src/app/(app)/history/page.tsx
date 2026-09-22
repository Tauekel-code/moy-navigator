import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/database/settings";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { HistoryView } from "@/components/history/HistoryView";

export default async function HistoryPage() {
  const supabase = await createClient();
  const user = await getCurrentUserOrThrow(supabase);
  const profile = await getUserProfile(supabase, user.id);

  return <HistoryView timezone={profile?.timezone ?? "UTC"} />;
}

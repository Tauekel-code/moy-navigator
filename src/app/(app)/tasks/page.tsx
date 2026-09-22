import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/database/settings";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { TasksView } from "@/components/tasks/TasksView";

export default async function TasksPage() {
  const supabase = await createClient();
  const user = await getCurrentUserOrThrow(supabase);
  const profile = await getUserProfile(supabase, user.id);

  return <TasksView timezone={profile?.timezone ?? "UTC"} />;
}

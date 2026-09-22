import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/database/settings";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { todayInTz } from "@/lib/dates";
import { TodayView } from "@/components/today/TodayView";

export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const supabase = await createClient();
  const user = await getCurrentUserOrThrow(supabase);
  const profile = await getUserProfile(supabase, user.id);
  const timezone = profile?.timezone ?? "UTC";

  const params = await searchParams;
  const dateParam = typeof params.date === "string" ? params.date : undefined;
  const initialDate = dateParam ?? todayInTz(timezone);

  return <TodayView initialDate={initialDate} timezone={timezone} />;
}

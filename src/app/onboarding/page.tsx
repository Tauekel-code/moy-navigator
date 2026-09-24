import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/database/settings";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile(supabase, user.id);
  if (profile?.onboardingCompletedAt) redirect("/today");

  return <OnboardingWizard timezone={profile?.timezone ?? "UTC"} />;
}

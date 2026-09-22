import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/database/settings";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getUserProfile(supabase, user.id);

  return (
    <AppShell timezone={profile?.timezone ?? "UTC"} displayName={profile?.displayName ?? null}>
      {children}
    </AppShell>
  );
}

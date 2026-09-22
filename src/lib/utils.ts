import { clsx, type ClassValue } from "clsx";
import type { SupabaseClient } from "@supabase/supabase-js";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export async function getCurrentUserOrThrow(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");
  return user;
}

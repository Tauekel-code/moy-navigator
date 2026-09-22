import type { SupabaseClient } from "@supabase/supabase-js";
import { mapContact, mapAction } from "./mappers";
import type { Contact, ContactInput } from "@/types/contact";
import type { Action } from "@/types/action";

export async function listContacts(supabase: SupabaseClient, userId: string, includeArchived = false): Promise<Contact[]> {
  let query = supabase
    .from("contacts")
    .select("*, action_contacts(count)")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (!includeArchived) query = query.is("archived_at", null);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => mapContact({ ...row, actions_count: row.action_contacts?.[0]?.count ?? 0 }));
}

export async function getContactById(supabase: SupabaseClient, id: string): Promise<Contact | null> {
  const { data, error } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapContact(data) : null;
}

/** Раздел 35: "История взаимодействия" — все действия, связанные с контактом. */
export async function getContactInteractionHistory(supabase: SupabaseClient, contactId: string): Promise<Action[]> {
  const { data, error } = await supabase
    .from("action_contacts")
    .select("action:actions(*)")
    .eq("contact_id", contactId);
  if (error) throw error;

  return (data ?? [])
    .map((row) => (row as unknown as { action: Record<string, unknown> }).action)
    .filter(Boolean)
    .map(mapAction)
    .sort((a, b) => (b.actionDate ?? "").localeCompare(a.actionDate ?? ""));
}

export async function createContact(supabase: SupabaseClient, userId: string, input: ContactInput): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .insert({ user_id: userId, name: input.name, phone: input.phone, email: input.email, company: input.company, note: input.note })
    .select()
    .single();
  if (error) throw error;
  return mapContact(data);
}

export async function updateContact(supabase: SupabaseClient, id: string, patch: Partial<ContactInput>): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .update({
      name: patch.name,
      phone: patch.phone,
      email: patch.email,
      company: patch.company,
      note: patch.note,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapContact(data);
}

export async function archiveContact(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("contacts").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deleteContact(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw error;
}

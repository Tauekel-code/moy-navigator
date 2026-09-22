import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/contacts";
import * as local from "@/lib/local/contacts";
import type { Contact, ContactInput } from "@/types/contact";
import type { Action } from "@/types/action";

export async function listContacts(supabase: SupabaseClient, userId: string, includeArchived = false): Promise<Contact[]> {
  return isLocalMode() ? local.listContacts(userId, includeArchived) : cloud.listContacts(supabase, userId, includeArchived);
}

export async function getContactById(supabase: SupabaseClient, id: string): Promise<Contact | null> {
  return isLocalMode() ? local.getContactById(id) : cloud.getContactById(supabase, id);
}

export async function getContactInteractionHistory(supabase: SupabaseClient, contactId: string): Promise<Action[]> {
  return isLocalMode() ? local.getContactInteractionHistory(contactId) : cloud.getContactInteractionHistory(supabase, contactId);
}

export async function createContact(supabase: SupabaseClient, userId: string, input: ContactInput): Promise<Contact> {
  return isLocalMode() ? local.createContact(userId, input) : cloud.createContact(supabase, userId, input);
}

export async function updateContact(supabase: SupabaseClient, id: string, patch: Partial<ContactInput>): Promise<Contact> {
  return isLocalMode() ? local.updateContact(id, patch) : cloud.updateContact(supabase, id, patch);
}

export async function archiveContact(supabase: SupabaseClient, id: string): Promise<void> {
  return isLocalMode() ? local.archiveContact(id) : cloud.archiveContact(supabase, id);
}

export async function deleteContact(supabase: SupabaseClient, id: string): Promise<void> {
  return isLocalMode() ? local.deleteContact(id) : cloud.deleteContact(supabase, id);
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/actions";
import * as local from "@/lib/local/actions";
import type { Action, ActionInput, ActionWithDetails, ActionStatus } from "@/types/action";
import type { ActionFilters } from "./cloud/actions";

export type { ActionFilters } from "./cloud/actions";

/**
 * Фасад: в облачном режиме работает через Supabase (cloud/*), в локальном —
 * через встроенную SQLite (lib/local/*). Выбор происходит один раз при
 * старте сервера на основе наличия NEXT_PUBLIC_SUPABASE_URL (см. lib/config.ts).
 * Вызывающий код (API-маршруты) не знает, какой backend активен.
 */

export async function createAction(supabase: SupabaseClient, userId: string, input: ActionInput): Promise<Action> {
  return isLocalMode() ? local.createAction(userId, input) : cloud.createAction(supabase, userId, input);
}

export async function getActionById(supabase: SupabaseClient, id: string): Promise<ActionWithDetails | null> {
  return isLocalMode() ? local.getActionById(id) : cloud.getActionById(supabase, id);
}

export async function updateActionFields(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  patch: Parameters<typeof cloud.updateActionFields>[3],
  eventType: "updated" | "rescheduled" = "updated",
): Promise<Action> {
  return isLocalMode() ? local.updateActionFields(id, userId, patch, eventType) : cloud.updateActionFields(supabase, id, userId, patch, eventType);
}

export async function setActionStatus(supabase: SupabaseClient, id: string, userId: string, status: ActionStatus): Promise<Action> {
  return isLocalMode() ? local.setActionStatus(id, userId, status) : cloud.setActionStatus(supabase, id, userId, status);
}

export async function archiveAction(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  return isLocalMode() ? local.archiveAction(id, userId) : cloud.archiveAction(supabase, id, userId);
}

export async function restoreAction(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  return isLocalMode() ? local.restoreAction(id, userId) : cloud.restoreAction(supabase, id, userId);
}

export async function permanentlyDeleteAction(supabase: SupabaseClient, id: string): Promise<void> {
  return isLocalMode() ? local.permanentlyDeleteAction(id) : cloud.permanentlyDeleteAction(supabase, id);
}

export async function upsertActionContext(
  supabase: SupabaseClient,
  actionId: string,
  patch: Parameters<typeof cloud.upsertActionContext>[2],
) {
  return isLocalMode() ? local.upsertActionContext(actionId, patch) : cloud.upsertActionContext(supabase, actionId, patch);
}

export async function setActionResult(supabase: SupabaseClient, actionId: string, resultText: string) {
  return isLocalMode() ? local.setActionResult(actionId, resultText) : cloud.setActionResult(supabase, actionId, resultText);
}

export async function listActionsForRange(
  supabase: SupabaseClient,
  userId: string,
  rangeStart: string,
  rangeEnd: string,
  opts: { includeArchived?: boolean } = {},
): Promise<Action[]> {
  return isLocalMode() ? local.listActionsForRange(userId, rangeStart, rangeEnd, opts) : cloud.listActionsForRange(supabase, userId, rangeStart, rangeEnd, opts);
}

export async function listActionsFiltered(
  supabase: SupabaseClient,
  userId: string,
  filters: ActionFilters,
): Promise<{ actions: Action[]; total: number }> {
  return isLocalMode() ? local.listActionsFiltered(userId, filters) : cloud.listActionsFiltered(supabase, userId, filters);
}

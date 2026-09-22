import type { SupabaseClient } from "@supabase/supabase-js";
import { createAction, listActionsFiltered } from "@/lib/database/actions";
import type { ActionType, ActionPriority } from "@/types/action";

export interface ImportRow {
  title: string;
  actionDate: string | null;
  startTime: string | null;
  endTime: string | null;
  type: ActionType;
  priority: ActionPriority;
}

export interface ImportResult {
  imported: number;
  skippedDuplicates: number;
  conflicts: { title: string; actionDate: string | null }[];
}

/**
 * Раздел 40: импорт проверяет дубли и предупреждает о конфликтах, но не
 * блокирует сохранение. Идёт через тот же фасад createAction/listActionsFiltered,
 * что и обычное создание действий — поэтому одинаково работает в облачном
 * и локальном режимах.
 */
export async function importActions(supabase: SupabaseClient, userId: string, rows: ImportRow[]): Promise<ImportResult> {
  const { actions: existingActions } = await listActionsFiltered(supabase, userId, { includeArchived: false, pageSize: 100000 });

  const existingKeys = new Set(existingActions.map((a) => `${a.title}__${a.actionDate}__${a.startTime}`));
  const dateCounts = new Map<string, number>();
  for (const a of existingActions) {
    if (!a.actionDate) continue;
    dateCounts.set(a.actionDate, (dateCounts.get(a.actionDate) ?? 0) + 1);
  }

  let imported = 0;
  let skippedDuplicates = 0;
  const conflicts: ImportResult["conflicts"] = [];

  for (const row of rows) {
    const key = `${row.title}__${row.actionDate}__${row.startTime}`;
    if (existingKeys.has(key)) {
      skippedDuplicates++;
      continue;
    }

    await createAction(supabase, userId, {
      title: row.title,
      type: row.type,
      actionDate: row.actionDate,
      startTime: row.startTime,
      endTime: row.endTime,
      durationMinutes: null,
      allDay: false,
      timezone: null,
      priority: row.priority,
      status: "planned",
    });

    if (row.actionDate) {
      const nextCount = (dateCounts.get(row.actionDate) ?? 0) + 1;
      dateCounts.set(row.actionDate, nextCount);
      if (nextCount > 1) conflicts.push({ title: row.title, actionDate: row.actionDate });
    }

    existingKeys.add(key);
    imported++;
  }

  return { imported, skippedDuplicates, conflicts };
}

export function parseCsvRows(csvText: string): ImportRow[] {
  const lines = csvText.replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const rows: ImportRow[] = [];

  for (const line of lines.slice(1)) {
    const cols = line.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
    const [title, actionDate, startTime, endTime] = cols;
    if (!title) continue;

    rows.push({
      title,
      actionDate: actionDate || null,
      startTime: startTime || null,
      endTime: endTime || null,
      type: "task",
      priority: "normal",
    });
  }

  return rows;
}

/** Минимальный парсер ICS (VEVENT: SUMMARY/DTSTART) — достаточно для базового импорта из внешних календарей. */
export function parseIcsRows(icsText: string): ImportRow[] {
  const rows: ImportRow[] = [];
  const events = icsText.split("BEGIN:VEVENT").slice(1);

  for (const block of events) {
    const summaryMatch = block.match(/SUMMARY:(.*)/);
    const dtstartMatch = block.match(/DTSTART[^:]*:(\d{8})(T(\d{6}))?/);
    if (!summaryMatch || !dtstartMatch) continue;

    const title = summaryMatch[1].trim();
    const raw = dtstartMatch[1];
    const actionDate = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    const timeRaw = dtstartMatch[3];
    const startTime = timeRaw ? `${timeRaw.slice(0, 2)}:${timeRaw.slice(2, 4)}` : null;

    rows.push({ title, actionDate, startTime, endTime: null, type: "task", priority: "normal" });
  }

  return rows;
}

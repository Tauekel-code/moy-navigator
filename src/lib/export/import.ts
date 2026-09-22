import type { SupabaseClient } from "@supabase/supabase-js";
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

/** Раздел 40: импорт проверяет дубли и предупреждает о конфликтах, но не блокирует сохранение. */
export async function importActions(supabase: SupabaseClient, userId: string, rows: ImportRow[]): Promise<ImportResult> {
  const { data: existing, error } = await supabase
    .from("actions")
    .select("title, action_date, start_time")
    .eq("user_id", userId)
    .eq("is_archived", false);
  if (error) throw error;

  const existingKeys = new Set((existing ?? []).map((e) => `${e.title}__${e.action_date}__${e.start_time}`));

  let imported = 0;
  let skippedDuplicates = 0;
  const conflicts: ImportResult["conflicts"] = [];

  for (const row of rows) {
    const key = `${row.title}__${row.actionDate}__${row.startTime}`;
    if (existingKeys.has(key)) {
      skippedDuplicates++;
      continue;
    }

    const { error: insertErr } = await supabase.from("actions").insert({
      user_id: userId,
      title: row.title,
      type: row.type,
      action_date: row.actionDate,
      start_time: row.startTime,
      end_time: row.endTime,
      priority: row.priority,
      status: "planned",
    });
    if (insertErr) throw insertErr;

    if (row.actionDate) {
      const { data: sameDay } = await supabase
        .from("actions")
        .select("id")
        .eq("user_id", userId)
        .eq("action_date", row.actionDate)
        .eq("is_archived", false);
      if ((sameDay?.length ?? 0) > 1) {
        conflicts.push({ title: row.title, actionDate: row.actionDate });
      }
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

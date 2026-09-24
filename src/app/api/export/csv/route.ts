import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError, jsonError } from "@/lib/api/respond";
import { listActionsFiltered } from "@/lib/database/actions";
import { actionsToCsv } from "@/lib/export/csv";
import { exportUserDataAsJson } from "@/lib/export/json";
import { listLifeAreas } from "@/lib/database/life-areas";
import { getUserProfile } from "@/lib/database/settings";
import { computePeriodStats } from "@/lib/stats/compute";
import { addCalendarDays, todayInTz } from "@/lib/dates";
import { CSV_TYPES, entityToCsv, type CsvType } from "@/lib/export/csv-entities";

// ?type=tasks (по умолчанию) | goals | life-areas | life-area-scores | goal-scores | ideas | history | reviews
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const type = new URL(req.url).searchParams.get("type") ?? "tasks";

    let csv: string;
    if (type === "tasks") {
      const { actions } = await listActionsFiltered(supabase, user.id, { pageSize: 100000, includeArchived: true });
      csv = actionsToCsv(actions);
    } else if (type === "stats") {
      const profile = await getUserProfile(supabase, user.id);
      const to = todayInTz(profile?.timezone ?? "UTC");
      const from = addCalendarDays(to, -89);
      const [{ actions }, areas] = await Promise.all([
        listActionsFiltered(supabase, user.id, { from, to, pageSize: 100000 }),
        listLifeAreas(supabase, user.id),
      ]);
      const st = computePeriodStats(actions, areas, from, to);
      const lines = [
        "﻿Показатель;Значение",
        `Период;${from} — ${to}`,
        `Запланировано;${st.plannedCount}`,
        `Выполнено;${st.completedCount}`,
        `Отменено;${st.cancelledCount}`,
        `Пропущено;${st.skippedCount}`,
        `Отложено;${st.deferredCount}`,
        `Выполнение %;${st.completionRate}`,
        `План, мин;${st.plannedMinutes}`,
        `Факт, мин;${st.actualMinutes}`,
        "",
        "Сфера;Задач;Выполнено;План, мин;Факт, мин",
        ...st.bySphere.map((s) => `${s.name};${s.taskCount};${s.completedCount};${s.plannedMinutes};${s.actualMinutes}`),
      ];
      csv = lines.join("\r\n");
    } else if ((CSV_TYPES as readonly string[]).includes(type)) {
      const backup = await exportUserDataAsJson(supabase, user.id);
      csv = entityToCsv(type as CsvType, backup.data as unknown as Record<string, Record<string, unknown>[]>);
    } else {
      return jsonError("Неизвестный тип экспорта", 400);
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="navigator-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

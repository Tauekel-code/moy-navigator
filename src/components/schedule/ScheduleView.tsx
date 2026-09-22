"use client";

import { useEffect, useState } from "react";
import { ActionCard } from "@/components/actions/ActionCard";
import { ActionModal } from "@/components/actions/ActionModal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import { addCalendarDays, formatHuman, weekdayLabel, todayInTz } from "@/lib/dates";
import type { Action } from "@/types/action";

const RANGE_DAYS = 30;

/** Раздел 5: «Расписание» — непрерывная повестка предстоящих дел (в отличие от сетки календаря). */
export function ScheduleView({ timezone }: { timezone: string }) {
  const [horizon, setHorizon] = useState(1);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const today = todayInTz(timezone);

  async function load() {
    setLoading(true);
    const from = today;
    const to = addCalendarDays(today, RANGE_DAYS * horizon);
    const { actions } = await api.get<{ actions: Action[] }>(`/api/actions?range=1&from=${from}&to=${to}`);
    setActions(actions.filter((a) => a.status !== "cancelled"));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon]);

  async function toggleStatus(action: Action) {
    const nextStatus = action.status === "completed" ? "planned" : "completed";
    await api.patch(`/api/actions/${action.id}/status`, { status: nextStatus });
    load();
  }

  const grouped = new Map<string, Action[]>();
  for (const a of actions) {
    const key = a.actionDate ?? "Без даты";
    const list = grouped.get(key) ?? [];
    list.push(a);
    grouped.set(key, list);
  }
  const dates = [...grouped.keys()].sort();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Расписание</h1>

      {loading ? (
        <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>
      ) : dates.length === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-12">Ничего не запланировано на ближайшее время</p>
      ) : (
        <div className="space-y-6">
          {dates.map((date) => (
            <div key={date}>
              <p className="text-sm font-medium mb-2 capitalize">
                {date === "Без даты" ? date : `${formatHuman(date)} · ${weekdayLabel(date)}`}
                {date === today && <span className="text-accent ml-1.5">· сегодня</span>}
              </p>
              <div className="space-y-1.5">
                {grouped.get(date)!.map((a) => (
                  <ActionCard key={a.id} action={a} onClick={() => setOpenActionId(a.id)} onStatusToggle={() => toggleStatus(a)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center mt-6">
        <Button variant="outline" size="sm" onClick={() => setHorizon((h) => h + 1)}>
          Показать больше
        </Button>
      </div>

      <ActionModal open={!!openActionId} onClose={() => setOpenActionId(null)} actionId={openActionId} onSaved={load} />
    </div>
  );
}

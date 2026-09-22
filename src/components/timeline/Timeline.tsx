"use client";

import { useState } from "react";
import { ActionCard } from "@/components/actions/ActionCard";
import { ScopeDialog } from "@/components/actions/ScopeDialog";
import { computeFreeSlots } from "@/lib/schedule/free-slots";
import { formatDuration, minutesBetween } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import type { Action, RescheduleScope } from "@/types/action";

interface Props {
  date: string;
  actions: Action[];
  onOpenAction: (id: string) => void;
  onToggleStatus: (action: Action) => void;
  onChanged: () => void;
  dayStartHour?: number;
  dayEndHour?: number;
}

const HOUR_HEIGHT = 64;

/** Раздел 7-8 ТЗ: вертикальная временная шкала со свободными промежутками. */
export function Timeline({ date, actions, onOpenAction, onToggleStatus, onChanged, dayStartHour = 7, dayEndHour = 22 }: Props) {
  const { show } = useToast();
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ actionId: string; newTime: string; occurrenceDate?: string } | null>(null);

  const timed = actions.filter((a) => a.startTime && a.actionDate === date);
  const untimed = actions.filter((a) => !a.startTime && a.actionDate === date);

  const freeSlots = computeFreeSlots(
    timed,
    `${String(dayStartHour).padStart(2, "0")}:00`,
    `${String(dayEndHour).padStart(2, "0")}:00`,
  );

  const hours = Array.from({ length: dayEndHour - dayStartHour + 1 }, (_, i) => dayStartHour + i);

  function topFor(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return (h - dayStartHour) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
  }

  function heightFor(action: Action): number {
    if (!action.startTime) return HOUR_HEIGHT / 2;
    const end = action.endTime ?? action.startTime;
    const minutes = Math.max(minutesBetween(action.startTime, end), 20);
    return (minutes / 60) * HOUR_HEIGHT;
  }

  async function doReschedule(actionId: string, newTime: string, scope: RescheduleScope, occurrenceDate?: string) {
    try {
      await api.patch(`/api/actions/${actionId.split("::")[0]}/reschedule`, {
        newDate: date,
        newTime,
        scope,
        occurrenceDate,
      });
      show("Перенесено", "success");
      onChanged();
    } catch (err) {
      show(err instanceof Error ? err.message : "Не удалось перенести", "error");
    }
  }

  function handleDrop(hour: number, e: React.DragEvent) {
    e.preventDefault();
    setDragOverHour(null);
    const actionId = e.dataTransfer.getData("text/action-id");
    const isRecurring = e.dataTransfer.getData("text/is-recurring") === "1";
    const occurrenceDate = e.dataTransfer.getData("text/occurrence-date") || undefined;
    if (!actionId) return;

    const newTime = `${String(hour).padStart(2, "0")}:00`;

    if (isRecurring) {
      setPendingDrop({ actionId, newTime, occurrenceDate });
    } else {
      doReschedule(actionId, newTime, "this");
    }
  }

  return (
    <div>
      {untimed.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Без времени</p>
          {untimed.map((a) => (
            <ActionCard key={a.id} action={a} onClick={() => onOpenAction(a.id)} onStatusToggle={() => onToggleStatus(a)} />
          ))}
        </div>
      )}

      <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
        {hours.map((h) => (
          <div
            key={h}
            className={cn("absolute left-0 right-0 border-t border-border flex", dragOverHour === h && "bg-accent/5")}
            style={{ top: (h - dayStartHour) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverHour(h);
            }}
            onDragLeave={() => setDragOverHour((prev) => (prev === h ? null : prev))}
            onDrop={(e) => handleDrop(h, e)}
          >
            <span className="text-xs text-foreground-muted w-12 shrink-0 -translate-y-2">{String(h).padStart(2, "0")}:00</span>
          </div>
        ))}

        {freeSlots.map((slot, idx) => (
          <div
            key={idx}
            className="absolute left-14 right-0 flex items-center justify-center pointer-events-none"
            style={{ top: topFor(slot.start), height: topFor(slot.end) - topFor(slot.start) }}
          >
            {slot.minutes >= 30 && (
              <span className="text-[11px] text-foreground-muted border-t border-dashed border-border w-full text-center pt-1">
                Свободно {formatDuration(slot.minutes)}
              </span>
            )}
          </div>
        ))}

        {timed.map((action) => (
          <div
            key={action.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/action-id", action.id);
              e.dataTransfer.setData("text/is-recurring", action.isRecurring ? "1" : "0");
              e.dataTransfer.setData("text/occurrence-date", action.occurrenceDate ?? action.actionDate ?? "");
            }}
            className="absolute left-14 right-2"
            style={{ top: topFor(action.startTime!), height: heightFor(action) }}
          >
            <ActionCard action={action} compact onClick={() => onOpenAction(action.id)} onStatusToggle={() => onToggleStatus(action)} />
          </div>
        ))}
      </div>

      <ScopeDialog
        open={!!pendingDrop}
        onClose={() => setPendingDrop(null)}
        actionLabel="перенос"
        onSelect={(scope) => {
          if (pendingDrop) doReschedule(pendingDrop.actionId, pendingDrop.newTime, scope, pendingDrop.occurrenceDate);
          setPendingDrop(null);
        }}
      />
    </div>
  );
}

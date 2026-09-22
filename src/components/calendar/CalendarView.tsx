"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ActionModal } from "@/components/actions/ActionModal";
import { api } from "@/lib/api-client";
import {
  addMonthsToDate,
  addWeeksToDate,
  monthGrid,
  weekDates,
  monthLabel,
  formatHuman,
  todayInTz,
  WEEKDAY_SHORT_RU,
} from "@/lib/dates";
import type { Action } from "@/types/action";

type ViewMode = "month" | "week" | "year";

export function CalendarView({ timezone }: { timezone: string }) {
  const router = useRouter();
  const today = todayInTz(timezone);
  const [mode, setMode] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(today);
  const [actionsByDate, setActionsByDate] = useState<Map<string, Action[]>>(new Map());
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    let from: string;
    let to: string;

    if (mode === "week") {
      const days = weekDates(anchor);
      from = days[0];
      to = days[6];
    } else if (mode === "month") {
      const grid = monthGrid(anchor);
      from = grid[0].date;
      to = grid[grid.length - 1].date;
    } else {
      from = `${anchor.slice(0, 4)}-01-01`;
      to = `${anchor.slice(0, 4)}-12-31`;
    }

    const { actions } = await api.get<{ actions: Action[] }>(`/api/actions?range=1&from=${from}&to=${to}`);
    const map = new Map<string, Action[]>();
    for (const a of actions) {
      const key = a.actionDate!;
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    setActionsByDate(map);
  }, [mode, anchor]);

  useEffect(() => {
    load();
  }, [load]);

  function shift(delta: number) {
    if (mode === "week") setAnchor((a) => addWeeksToDate(a, delta));
    else if (mode === "month") setAnchor((a) => addMonthsToDate(a, delta));
    else setAnchor((a) => `${Number(a.slice(0, 4)) + delta}-01-01`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Назад">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(today)}>
            Сегодня
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Вперёд">
            <ChevronRight size={16} />
          </Button>
          <span className="font-medium capitalize ml-2">
            {mode === "year" ? anchor.slice(0, 4) : mode === "month" ? monthLabel(anchor) : `Неделя: ${formatHuman(weekDates(anchor)[0], "d MMM")} – ${formatHuman(weekDates(anchor)[6], "d MMM")}`}
          </span>
        </div>

        <div className="flex gap-1 bg-surface-muted rounded-xl p-1">
          {(["week", "month", "year"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === m ? "bg-surface shadow-sm" : "text-foreground-muted"}`}
            >
              {m === "week" ? "Неделя" : m === "month" ? "Месяц" : "Год"}
            </button>
          ))}
        </div>
      </div>

      {mode === "month" && (
        <MonthGrid anchor={anchor} actionsByDate={actionsByDate} today={today} onDayClick={(d) => router.push(`/today?date=${d}`)} />
      )}

      {mode === "week" && (
        <WeekGrid
          anchor={anchor}
          actionsByDate={actionsByDate}
          today={today}
          onDayClick={(d) => router.push(`/today?date=${d}`)}
          onOpenAction={setOpenActionId}
        />
      )}

      {mode === "year" && (
        <YearGrid
          year={Number(anchor.slice(0, 4))}
          actionsByDate={actionsByDate}
          today={today}
          onMonthClick={(d) => {
            setAnchor(d);
            setMode("month");
          }}
        />
      )}

      <ActionModal open={!!openActionId} onClose={() => setOpenActionId(null)} actionId={openActionId} onSaved={load} />
    </div>
  );
}

function MonthGrid({
  anchor,
  actionsByDate,
  today,
  onDayClick,
}: {
  anchor: string;
  actionsByDate: Map<string, Action[]>;
  today: string;
  onDayClick: (d: string) => void;
}) {
  const grid = monthGrid(anchor);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 bg-surface-muted text-xs font-medium text-foreground-muted">
        {WEEKDAY_SHORT_RU.map((d) => (
          <div key={d} className="px-2 py-1.5 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map(({ date, inMonth }) => {
          const dayActions = actionsByDate.get(date) ?? [];
          return (
            <button
              key={date}
              onClick={() => onDayClick(date)}
              className={`min-h-20 p-1.5 text-left border-t border-l first:border-l-0 border-border hover:bg-surface-muted transition-colors ${
                !inMonth ? "opacity-40" : ""
              }`}
            >
              <span
                className={`text-xs inline-flex items-center justify-center w-5 h-5 rounded-full ${
                  date === today ? "bg-accent text-accent-foreground" : ""
                }`}
              >
                {Number(date.slice(8, 10))}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayActions.slice(0, 3).map((a) => (
                  <div key={a.id} className="text-[11px] truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: `var(--type-${a.type})` }} />
                    <span className="truncate">{a.title}</span>
                  </div>
                ))}
                {dayActions.length > 3 && <p className="text-[11px] text-foreground-muted">+{dayActions.length - 3}</p>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  anchor,
  actionsByDate,
  today,
  onDayClick,
  onOpenAction,
}: {
  anchor: string;
  actionsByDate: Map<string, Action[]>;
  today: string;
  onDayClick: (d: string) => void;
  onOpenAction: (id: string) => void;
}) {
  const days = weekDates(anchor);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
      {days.map((date, i) => {
        const dayActions = (actionsByDate.get(date) ?? []).sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
        return (
          <div key={date} className="border border-border rounded-xl p-2 min-h-32">
            <button onClick={() => onDayClick(date)} className="text-left w-full mb-1.5">
              <p className="text-xs text-foreground-muted">{WEEKDAY_SHORT_RU[i]}</p>
              <span className={`text-sm font-medium ${date === today ? "text-accent" : ""}`}>{Number(date.slice(8, 10))}</span>
            </button>
            <div className="space-y-1">
              {dayActions.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onOpenAction(a.id)}
                  className="w-full text-left text-[11px] px-1.5 py-1 rounded-md truncate"
                  style={{ backgroundColor: `color-mix(in srgb, var(--type-${a.type}) 15%, transparent)` }}
                >
                  {a.startTime && <span className="text-foreground-muted mr-1">{a.startTime}</span>}
                  {a.title}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function YearGrid({
  year,
  actionsByDate,
  today,
  onMonthClick,
}: {
  year: number;
  actionsByDate: Map<string, Action[]>;
  today: string;
  onMonthClick: (d: string) => void;
}) {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}-01`);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {months.map((m) => {
        const grid = monthGrid(m);
        const count = grid.filter((g) => g.inMonth && (actionsByDate.get(g.date)?.length ?? 0) > 0).length;
        return (
          <button
            key={m}
            onClick={() => onMonthClick(m)}
            className="border border-border rounded-xl p-3 text-left hover:border-accent/50"
          >
            <p className="text-sm font-medium capitalize mb-1">{monthLabel(m)}</p>
            <div className="grid grid-cols-7 gap-0.5">
              {grid.map(({ date, inMonth }) => (
                <span
                  key={date}
                  className={`w-2 h-2 rounded-full ${date === today ? "bg-accent" : (actionsByDate.get(date)?.length ?? 0) > 0 ? "bg-foreground-muted" : "bg-surface-muted"} ${!inMonth ? "opacity-30" : ""}`}
                />
              ))}
            </div>
            <p className="text-xs text-foreground-muted mt-1.5">{count} дн. с действиями</p>
          </button>
        );
      })}
    </div>
  );
}

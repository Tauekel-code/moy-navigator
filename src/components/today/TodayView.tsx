"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Timeline } from "@/components/timeline/Timeline";
import { ActionModal } from "@/components/actions/ActionModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { addCalendarDays, formatHuman, weekdayLabel, formatDuration, todayInTz } from "@/lib/dates";
import { computeFreeSlots } from "@/lib/schedule/free-slots";
import type { Action } from "@/types/action";
import type { DailyReview } from "@/types/review";

export function TodayView({ initialDate, timezone }: { initialDate: string; timezone: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [date, setDate] = useState(initialDate);
  const [actions, setActions] = useState<Action[]>([]);
  const [review, setReview] = useState<DailyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const today = todayInTz(timezone);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const [{ actions }, { review }] = await Promise.all([
        api.get<{ actions: Action[] }>(`/api/actions?range=1&from=${d}&to=${d}`),
        api.get<{ review: DailyReview }>(`/api/reviews/${d}`),
      ]);
      setActions(actions);
      setReview(review);
    } catch {
      show("Не удалось загрузить день", "error");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    load(date);
  }, [date, load]);

  useEffect(() => {
    function goToday() {
      setDate(today);
    }
    function prevDay() {
      setDate((d) => addCalendarDays(d, -1));
    }
    function nextDay() {
      setDate((d) => addCalendarDays(d, 1));
    }
    function onChanged() {
      load(date);
    }

    window.addEventListener("shortcut:today", goToday);
    window.addEventListener("shortcut:prev-day", prevDay);
    window.addEventListener("shortcut:next-day", nextDay);
    window.addEventListener("actions:changed", onChanged);
    return () => {
      window.removeEventListener("shortcut:today", goToday);
      window.removeEventListener("shortcut:prev-day", prevDay);
      window.removeEventListener("shortcut:next-day", nextDay);
      window.removeEventListener("actions:changed", onChanged);
    };
  }, [date, load, today]);

  useEffect(() => {
    router.replace(date === today ? "/today" : `/today?date=${date}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function toggleStatus(action: Action) {
    const nextStatus = action.status === "completed" ? "planned" : "completed";
    try {
      await api.patch(`/api/actions/${action.id}/status`, { status: nextStatus });
      load(date);
    } catch {
      show("Не удалось изменить статус", "error");
    }
  }

  const freeMinutes = computeFreeSlots(actions.filter((a) => a.actionDate === date)).reduce((s, x) => s + x.minutes, 0);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div>
          <h1 className="text-xl font-semibold capitalize">{formatHuman(date)}</h1>
          <p className="text-sm text-foreground-muted capitalize">{weekdayLabel(date)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setDate((d) => addCalendarDays(d, -1))} aria-label="Предыдущий день">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDate(today)}>
            Сегодня
          </Button>
          <Button variant="outline" size="icon" onClick={() => setDate((d) => addCalendarDays(d, 1))} aria-label="Следующий день">
            <ChevronRight size={16} />
          </Button>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          <Button size="icon" onClick={() => setCreateOpen(true)} aria-label="Добавить">
            <Plus size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 my-5">
        <Stat label="Запланировано" value={review?.plannedCount ?? actions.length} />
        <Stat label="Выполнено" value={review?.completedCount ?? 0} tone="success" />
        <Stat label="Просрочено" value={review?.overdueCount ?? 0} tone="danger" />
        <Stat label="Перенесено" value={review?.postponedCount ?? 0} />
        <Stat label="Свободно" value={formatDuration(freeMinutes)} />
      </div>

      {loading ? (
        <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>
      ) : actions.length === 0 ? (
        <div className="text-center py-16 text-foreground-muted">
          <p className="text-sm">На этот день ничего не запланировано</p>
        </div>
      ) : (
        <Timeline
          date={date}
          actions={actions}
          onOpenAction={setOpenActionId}
          onToggleStatus={toggleStatus}
          onChanged={() => load(date)}
        />
      )}

      <ActionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultDate={date}
        onSaved={() => load(date)}
      />
      <ActionModal open={!!openActionId} onClose={() => setOpenActionId(null)} actionId={openActionId} onSaved={() => load(date)} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p
        className="text-lg font-semibold"
        style={{ color: tone === "success" ? "var(--status-completed)" : tone === "danger" ? "var(--status-overdue)" : undefined }}
      >
        {value}
      </p>
      <p className="text-xs text-foreground-muted mt-0.5">{label}</p>
    </div>
  );
}

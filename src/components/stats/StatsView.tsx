"use client";

import { useEffect, useState } from "react";
import { SparklineChart } from "@/components/ui/SparklineChart";
import { api } from "@/lib/api-client";
import { addCalendarDays, formatDuration, todayInTz } from "@/lib/dates";
import type { PeriodStats } from "@/lib/stats/compute";

type Period = "today" | "7d" | "30d" | "3m" | "custom";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Сегодня" },
  { key: "7d", label: "7 дней" },
  { key: "30d", label: "30 дней" },
  { key: "3m", label: "3 месяца" },
];

/** Раздел 15-20 ТЗ: «Насколько я реально выполняю свои планы?» */
export function StatsView({ timezone }: { timezone: string }) {
  const [period, setPeriod] = useState<Period>("7d");
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [loading, setLoading] = useState(true);

  const today = todayInTz(timezone);

  async function load(p: Period) {
    setLoading(true);
    const to = today;
    const from = p === "today" ? today : p === "7d" ? addCalendarDays(today, -6) : p === "30d" ? addCalendarDays(today, -29) : addCalendarDays(today, -89);

    const { stats } = await api.get<{ stats: PeriodStats }>(`/api/stats?from=${from}&to=${to}`);
    setStats(stats);
    setLoading(false);
  }

  useEffect(() => {
    load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Статистика</h1>

      <div className="flex gap-1 mb-5 bg-surface-muted rounded-xl p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${period === p.key ? "bg-surface shadow-sm" : "text-foreground-muted"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading || !stats ? (
        <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>
      ) : (
        <div className="space-y-6">
          <div className="border border-border rounded-xl p-5 text-center">
            <p className="text-4xl font-semibold text-accent">{stats.completionRate}%</p>
            <p className="text-sm text-foreground-muted mt-1">выполнение плана</p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <Stat label="Запланировано" value={stats.plannedCount} />
            <Stat label="Выполнено" value={stats.completedCount} tone="success" />
            <Stat label="Пропущено" value={stats.skippedCount} tone="warn" />
            <Stat label="Отложено" value={stats.deferredCount} />
            <Stat label="Отменено" value={stats.cancelledCount} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border rounded-xl p-3">
              <p className="text-xs text-foreground-muted mb-1">Запланированное время</p>
              <p className="text-lg font-semibold">{formatDuration(stats.plannedMinutes)}</p>
            </div>
            <div className="border border-border rounded-xl p-3">
              <p className="text-xs text-foreground-muted mb-1">Фактическое время</p>
              <p className="text-lg font-semibold">{formatDuration(stats.actualMinutes)}</p>
            </div>
          </div>

          {stats.dailyCompleted.length > 1 && (
            <div>
              <h2 className="font-medium text-sm mb-2">Выполнено по дням</h2>
              <div className="border border-border rounded-xl p-3">
                <SparklineChart
                  points={stats.dailyCompleted.map((d) => ({ date: d.date, value: d.count }))}
                  min={0}
                  max={Math.max(...stats.dailyCompleted.map((d) => d.count), 1)}
                  height={90}
                />
              </div>
            </div>
          )}

          <div>
            <h2 className="font-medium text-sm mb-2">Баланс сфер</h2>
            <div className="border border-border rounded-xl divide-y divide-border">
              {stats.bySphere.map((s) => (
                <div key={s.lifeAreaId ?? "none"} className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                  <span className="text-xs text-foreground-muted">
                    {s.completedCount}/{s.taskCount} задач · {formatDuration(s.plannedMinutes)} план
                    {s.actualMinutes > 0 && ` · ${formatDuration(s.actualMinutes)} факт`}
                  </span>
                </div>
              ))}
              {stats.bySphere.length === 0 && <p className="text-sm text-foreground-muted px-3.5 py-3">Нет данных за период</p>}
            </div>
          </div>

          <p className="text-xs text-foreground-muted">В среднем {stats.avgTasksPerDay} задач в день за выбранный период.</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-2.5 text-center">
      <p
        className="text-lg font-semibold"
        style={{ color: tone === "success" ? "var(--status-completed)" : tone === "warn" ? "var(--status-skipped)" : undefined }}
      >
        {value}
      </p>
      <p className="text-[11px] text-foreground-muted">{label}</p>
    </div>
  );
}

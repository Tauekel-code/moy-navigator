import type { Action } from "@/types/action";
import type { LifeArea } from "@/types/life-area";

export interface SphereBreakdown {
  lifeAreaId: string | null;
  name: string;
  color: string;
  taskCount: number;
  completedCount: number;
  plannedMinutes: number;
  actualMinutes: number;
}

export interface PeriodStats {
  from: string;
  to: string;
  plannedCount: number;
  completedCount: number;
  cancelledCount: number;
  skippedCount: number;
  deferredCount: number;
  overdueCount: number;
  completionRate: number; // раздел 15: выполненные / (запланированные - отменённые) * 100
  plannedMinutes: number;
  actualMinutes: number;
  avgTasksPerDay: number;
  dailyCompleted: { date: string; count: number }[];
  bySphere: SphereBreakdown[];
}

/**
 * Раздел 15-20 ТЗ: план/факт и баланс сфер. Считается из уже загруженного
 * списка действий за период — без обращения к истории отдельных дней
 * (упрощение v1: перенесённые в рамках периода задачи учитываются по их
 * текущей дате, а не по первоначальной — см. README, известные ограничения).
 */
export function computePeriodStats(actions: Action[], lifeAreas: LifeArea[], from: string, to: string): PeriodStats {
  const planned = actions.filter((a) => a.status !== "cancelled");
  const completed = actions.filter((a) => a.status === "completed");
  const cancelled = actions.filter((a) => a.status === "cancelled");
  const skipped = actions.filter((a) => a.status === "skipped");
  const deferred = actions.filter((a) => a.status === "deferred");
  const overdue = actions.filter((a) => a.status === "overdue");

  const denominator = actions.length - cancelled.length;
  const completionRate = denominator > 0 ? Math.round((completed.length / denominator) * 100) : 0;

  const plannedMinutes = actions.reduce((sum, a) => sum + (a.durationMinutes ?? 0), 0);
  const actualMinutes = actions.reduce((sum, a) => sum + (a.actualMinutes ?? 0), 0);

  const dayCount = Math.max(1, daysBetween(from, to));
  const avgTasksPerDay = Math.round((actions.length / dayCount) * 10) / 10;

  const dailyMap = new Map<string, number>();
  for (const a of completed) {
    if (!a.actionDate) continue;
    dailyMap.set(a.actionDate, (dailyMap.get(a.actionDate) ?? 0) + 1);
  }
  const dailyCompleted = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((x, y) => x.date.localeCompare(y.date));

  const sphereMap = new Map<string | null, SphereBreakdown>();
  const areaById = new Map(lifeAreas.map((a) => [a.id, a]));

  for (const a of actions) {
    const key = a.lifeAreaId ?? null;
    const area = key ? areaById.get(key) : null;
    const entry = sphereMap.get(key) ?? {
      lifeAreaId: key,
      name: area?.name ?? "Без сферы",
      color: area?.color ?? "#94a3b8",
      taskCount: 0,
      completedCount: 0,
      plannedMinutes: 0,
      actualMinutes: 0,
    };
    entry.taskCount++;
    if (a.status === "completed") entry.completedCount++;
    entry.plannedMinutes += a.durationMinutes ?? 0;
    entry.actualMinutes += a.actualMinutes ?? 0;
    sphereMap.set(key, entry);
  }

  return {
    from,
    to,
    plannedCount: planned.length,
    completedCount: completed.length,
    cancelledCount: cancelled.length,
    skippedCount: skipped.length,
    deferredCount: deferred.length,
    overdueCount: overdue.length,
    completionRate,
    plannedMinutes,
    actualMinutes,
    avgTasksPerDay,
    dailyCompleted,
    bySphere: Array.from(sphereMap.values()).sort((a, b) => b.taskCount - a.taskCount),
  };
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

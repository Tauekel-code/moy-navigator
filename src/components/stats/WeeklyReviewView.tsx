"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { formatDuration } from "@/lib/dates";
import { ACTION_STATUS_LABELS } from "@/types/action";
import type { PeriodStats } from "@/lib/stats/compute";
import type { ActionStatus } from "@/types/action";

interface WeeklyReview {
  weekStart: string;
  today: string;
  stats: PeriodStats;
  sphereDynamics: { id: string; name: string; color: string; latest: number | null; previous: number | null }[];
  stalledGoals: { id: string; title: string; lifeAreaName: string | null }[];
  unreviewedIdeas: number;
  postponedTasks: { id: string; title: string; status: ActionStatus; actionDate: string | null }[];
}

/** Раздел 21 ТЗ: еженедельный обзор. */
export function WeeklyReviewView() {
  const [data, setData] = useState<WeeklyReview | null>(null);

  useEffect(() => {
    api.get<WeeklyReview>("/api/weekly-review").then(setData);
  }, []);

  if (!data) return <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>;

  const { stats } = data;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Недельный обзор</h1>
        <p className="text-sm text-foreground-muted">
          {data.weekStart} — {data.today}
        </p>
      </div>

      <Section title="План / факт">
        <p className="text-sm">
          Выполнено <b>{stats.completedCount}</b> из <b>{stats.plannedCount}</b> — <b>{stats.completionRate}%</b>. Время: план{" "}
          {formatDuration(stats.plannedMinutes)}, факт {formatDuration(stats.actualMinutes)}.
        </p>
        <Link href="/stats" className="text-sm text-accent hover:underline">
          Подробная статистика
        </Link>
      </Section>

      <Section title="Динамика сфер (30 дней)">
        {data.sphereDynamics.map((s) => {
          const diff = s.latest != null && s.previous != null ? s.latest - s.previous : null;
          return (
            <div key={s.id} className="flex items-center justify-between text-sm py-1">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
              <span className="text-foreground-muted">
                {s.latest != null ? `${s.latest}/10` : "нет оценки"}
                {diff != null && diff !== 0 && ` (${diff > 0 ? "+" : ""}${diff})`}
              </span>
            </div>
          );
        })}
        <Link href="/life-areas" className="text-sm text-accent hover:underline">
          Обновить оценки
        </Link>
      </Section>

      <Section title="Цели без движения (14+ дней)">
        {data.stalledGoals.length === 0 ? (
          <p className="text-sm text-foreground-muted">Все активные цели двигаются</p>
        ) : (
          data.stalledGoals.map((g) => (
            <Link key={g.id} href={`/goals/${g.id}`} className="block text-sm py-1 hover:text-accent">
              {g.title}
              {g.lifeAreaName && <span className="text-foreground-muted"> · {g.lifeAreaName}</span>}
            </Link>
          ))
        )}
      </Section>

      <Section title="Неразобранные идеи">
        <p className="text-sm">
          {data.unreviewedIdeas > 0 ? (
            <>
              Во «Входящих» ждут разбора: <b>{data.unreviewedIdeas}</b>.{" "}
              <Link href="/inbox" className="text-accent hover:underline">
                Разобрать
              </Link>
            </>
          ) : (
            "Все идеи разобраны"
          )}
        </p>
      </Section>

      <Section title="Перенесённые, пропущенные и просроченные">
        {data.postponedTasks.length === 0 ? (
          <p className="text-sm text-foreground-muted">Таких задач нет</p>
        ) : (
          data.postponedTasks.map((t) => (
            <p key={t.id} className="text-sm py-0.5">
              {t.title} <span className="text-foreground-muted">· {ACTION_STATUS_LABELS[t.status]}</span>
            </p>
          ))
        )}
      </Section>

      <Section title="План следующей недели">
        <Link href="/calendar" className="text-sm text-accent hover:underline">
          Открыть календарь и запланировать неделю
        </Link>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-xl p-4 space-y-1.5">
      <h2 className="font-medium text-sm mb-1">{title}</h2>
      {children}
    </div>
  );
}

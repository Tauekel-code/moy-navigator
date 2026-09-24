"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { todayInTz } from "@/lib/dates";
import { GOAL_STATUS_LABELS, GOAL_TYPE_LABELS } from "@/types/goal";
import type { Goal, GoalStatus, GoalType } from "@/types/goal";
import type { LifeArea } from "@/types/life-area";

const STATUS_FILTERS: { key: GoalStatus | "all"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "active", label: "Активные" },
  { key: "paused", label: "Приостановленные" },
  { key: "completed", label: "Достигнутые" },
  { key: "cancelled", label: "Отменённые" },
];

export function GoalsView({ timezone }: { timezone: string }) {
  const { show } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([]);
  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("active");
  const [lifeAreaFilter, setLifeAreaFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("one_time");
  const [lifeAreaId, setLifeAreaId] = useState("");
  const [deadline, setDeadline] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (lifeAreaFilter) params.set("lifeAreaId", lifeAreaFilter);

    const { goals } = await api.get<{ goals: Goal[] }>(`/api/goals?${params}`);
    setGoals(goals);
    setLoading(false);
  }

  useEffect(() => {
    api.get<{ lifeAreas: LifeArea[] }>("/api/life-areas").then((r) => setLifeAreas(r.lifeAreas));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, lifeAreaFilter]);

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await api.post("/api/goals", {
        title: title.trim(),
        description: description || null,
        goalType,
        metricType: "text",
        lifeAreaId: lifeAreaId || null,
        startDate: todayInTz(timezone),
        deadline: deadline || null,
        priority: "normal",
        status: "active",
      });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setDeadline("");
      show("Цель создана", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Ошибка", "error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Цели</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Цель
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              statusFilter === f.key ? "bg-accent text-accent-foreground border-accent" : "border-border hover:bg-surface-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Select value={lifeAreaFilter} onChange={(e) => setLifeAreaFilter(e.target.value)} className="mb-4 max-w-xs">
        <option value="">Все сферы</option>
        {lifeAreas.map((la) => (
          <option key={la.id} value={la.id}>
            {la.name}
          </option>
        ))}
      </Select>

      {loading ? (
        <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>
      ) : goals.length === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-12">Целей не найдено</p>
      ) : (
        <div className="space-y-2">
          {goals.map((g) => {
            const progress = g.tasksCount ? Math.round(((g.tasksCompletedCount ?? 0) / g.tasksCount) * 100) : null;
            return (
              <Link key={g.id} href={`/goals/${g.id}`} className="block border border-border rounded-xl p-3 hover:border-accent/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{g.title}</p>
                  <span className="text-xs text-foreground-muted shrink-0">{GOAL_STATUS_LABELS[g.status]}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-foreground-muted">
                  {g.lifeAreaName && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.lifeAreaColor ?? "#999" }} />
                      {g.lifeAreaName}
                    </span>
                  )}
                  {g.deadline && <span>до {g.deadline}</span>}
                  {progress != null && <span>{progress}% задач выполнено</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новая цель" size="sm">
        <div className="space-y-3">
          <div>
            <Label htmlFor="g-title">Название</Label>
            <Input id="g-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="g-desc">Описание</Label>
            <Textarea id="g-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Тип</Label>
              <Select value={goalType} onChange={(e) => setGoalType(e.target.value as GoalType)}>
                {Object.entries(GOAL_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Дедлайн</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Сфера</Label>
            <Select value={lifeAreaId} onChange={(e) => setLifeAreaId(e.target.value)}>
              <option value="">Без сферы</option>
              {lifeAreas.map((la) => (
                <option key={la.id} value={la.id}>
                  {la.name}
                </option>
              ))}
            </Select>
          </div>
          <Button className="w-full" onClick={handleCreate}>
            Создать
          </Button>
        </div>
      </Modal>
    </div>
  );
}

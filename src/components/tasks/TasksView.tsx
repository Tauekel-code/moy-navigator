"use client";

import { useEffect, useState } from "react";
import { ActionCard } from "@/components/actions/ActionCard";
import { ActionModal } from "@/components/actions/ActionModal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import { addCalendarDays, todayInTz } from "@/lib/dates";
import type { Action, ActionType } from "@/types/action";
import { ACTION_TYPES, ACTION_TYPE_LABELS } from "@/types/action";
import type { Project } from "@/types/project";
import type { Contact } from "@/types/contact";

type Preset = "all" | "today" | "tomorrow" | "week" | "month" | "overdue" | "incomplete" | "completed" | "important";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "today", label: "Сегодня" },
  { key: "tomorrow", label: "Завтра" },
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "incomplete", label: "Невыполненные" },
  { key: "completed", label: "Выполненные" },
  { key: "overdue", label: "Просроченные" },
  { key: "important", label: "Важные" },
];

/** Раздел 37 ТЗ: фильтры задач. */
export function TasksView({ timezone }: { timezone: string }) {
  const [preset, setPreset] = useState<Preset>("incomplete");
  const [typeFilter, setTypeFilter] = useState<ActionType | "">("");
  const [projectFilter, setProjectFilter] = useState("");
  const [contactFilter, setContactFilter] = useState("");
  const [actions, setActions] = useState<Action[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ projects: Project[] }>("/api/projects").then((r) => setProjects(r.projects));
    api.get<{ contacts: Contact[] }>("/api/contacts").then((r) => setContacts(r.contacts));
  }, []);

  async function load() {
    setLoading(true);
    const today = todayInTz(timezone);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "50");

    if (preset === "today") {
      params.set("from", today);
      params.set("to", today);
    } else if (preset === "tomorrow") {
      const d = addCalendarDays(today, 1);
      params.set("from", d);
      params.set("to", d);
    } else if (preset === "week") {
      params.set("from", today);
      params.set("to", addCalendarDays(today, 7));
    } else if (preset === "month") {
      params.set("from", today);
      params.set("to", addCalendarDays(today, 30));
    } else if (preset === "overdue") {
      params.set("status", "overdue");
    } else if (preset === "incomplete") {
      params.set("status", "planned,in_progress,overdue");
    } else if (preset === "completed") {
      params.set("status", "completed");
    } else if (preset === "important") {
      params.set("priority", "high,critical");
    }

    if (typeFilter) params.set("type", typeFilter);
    if (projectFilter) params.set("projectId", projectFilter);
    if (contactFilter) params.set("contactId", contactFilter);

    const { actions: loaded, total } = await api.get<{ actions: Action[]; total: number }>(`/api/actions?${params}`);
    setActions((prev) => (page === 0 ? loaded : [...prev, ...loaded]));
    setTotal(total);
    setLoading(false);
  }

  useEffect(() => {
    setPage(0);
  }, [preset, typeFilter, projectFilter, contactFilter]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, typeFilter, projectFilter, contactFilter, page]);

  async function toggleStatus(action: Action) {
    const nextStatus = action.status === "completed" ? "planned" : "completed";
    await api.patch(`/api/actions/${action.id}/status`, { status: nextStatus });
    load();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Задачи</h1>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              preset === p.key ? "bg-accent text-accent-foreground border-accent" : "border-border hover:bg-surface-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ActionType | "")}>
          <option value="">Все типы</option>
          {ACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTION_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="">Все проекты</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select value={contactFilter} onChange={(e) => setContactFilter(e.target.value)}>
          <option value="">Все контакты</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>
      ) : actions.length === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-12">Ничего не найдено</p>
      ) : (
        <div className="space-y-1.5">
          {actions.map((a) => (
            <ActionCard key={a.id} action={a} onClick={() => setOpenActionId(a.id)} onStatusToggle={() => toggleStatus(a)} />
          ))}
        </div>
      )}

      {total > actions.length + page * 50 && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
            Показать ещё
          </Button>
        </div>
      )}

      <ActionModal open={!!openActionId} onClose={() => setOpenActionId(null)} actionId={openActionId} onSaved={load} />
    </div>
  );
}

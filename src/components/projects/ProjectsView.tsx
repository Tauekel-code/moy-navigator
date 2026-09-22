"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { PROJECT_STATUS_LABELS } from "@/types/project";
import type { Project, ProjectStatus } from "@/types/project";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";

const COLORS = ["#4f46e5", "#2563eb", "#0891b2", "#16a34a", "#ca8a04", "#ea580c", "#db2777", "#64748b"];

export function ProjectsView() {
  const { show } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  async function load() {
    setLoading(true);
    const { projects } = await api.get<{ projects: Project[] }>("/api/projects");
    setProjects(projects);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      await api.post("/api/projects", { name: name.trim(), description: description || null, status: "active", color });
      setCreateOpen(false);
      setName("");
      setDescription("");
      show("Проект создан", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Ошибка", "error");
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Проекты</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Проект
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-12">Проектов пока нет</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="border border-border rounded-xl p-4 hover:border-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: p.color }}>
                  <FolderKanban size={15} className="text-white" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-foreground-muted">{PROJECT_STATUS_LABELS[p.status]}</p>
                </div>
              </div>
              {p.description && <p className="text-xs text-foreground-muted mt-2 line-clamp-2">{p.description}</p>}
              <p className="text-xs text-foreground-muted mt-2">{p.actionsCount ?? 0} действий</p>
            </Link>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый проект" size="sm">
        <div className="space-y-3">
          <div>
            <Label htmlFor="p-name">Название</Label>
            <Input id="p-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="p-desc">Описание</Label>
            <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Цвет</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-accent" : ""}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={handleCreate}>
            Создать
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function StatusSelect({ value, onChange }: { value: ProjectStatus; onChange: (v: ProjectStatus) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as ProjectStatus)}>
      {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </Select>
  );
}

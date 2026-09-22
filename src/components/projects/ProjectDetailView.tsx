"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ActionCard } from "@/components/actions/ActionCard";
import { ActionModal } from "@/components/actions/ActionModal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { StatusSelect } from "./ProjectsView";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import type { Project, ProjectStatus } from "@/types/project";
import type { Action } from "@/types/action";

export function ProjectDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [{ project }, { actions }] = await Promise.all([
      api.get<{ project: Project }>(`/api/projects/${id}`),
      api.get<{ actions: Action[] }>(`/api/actions?projectId=${id}&pageSize=200&includeArchived=1`),
    ]);
    setProject(project);
    setActions(actions);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(patch: Partial<{ name: string; description: string | null; status: ProjectStatus }>) {
    if (!project) return;
    setSaving(true);
    try {
      const { project: updated } = await api.patch<{ project: Project }>(`/api/projects/${id}`, patch);
      setProject(updated);
      show("Сохранено", "success");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Удалить проект? Действия останутся, но потеряют привязку к проекту.")) return;
    await api.del(`/api/projects/${id}`);
    router.push("/projects");
  }

  if (!project) return <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.push("/projects")} className="flex items-center gap-1 text-sm text-foreground-muted mb-4 hover:text-foreground">
        <ArrowLeft size={15} /> Проекты
      </button>

      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex-1 space-y-3">
          <Input
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            onBlur={(e) => save({ name: e.target.value })}
            className="text-lg font-semibold h-auto py-2"
          />
          <Textarea
            value={project.description ?? ""}
            onChange={(e) => setProject({ ...project, description: e.target.value })}
            onBlur={(e) => save({ description: e.target.value || null })}
            placeholder="Описание проекта"
          />
          <div className="w-48">
            <Label>Статус</Label>
            <StatusSelect value={project.status} onChange={(status) => save({ status })} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-sm">Действия проекта ({actions.length})</h2>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600">
          <Trash2 size={14} /> Удалить проект
        </Button>
      </div>

      <div className="space-y-1.5">
        {actions.map((a) => (
          <ActionCard key={a.id} action={a} onClick={() => setOpenActionId(a.id)} />
        ))}
        {actions.length === 0 && <p className="text-sm text-foreground-muted">Пока нет действий в этом проекте</p>}
      </div>

      <ActionModal open={!!openActionId} onClose={() => setOpenActionId(null)} actionId={openActionId} onSaved={load} />
      {saving && <p className="text-xs text-foreground-muted mt-2">Сохранение…</p>}
    </div>
  );
}

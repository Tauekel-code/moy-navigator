"use client";

import { useEffect, useState } from "react";
import { Plus, ArrowRight, Target, Archive, Mic } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { IdeaQuickCapture } from "./IdeaQuickCapture";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { formatInstant } from "@/lib/dates";
import { IDEA_STATUS_LABELS } from "@/types/idea";
import type { Idea, IdeaStatus } from "@/types/idea";

const STATUS_FILTERS: { key: IdeaStatus | "all"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новая" },
  { key: "reviewing", label: "На разборе" },
  { key: "planned", label: "Запланирована" },
  { key: "postponed", label: "Отложена" },
  { key: "implemented", label: "Реализована" },
];

/** Раздел 6 ТЗ: входящие идеи — не дать пользователю потерять мысль. */
export function InboxView({ timezone }: { timezone: string }) {
  const { show } = useToast();
  const [filter, setFilter] = useState<IdeaStatus | "all">("all");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertDate, setConvertDate] = useState("");
  const [convertTime, setConvertTime] = useState("");

  async function load() {
    setLoading(true);
    const params = filter === "all" ? "" : `?status=${filter}`;
    const { ideas } = await api.get<{ ideas: Idea[] }>(`/api/ideas${params}`);
    setIdeas(ideas);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleConvertToTask(id: string) {
    try {
      await api.post(`/api/ideas/${id}/convert-to-task`, {
        actionDate: convertDate || null,
        startTime: convertTime || null,
      });
      show("Превращено в задачу", "success");
      setConvertingId(null);
      setConvertDate("");
      setConvertTime("");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Ошибка", "error");
    }
  }

  async function handleConvertToGoal(id: string) {
    try {
      await api.post(`/api/ideas/${id}/convert-to-goal`);
      show("Превращено в цель", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Ошибка", "error");
    }
  }

  async function handleArchive(id: string) {
    await api.post(`/api/ideas/${id}/archive`);
    show("Архивировано", "success");
    load();
  }

  async function handlePostpone(id: string) {
    await api.patch(`/api/ideas/${id}`, { status: "postponed" });
    load();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Входящие</h1>
        <Button size="sm" onClick={() => setCaptureOpen(true)}>
          <Plus size={16} /> Идея
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              filter === f.key ? "bg-accent text-accent-foreground border-accent" : "border-border hover:bg-surface-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>
      ) : ideas.length === 0 ? (
        <div className="text-center py-16 text-foreground-muted">
          <p className="text-sm">Пока пусто — нажмите «Идея», как только что-то придёт в голову</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ideas.map((idea) => (
            <div key={idea.id} className="border border-border rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm flex-1">{idea.text}</p>
                {idea.source === "voice" && <Mic size={13} className="text-foreground-muted shrink-0 mt-0.5" />}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span className="text-xs text-foreground-muted">{IDEA_STATUS_LABELS[idea.status]}</span>
                <span className="text-xs text-foreground-muted">· {formatInstant(idea.createdAt, timezone, "d MMM, HH:mm")}</span>
                {idea.lifeAreaName && <span className="text-xs text-foreground-muted">· {idea.lifeAreaName}</span>}
                {idea.goalTitle && <span className="text-xs text-foreground-muted">· цель: {idea.goalTitle}</span>}
              </div>

              {!["implemented", "cancelled"].includes(idea.status) && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <Button variant="outline" size="sm" onClick={() => setConvertingId(idea.id)}>
                    <ArrowRight size={13} /> В задачу
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleConvertToGoal(idea.id)}>
                    <Target size={13} /> В цель
                  </Button>
                  {idea.status !== "postponed" && (
                    <Button variant="ghost" size="sm" onClick={() => handlePostpone(idea.id)}>
                      Отложить
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleArchive(idea.id)}>
                    <Archive size={13} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <IdeaQuickCapture open={captureOpen} onClose={() => setCaptureOpen(false)} onSaved={load} />

      <Modal open={!!convertingId} onClose={() => setConvertingId(null)} title="Превратить в задачу" size="sm">
        <div className="space-y-3">
          <div>
            <Label>Дата (необязательно)</Label>
            <Input type="date" value={convertDate} onChange={(e) => setConvertDate(e.target.value)} />
          </div>
          <div>
            <Label>Время (необязательно)</Label>
            <Input type="time" value={convertTime} onChange={(e) => setConvertTime(e.target.value)} />
          </div>
          <Button className="w-full" onClick={() => convertingId && handleConvertToTask(convertingId)}>
            Создать задачу
          </Button>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { formatHuman } from "@/lib/dates";
import type { Action } from "@/types/action";

/** Раздел 38 ТЗ: архив (просмотр, восстановление, окончательное удаление). */
export function ArchiveView() {
  const { show } = useToast();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { actions } = await api.get<{ actions: Action[] }>("/api/archive?pageSize=200");
    setActions(actions);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function restore(id: string) {
    await api.post(`/api/actions/${id}/restore`);
    show("Восстановлено", "success");
    load();
  }

  async function permanentDelete(id: string) {
    if (!confirm("Удалить окончательно? Это действие необратимо.")) return;
    await api.del(`/api/actions/${id}?permanent=1`);
    show("Удалено", "success");
    load();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Архив</h1>

      {loading ? (
        <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>
      ) : actions.length === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-12">Архив пуст</p>
      ) : (
        <div className="space-y-1.5">
          {actions.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 border border-border rounded-xl p-3 opacity-80">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.title}</p>
                <p className="text-xs text-foreground-muted">
                  {a.actionDate ? formatHuman(a.actionDate) : "Без даты"}
                  {a.archivedAt && ` · в архиве с ${formatHuman(a.archivedAt.slice(0, 10))}`}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="outline" size="sm" onClick={() => restore(a.id)}>
                  <RotateCcw size={14} /> Восстановить
                </Button>
                <Button variant="ghost" size="sm" onClick={() => permanentDelete(a.id)} className="text-red-600">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

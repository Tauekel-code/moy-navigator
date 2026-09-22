"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import { formatInstant } from "@/lib/dates";
import { ACTION_EVENT_LABELS } from "@/types/history";
import type { ActionHistoryEntry } from "@/types/history";

/** Раздел 31-32, 47 ТЗ: журнал изменений. */
export function HistoryView({ timezone }: { timezone: string }) {
  const [entries, setEntries] = useState<ActionHistoryEntry[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { entries: loaded, total } = await api.get<{ entries: ActionHistoryEntry[]; total: number }>(
      `/api/history?page=${page}&pageSize=50`,
    );
    setEntries((prev) => (page === 0 ? loaded : [...prev, ...loaded]));
    setTotal(total);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">История</h1>

      {loading && page === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-12">История пока пуста</p>
      ) : (
        <div className="relative pl-4 border-l border-border space-y-4">
          {entries.map((e) => (
            <div key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-accent" />
              <p className="text-xs text-foreground-muted">{formatInstant(e.createdAt, timezone, "d MMM yyyy, HH:mm")}</p>
              <p className="text-sm">
                <span className="font-medium">{ACTION_EVENT_LABELS[e.eventType]}</span>
                {e.actionTitle && <span className="text-foreground-muted"> — {e.actionTitle}</span>}
              </p>
            </div>
          ))}
        </div>
      )}

      {total > entries.length && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
            Показать ещё
          </Button>
        </div>
      )}
    </div>
  );
}

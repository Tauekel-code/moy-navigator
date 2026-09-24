"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { discardConflict, flushQueue, getConflicts, getQueue, retryConflict, type QueuedRequest } from "@/lib/offline-queue";

const LABELS: Record<string, string> = { "/api/ideas": "новая идея", "/api/actions": "новая задача" };

function describe(item: QueuedRequest): string {
  if (item.method === "PATCH") return "смена статуса задачи";
  return LABELS[item.url] ?? "изменение";
}

/** Раздел 25 ТЗ: синхронизация после восстановления сети; конфликты не перезаписываются молча. */
export function OfflineSync() {
  const { show } = useToast();
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState<QueuedRequest[]>([]);

  const refresh = useCallback(() => {
    setPending(getQueue().length);
    setConflicts(getConflicts());
  }, []);

  const sync = useCallback(async () => {
    if (getQueue().length === 0) return;
    const synced = await flushQueue();
    if (synced > 0) {
      show(`Синхронизировано офлайн-изменений: ${synced}`, "success");
      window.dispatchEvent(new CustomEvent("actions:changed"));
    }
  }, [show]);

  useEffect(() => {
    refresh();
    sync();
    const onQueued = () => show("Нет сети — сохранено на устройстве, отправим при подключении");
    window.addEventListener("offline:changed", refresh);
    window.addEventListener("offline:queued", onQueued);
    window.addEventListener("online", sync);
    const interval = setInterval(sync, 30_000);
    return () => {
      window.removeEventListener("offline:changed", refresh);
      window.removeEventListener("offline:queued", onQueued);
      window.removeEventListener("online", sync);
      clearInterval(interval);
    };
  }, [refresh, sync, show]);

  if (pending === 0 && conflicts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-40 max-w-sm bg-surface border border-border rounded-xl shadow-lg p-3 text-sm space-y-2">
      {pending > 0 && (
        <p className="flex items-center gap-2">
          <CloudOff size={15} className="text-amber-600" /> Ждут отправки: {pending}
        </p>
      )}
      {conflicts.map((c) => (
        <div key={c.id} className="border-t border-border pt-2">
          <p>
            Не удалось синхронизировать ({describe(c)}): <span className="text-foreground-muted">{c.error}</span>
          </p>
          <div className="flex gap-2 mt-1.5">
            <Button size="sm" variant="outline" onClick={() => { retryConflict(c.id); sync(); }}>
              Повторить
            </Button>
            <Button size="sm" variant="ghost" onClick={() => discardConflict(c.id)}>
              Отбросить
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

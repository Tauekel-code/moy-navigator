"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatInstant } from "@/lib/dates";
import type { NotificationLogEntry } from "@/types/notification";

const TYPE_LABELS: Record<string, string> = {
  reminder: "Напоминание",
  morning_plan: "Утренний план",
  evening_review: "Итог дня",
  overdue: "Просрочено",
  conflict: "Конфликт времени",
  telegram_status: "Telegram",
  sync_error: "Ошибка синхронизации",
};

/** Раздел 48 ТЗ: уведомления внутри приложения. */
export function NotificationsBell({ timezone }: { timezone: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationLogEntry[]>([]);
  const [unread, setUnread] = useState(0);

  function load() {
    api
      .get<{ notifications: NotificationLogEntry[]; unreadCount: number }>("/api/notifications")
      .then((r) => {
        setItems(r.notifications);
        setUnread(r.unreadCount);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    window.addEventListener("notifications:changed", load);
    return () => window.removeEventListener("notifications:changed", load);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      await api.patch("/api/notifications");
      setUnread(0);
    }
  }

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative p-2 rounded-xl hover:bg-surface-muted" aria-label="Уведомления">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-surface border border-border rounded-xl shadow-lg z-50">
            {items.length === 0 ? (
              <p className="text-sm text-foreground-muted p-4 text-center">Уведомлений пока нет</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="px-3 py-2.5 border-b border-border last:border-0 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{TYPE_LABELS[n.notificationType] ?? n.notificationType}</span>
                    <span className="text-xs text-foreground-muted">{formatInstant(n.createdAt, timezone)}</span>
                  </div>
                  {n.payload && typeof n.payload === "object" && "title" in n.payload && (
                    <p className="text-foreground-muted mt-0.5">{String((n.payload as { title?: string }).title)}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

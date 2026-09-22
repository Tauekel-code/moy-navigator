export type ActionEventType =
  | "created"
  | "updated"
  | "rescheduled"
  | "status_changed"
  | "completed"
  | "cancelled"
  | "archived"
  | "restored";

export const ACTION_EVENT_LABELS: Record<ActionEventType, string> = {
  created: "Создано",
  updated: "Изменено",
  rescheduled: "Перенесено",
  status_changed: "Статус изменён",
  completed: "Отмечено выполненным",
  cancelled: "Отменено",
  archived: "Архивировано",
  restored: "Восстановлено",
};

export interface ActionHistoryEntry {
  id: string;
  actionId: string;
  userId: string;
  eventType: ActionEventType;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;

  actionTitle?: string;
}

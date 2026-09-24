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

export type GoalEventType = "created" | "updated" | "status_changed" | "progress_updated" | "archived" | "restored";

export const GOAL_EVENT_LABELS: Record<GoalEventType, string> = {
  created: "Создана",
  updated: "Изменена",
  status_changed: "Статус изменён",
  progress_updated: "Показатель обновлён",
  archived: "Архивирована",
  restored: "Восстановлена",
};

export type IdeaEventType =
  | "created"
  | "updated"
  | "status_changed"
  | "converted_to_task"
  | "converted_to_goal"
  | "archived"
  | "restored"
  | "deleted";

export const IDEA_EVENT_LABELS: Record<IdeaEventType, string> = {
  created: "Создана",
  updated: "Изменена",
  status_changed: "Статус изменён",
  converted_to_task: "Превращена в задачу",
  converted_to_goal: "Превращена в цель",
  archived: "Архивирована",
  restored: "Восстановлена",
  deleted: "Удалена",
};

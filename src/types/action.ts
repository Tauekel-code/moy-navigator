export type ActionType =
  | "meeting"
  | "task"
  | "call"
  | "work"
  | "personal"
  | "travel"
  | "reminder"
  | "other";

export const ACTION_TYPES: ActionType[] = [
  "meeting",
  "task",
  "call",
  "work",
  "personal",
  "travel",
  "reminder",
  "other",
];

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  meeting: "Встреча",
  task: "Задача",
  call: "Звонок",
  work: "Работа",
  personal: "Личное",
  travel: "Дорога",
  reminder: "Напоминание",
  other: "Другое",
};

export type ActionPriority = "low" | "normal" | "high" | "critical";

export const ACTION_PRIORITIES: ActionPriority[] = ["low", "normal", "high", "critical"];

export const ACTION_PRIORITY_LABELS: Record<ActionPriority, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  critical: "Критичный",
};

export type ActionStatus = "planned" | "in_progress" | "completed" | "overdue" | "cancelled" | "skipped" | "deferred";

export const ACTION_STATUSES: ActionStatus[] = [
  "planned",
  "in_progress",
  "completed",
  "overdue",
  "cancelled",
  "skipped",
  "deferred",
];

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  planned: "Запланировано",
  in_progress: "В процессе",
  completed: "Выполнено",
  overdue: "Просрочено",
  cancelled: "Отменено",
  skipped: "Пропущено",
  deferred: "Отложено",
};

export interface ActionContext {
  actionId: string;
  whyText: string | null;
  goalText: string | null;
  dontForgetText: string | null;
  mainArgument: string | null;
  questionsText: string | null;
  preparationText: string | null;
  nextStep: string | null;
  links: string[];
  updatedAt: string;
}

export interface ActionResult {
  actionId: string;
  resultText: string;
  createdAt: string;
  updatedAt: string;
}

export interface Action {
  id: string;
  userId: string;
  title: string;
  type: ActionType;
  actionDate: string | null; // YYYY-MM-DD, независима от времени
  startTime: string | null; // HH:mm
  endTime: string | null; // HH:mm
  durationMinutes: number | null;
  allDay: boolean;
  timezone: string | null;
  priority: ActionPriority;
  status: ActionStatus;
  deadlineAt: string | null; // ISO timestamp
  recurrenceRuleId: string | null;
  seriesRootId: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;

  // производные/подгруженные поля
  projectId?: string | null;
  projectName?: string | null;
  projectColor?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  hasContext?: boolean;
  hasResult?: boolean;
  reminderCount?: number;
  isRecurring?: boolean;
  occurrenceDate?: string; // для развёрнутого вхождения повторяющейся серии

  // «Мой личный навигатор»: связь со сферой/целью/подцелью/идеей
  lifeAreaId?: string | null;
  lifeAreaName?: string | null;
  lifeAreaColor?: string | null;
  goalId?: string | null;
  goalTitle?: string | null;
  subgoalId?: string | null;
  ideaId?: string | null;
  actualMinutes?: number | null;
}

export interface ActionWithDetails extends Action {
  context: ActionContext | null;
  result: ActionResult | null;
}

export type RescheduleScope = "this" | "this_and_future" | "all";

export interface QuickAddInput {
  title: string;
  date?: string | null;
  time?: string | null;
}

export interface ActionInput {
  title: string;
  type: ActionType;
  actionDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes?: number | null;
  allDay: boolean;
  timezone: string | null;
  priority: ActionPriority;
  status: ActionStatus;
  deadlineAt?: string | null;
  projectId?: string | null;
  contactId?: string | null;
  lifeAreaId?: string | null;
  goalId?: string | null;
  subgoalId?: string | null;
  ideaId?: string | null;
  actualMinutes?: number | null;
}

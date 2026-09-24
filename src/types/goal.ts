import type { ActionPriority } from "./action";

export type GoalType = "one_time" | "long_term" | "recurring";
export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  one_time: "Разовая",
  long_term: "Долгосрочная",
  recurring: "Повторяющаяся",
};

export type GoalMetricType = "number" | "percent" | "money" | "action_count" | "score_0_10" | "text";
export const GOAL_METRIC_LABELS: Record<GoalMetricType, string> = {
  number: "Число",
  percent: "Процент",
  money: "Деньги",
  action_count: "Количество действий",
  score_0_10: "Оценка 0–10",
  text: "Текстовое описание",
};

export type GoalStatus = "active" | "completed" | "paused" | "cancelled";
export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: "Активна",
  completed: "Достигнута",
  paused: "Приостановлена",
  cancelled: "Отменена",
};

export interface Goal {
  id: string;
  userId: string;
  lifeAreaId: string | null;
  lifeAreaName?: string | null;
  lifeAreaColor?: string | null;
  title: string;
  description: string | null;
  goalType: GoalType;
  metricType: GoalMetricType;
  metricUnit: string | null;
  currentValue: number | null;
  targetValue: number | null;
  startDate: string;
  deadline: string | null;
  priority: ActionPriority;
  status: GoalStatus;
  criteria: string | null;
  notes: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;

  tasksCount?: number;
  tasksCompletedCount?: number;
  subgoalsCount?: number;
  subgoalsCompletedCount?: number;
}

export interface GoalInput {
  lifeAreaId: string | null;
  title: string;
  description: string | null;
  goalType: GoalType;
  metricType: GoalMetricType;
  metricUnit: string | null;
  currentValue: number | null;
  targetValue: number | null;
  startDate: string;
  deadline: string | null;
  priority: ActionPriority;
  status: GoalStatus;
  criteria: string | null;
  notes: string | null;
}

export type SubgoalStatus = "planned" | "in_progress" | "completed" | "cancelled";
export const SUBGOAL_STATUS_LABELS: Record<SubgoalStatus, string> = {
  planned: "Запланирована",
  in_progress: "В процессе",
  completed: "Выполнена",
  cancelled: "Отменена",
};

export interface Subgoal {
  id: string;
  goalId: string;
  title: string;
  deadline: string | null;
  status: SubgoalStatus;
  metricValue: number | null;
  metricTarget: number | null;
  metricUnit: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface SubgoalInput {
  title: string;
  deadline: string | null;
  status: SubgoalStatus;
  metricValue: number | null;
  metricTarget: number | null;
  metricUnit: string | null;
}

export interface GoalScoreInput {
  value: number;
  recordedAt?: string;
  comment?: string | null;
}

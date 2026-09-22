export type ProjectStatus = "active" | "completed" | "archived";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Активный",
  completed: "Завершён",
  archived: "В архиве",
};

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  actionsCount?: number;
}

export interface ProjectInput {
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string;
  icon: string | null;
}

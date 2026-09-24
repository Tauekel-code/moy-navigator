export type IdeaStatus = "new" | "reviewing" | "planned" | "implemented" | "postponed" | "cancelled";
export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  new: "Новая",
  reviewing: "На разборе",
  planned: "Запланирована",
  implemented: "Реализована",
  postponed: "Отложена",
  cancelled: "Отменена",
};

export type IdeaSource = "text" | "voice" | "quick_add";

export interface Idea {
  id: string;
  userId: string;
  text: string;
  status: IdeaStatus;
  source: IdeaSource;
  lifeAreaId: string | null;
  lifeAreaName?: string | null;
  goalId: string | null;
  goalTitle?: string | null;
  projectId: string | null;
  projectName?: string | null;
  convertedActionId: string | null;
  convertedGoalId: string | null;
  notes: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IdeaInput {
  text: string;
  source?: IdeaSource;
  lifeAreaId?: string | null;
  goalId?: string | null;
  projectId?: string | null;
  notes?: string | null;
}

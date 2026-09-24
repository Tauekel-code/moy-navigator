import type { Action } from "./action";

export type DailyPlanStatus = "proposed" | "accepted" | "modified";

export interface DailyPlanItem {
  id: string;
  dailyPlanId: string;
  actionId: string;
  sortOrder: number;
  isRequired: boolean;
  included: boolean;
  action?: Action;
}

export interface DailyPlan {
  id: string;
  userId: string;
  planDate: string;
  status: DailyPlanStatus;
  generatedAt: string;
  acceptedAt: string | null;
  items: DailyPlanItem[];
}

/** Раздел 11: предложение плана дня до сохранения — считается на лету, не хранится. */
export interface DailyPlanSuggestion {
  planDate: string;
  required: Action[];
  optional: Action[];
  overflow: Action[]; // не помещаются в рабочее время — раздел 11, шаг 10
  freeMinutes: number;
  totalPlannedMinutes: number;
}

export interface LifeArea {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  sortOrder: number;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;

  latestScore?: number | null;
  latestDesiredScore?: number | null;
  latestScoreDate?: string | null;
  goalsCount?: number;
}

export interface LifeAreaInput {
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
}

export interface LifeAreaScore {
  id: string;
  lifeAreaId: string;
  score: number;
  desiredScore: number | null;
  scoredAt: string;
  comment: string | null;
  createdAt: string;
}

export interface LifeAreaScoreInput {
  score: number;
  desiredScore?: number | null;
  scoredAt?: string;
  comment?: string | null;
}

export const DEFAULT_LIFE_AREAS: { name: string; color: string; icon: string }[] = [
  { name: "Семья", color: "#db2777", icon: "Heart" },
  { name: "Деньги", color: "#16a34a", icon: "Wallet" },
  { name: "Бизнес", color: "#2563eb", icon: "Briefcase" },
  { name: "Здоровье", color: "#dc2626", icon: "Activity" },
  { name: "Развитие", color: "#7c3aed", icon: "GraduationCap" },
  { name: "Отношения", color: "#ea580c", icon: "Users" },
  { name: "Духовность", color: "#0891b2", icon: "Sparkles" },
  { name: "Отдых", color: "#ca8a04", icon: "Palmtree" },
];

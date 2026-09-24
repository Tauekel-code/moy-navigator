export interface UserProfile {
  id: string;
  displayName: string | null;
  timezone: string;
  language: "ru" | "kk" | "en";
  timeFormat: "12" | "24";
  weekStart: number; // 0=Sunday..6=Saturday
  workStartTime: string; // HH:mm — раздел 2, 11: рабочие часы для плана дня
  workEndTime: string;
  onboardingCompletedAt: string | null; // раздел 34
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileInput {
  displayName: string | null;
  timezone: string;
  language: "ru" | "kk" | "en";
  timeFormat: "12" | "24";
  weekStart: number;
  workStartTime?: string;
  workEndTime?: string;
}

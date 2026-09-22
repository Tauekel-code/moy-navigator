export interface UserProfile {
  id: string;
  displayName: string | null;
  timezone: string;
  language: "ru" | "kk" | "en";
  timeFormat: "12" | "24";
  weekStart: number; // 0=Sunday..6=Saturday
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileInput {
  displayName: string | null;
  timezone: string;
  language: "ru" | "kk" | "en";
  timeFormat: "12" | "24";
  weekStart: number;
}

export interface DailyReview {
  id: string;
  userId: string;
  reviewDate: string; // YYYY-MM-DD
  plannedCount: number;
  completedCount: number;
  postponedCount: number;
  cancelledCount: number;
  overdueCount: number;
  inProgressCount: number;
  mainResult: string | null;
  whatFailed: string | null;
  importantTomorrow: string | null;
  personalNote: string | null;
  sentToTelegramAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReviewNoteInput {
  mainResult: string | null;
  whatFailed: string | null;
  importantTomorrow: string | null;
  personalNote: string | null;
}

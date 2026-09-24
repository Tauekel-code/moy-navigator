export type NotificationChannel = "in_app" | "telegram" | "email" | "push" | "whatsapp";

export type NotificationType =
  | "reminder"
  | "morning_plan"
  | "evening_review"
  | "weekly_review"
  | "goal_reminder"
  | "ideas_reminder"
  | "overdue"
  | "conflict"
  | "telegram_status"
  | "sync_error";

export interface NotificationSettings {
  userId: string;
  inAppEnabled: boolean;
  telegramEnabled: boolean;
  morningPlanEnabled: boolean;
  morningPlanTime: string; // HH:mm
  eveningReviewEnabled: boolean;
  eveningReviewTime: string; // HH:mm
  overdueNotify: boolean;
  conflictNotify: boolean;
  defaultReminderOffsets: { unit: string; value: number }[];
  updatedAt: string;
}

export type TelegramStatus = "pending" | "connected" | "disconnected";

export interface TelegramConnection {
  userId: string;
  telegramChatId: string | null;
  telegramUsername: string | null;
  connectCode: string | null;
  connectCodeExpiresAt: string | null;
  status: TelegramStatus;
  connectedAt: string | null;
}

export interface NotificationLogEntry {
  id: string;
  userId: string;
  actionId: string | null;
  reminderId: string | null;
  notificationType: NotificationType;
  channel: NotificationChannel;
  payload: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

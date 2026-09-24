import { formatDuration } from "@/lib/dates";
import type { Action } from "@/types/action";
import type { DailyReview } from "@/types/review";
import { ACTION_TYPE_LABELS } from "@/types/action";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Раздел 29, 73: утренний план. */
export function formatMorningPlan(actions: Action[], freeMinutes: number): string {
  const lines = ["☀️ <b>План на сегодня</b>", ""];

  const timed = actions.filter((a) => a.startTime && a.status !== "cancelled");
  if (timed.length === 0) {
    lines.push("Сегодня нет запланированных дел со временем.");
  } else {
    for (const a of timed) {
      lines.push(`${a.startTime} — ${escapeHtml(a.title)}`);
    }
  }

  const untimed = actions.filter((a) => !a.startTime && a.status !== "cancelled");
  if (untimed.length > 0) {
    lines.push("", "Без времени:");
    for (const a of untimed) lines.push(`• ${escapeHtml(a.title)}`);
  }

  lines.push("", `Свободно: ${formatDuration(freeMinutes)}`);

  return lines.join("\n");
}

/** Раздел 30, 72: итог дня. */
export function formatEveningReview(review: DailyReview, remaining: Action[]): string {
  const lines = [
    "🌙 <b>Итог дня</b>",
    "",
    `Запланировано: ${review.plannedCount}`,
    `Выполнено: ${review.completedCount}`,
    `Перенесено: ${review.postponedCount}`,
  ];

  if (review.mainResult) {
    lines.push("", "<b>Главный результат:</b>", escapeHtml(review.mainResult));
  }

  if (remaining.length > 0) {
    lines.push("", "<b>Осталось:</b>");
    for (const a of remaining) lines.push(`• ${escapeHtml(a.title)}`);
  }

  return lines.join("\n");
}

/** Раздел 27: напоминание о конкретном действии. */
export function formatReminderMessage(action: Action): string {
  const when = action.startTime ? `в ${action.startTime}` : "сегодня";
  const lines = [`🔔 <b>Напоминание</b>`, "", `${escapeHtml(action.title)} ${when}`, `Тип: ${ACTION_TYPE_LABELS[action.type]}`];
  return lines.join("\n");
}

export function formatOverdueMessage(actions: Action[]): string {
  const lines = ["⚠️ <b>Просроченные действия</b>", ""];
  for (const a of actions) lines.push(`• ${escapeHtml(a.title)}${a.actionDate ? ` (${a.actionDate})` : ""}`);
  return lines.join("\n");
}

export function formatConnectSuccessMessage(): string {
  return "✅ Telegram успешно подключён к вашему расписанию. Теперь вы будете получать напоминания, утренний план и вечерний итог дня здесь.";
}

/** Раздел 10 ТЗ: кнопки под напоминанием — Выполнено / Перенести / Открыть задачу. */
export function reminderKeyboard(actionId: string, actionDate: string | null) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const row = [
    { text: "✅ Выполнено", callback_data: `done:${actionId}` },
    { text: "⏰ Перенести на час", callback_data: `snooze:${actionId}` },
  ];
  const keyboard: { text: string; callback_data?: string; url?: string }[][] = [row];
  if (appUrl) keyboard.push([{ text: "Открыть задачу", url: `${appUrl}/today${actionDate ? `?date=${actionDate}` : ""}` }]);
  return keyboard;
}

/** Раздел 22 ТЗ: недельный обзор, напоминание о целях и неразобранных идеях. */
export function formatWeeklyReview(p: { completed: number; planned: number; rate: number; stalledGoals: number; unreviewedIdeas: number }): string {
  const lines = [
    "📊 <b>Недельный обзор</b>",
    "",
    `Выполнено: ${p.completed} из ${p.planned} (${p.rate}%)`,
  ];
  if (p.stalledGoals > 0) lines.push(`🎯 Целей без движения: ${p.stalledGoals}`);
  if (p.unreviewedIdeas > 0) lines.push(`💡 Неразобранных идей: ${p.unreviewedIdeas}`);
  lines.push("", "Откройте приложение, чтобы обновить оценки сфер и спланировать неделю.");
  return lines.join("\n");
}

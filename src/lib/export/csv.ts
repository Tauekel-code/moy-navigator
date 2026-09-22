import type { Action } from "@/types/action";
import { ACTION_TYPE_LABELS, ACTION_STATUS_LABELS, ACTION_PRIORITY_LABELS } from "@/types/action";

function csvEscape(value: string): string {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Раздел 39: экспорт CSV для работы с таблицами. */
export function actionsToCsv(actions: Action[]): string {
  const headers = ["Название", "Дата", "Начало", "Конец", "Тип", "Приоритет", "Статус", "Проект", "Контакт"];
  const rows = actions.map((a) =>
    [
      a.title,
      a.actionDate ?? "",
      a.startTime ?? "",
      a.endTime ?? "",
      ACTION_TYPE_LABELS[a.type],
      ACTION_PRIORITY_LABELS[a.priority],
      ACTION_STATUS_LABELS[a.status],
      a.projectName ?? "",
      a.contactName ?? "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(";"),
  );

  return ["﻿" + headers.join(";"), ...rows].join("\r\n");
}

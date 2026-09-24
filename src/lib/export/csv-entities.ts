type Row = Record<string, unknown>;

const esc = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function toCsv(rows: Row[], columns: [key: string, header: string][]): string {
  const head = columns.map(([, h]) => esc(h)).join(";");
  const body = rows.map((r) => columns.map(([k]) => esc(r[k])).join(";"));
  return ["﻿" + head, ...body].join("\r\n");
}

export const CSV_TYPES = ["goals", "life-areas", "life-area-scores", "ideas", "history", "reviews", "goal-scores"] as const;
export type CsvType = (typeof CSV_TYPES)[number];

/** Раздел 29 ТЗ: CSV-экспорт целей, сфер, оценок, идей, истории, итогов дней, статистики. Строится из полного JSON-бэкапа. */
export function entityToCsv(type: CsvType, data: Record<string, Row[]>): string {
  const areaName = new Map((data.lifeAreas ?? []).map((a) => [a.id as string, a.name as string]));
  const goalTitle = new Map((data.goals ?? []).map((g) => [g.id as string, g.title as string]));

  switch (type) {
    case "goals":
      return toCsv(
        (data.goals ?? []).map((g) => ({ ...g, area: areaName.get(g.life_area_id as string) ?? "" })),
        [["title", "Название"], ["area", "Сфера"], ["goal_type", "Тип"], ["status", "Статус"], ["current_value", "Текущий показатель"], ["target_value", "Желаемый показатель"], ["metric_unit", "Единица"], ["start_date", "Начало"], ["deadline", "Дедлайн"], ["priority", "Приоритет"], ["criteria", "Критерий"], ["notes", "Заметки"]],
      );
    case "life-areas":
      return toCsv(data.lifeAreas ?? [], [["name", "Название"], ["description", "Описание"], ["color", "Цвет"], ["is_archived", "В архиве"], ["created_at", "Создана"]]);
    case "life-area-scores":
      return toCsv(
        (data.lifeAreaScores ?? []).map((s) => ({ ...s, area: areaName.get(s.life_area_id as string) ?? "" })),
        [["area", "Сфера"], ["scored_at", "Дата оценки"], ["score", "Оценка"], ["desired_score", "Желаемая"], ["comment", "Комментарий"]],
      );
    case "goal-scores":
      return toCsv(
        (data.goalScores ?? []).map((s) => ({ ...s, goal: goalTitle.get(s.goal_id as string) ?? "" })),
        [["goal", "Цель"], ["recorded_at", "Дата"], ["value", "Значение"], ["comment", "Комментарий"]],
      );
    case "ideas":
      return toCsv(
        (data.ideas ?? []).map((i) => ({ ...i, area: areaName.get(i.life_area_id as string) ?? "" })),
        [["text", "Идея"], ["status", "Статус"], ["source", "Источник"], ["area", "Сфера"], ["notes", "Заметки"], ["created_at", "Создана"]],
      );
    case "history":
      return toCsv(data.actionHistory ?? [], [["created_at", "Когда"], ["action_id", "ID задачи"], ["event_type", "Событие"], ["old_value", "Было"], ["new_value", "Стало"]]);
    case "reviews":
      return toCsv(data.dailyReviews ?? [], [["review_date", "Дата"], ["planned_count", "Запланировано"], ["completed_count", "Выполнено"], ["postponed_count", "Перенесено"], ["cancelled_count", "Отменено"], ["overdue_count", "Просрочено"], ["main_result", "Главный результат"], ["what_failed", "Что не получилось"], ["important_tomorrow", "Важно завтра"], ["personal_note", "Заметка"]]);
  }
}

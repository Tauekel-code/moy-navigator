import { addCalendarDays, todayInTz } from "@/lib/dates";
import type { ActionInput } from "@/types/action";

/**
 * Раздел 44-45, 63 ТЗ: AI-готовность. Полноценный AI-разбор естественного
 * языка/голоса — отдельный модуль будущего этапа (Этап 6), сюда достаточно
 * подключить вызов LLM и вернуть тот же ParsedActionDraft.
 * Ниже — пример базового (не-AI) эвристического парсера, который уже
 * сегодня закрывает простые случаи ("завтра", "послезавтра", "в 15:00")
 * и служит примером формы результата, которую должен возвращать будущий AI.
 */
export interface ParsedActionDraft {
  title: string;
  date: string | null;
  time: string | null;
  confidence: number; // 0..1, для UI — показывать результат на подтверждение
}

const RELATIVE_DAY_WORDS: Record<string, number> = {
  "сегодня": 0,
  "завтра": 1,
  "послезавтра": 2,
};

export function heuristicParse(text: string, timezone: string): ParsedActionDraft {
  let remaining = text.trim();
  let date: string | null = null;
  let time: string | null = null;
  let confidence = 0.3;

  for (const [word, offset] of Object.entries(RELATIVE_DAY_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    if (re.test(remaining)) {
      date = addCalendarDays(todayInTz(timezone), offset);
      remaining = remaining.replace(re, "").trim();
      confidence += 0.3;
      break;
    }
  }

  const timeMatch = remaining.match(/\bв\s?(\d{1,2})([:.](\d{2}))?\b/i);
  if (timeMatch) {
    const hh = timeMatch[1].padStart(2, "0");
    const mm = (timeMatch[3] ?? "00").padStart(2, "0");
    time = `${hh}:${mm}`;
    remaining = remaining.replace(timeMatch[0], "").trim();
    confidence += 0.3;
  }

  remaining = remaining.replace(/[—-]\s*$/, "").replace(/\s{2,}/g, " ").trim();

  return { title: remaining || text.trim(), date, time, confidence: Math.min(confidence, 0.9) };
}

export function draftToActionInput(draft: ParsedActionDraft): Pick<ActionInput, "title" | "actionDate" | "startTime"> {
  return { title: draft.title, actionDate: draft.date, startTime: draft.time };
}

/**
 * Точка расширения для будущего AI Quick Add / AI Day Planner / AI Context
 * Assistant (раздел 63). Раздел 64: результат ВСЕГДА возвращается пользователю
 * на подтверждение — ни один вызов не должен сам сохранять действие.
 */
export async function aiParseNaturalLanguage(text: string): Promise<ParsedActionDraft> {
  void text;
  throw new Error("AI-разбор естественного языка не реализован в этой версии — используйте heuristicParse");
}

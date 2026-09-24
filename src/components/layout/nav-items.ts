import {
  CalendarDays,
  CalendarRange,
  ListChecks,
  FolderKanban,
  Users,
  History,
  ClipboardList,
  Archive,
  Settings,
  Sun,
  Lightbulb,
  Target,
  Compass,
  BarChart3,
} from "lucide-react";

// Раздел 30 «Дополнения к ТЗ»: Сегодня / Календарь / Входящие / Цели / Сферы /
// Проекты / История / Статистика / Настройки — дополнено разделами исходного
// ТЗ «Моё личное расписание» (Расписание, Задачи, Контакты, Итоги дня, Архив).
export const NAV_ITEMS = [
  { href: "/today", label: "Сегодня", icon: Sun },
  { href: "/inbox", label: "Входящие", icon: Lightbulb },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/schedule", label: "Расписание", icon: CalendarRange },
  { href: "/tasks", label: "Задачи", icon: ListChecks },
  { href: "/goals", label: "Цели", icon: Target },
  { href: "/life-areas", label: "Сферы", icon: Compass },
  { href: "/projects", label: "Проекты", icon: FolderKanban },
  { href: "/contacts", label: "Контакты", icon: Users },
  { href: "/history", label: "История", icon: History },
  { href: "/stats", label: "Статистика", icon: BarChart3 },
  { href: "/reviews", label: "Итоги дня", icon: ClipboardList },
  { href: "/archive", label: "Архив", icon: Archive },
  { href: "/settings", label: "Настройки", icon: Settings },
] as const;

const MOBILE_PRIMARY_HREFS = new Set(["/today", "/inbox", "/calendar", "/tasks"]);
export const MOBILE_PRIMARY_ITEMS = NAV_ITEMS.filter((item) => MOBILE_PRIMARY_HREFS.has(item.href));
export const MOBILE_MORE_ITEMS = NAV_ITEMS.filter((item) => !MOBILE_PRIMARY_HREFS.has(item.href));

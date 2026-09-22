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
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/today", label: "Сегодня", icon: Sun },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/schedule", label: "Расписание", icon: CalendarRange },
  { href: "/tasks", label: "Задачи", icon: ListChecks },
  { href: "/projects", label: "Проекты", icon: FolderKanban },
  { href: "/contacts", label: "Контакты", icon: Users },
  { href: "/history", label: "История", icon: History },
  { href: "/reviews", label: "Итоги дня", icon: ClipboardList },
  { href: "/archive", label: "Архив", icon: Archive },
  { href: "/settings", label: "Настройки", icon: Settings },
] as const;

export const MOBILE_PRIMARY_ITEMS = NAV_ITEMS.slice(0, 4);
export const MOBILE_MORE_ITEMS = NAV_ITEMS.slice(4);

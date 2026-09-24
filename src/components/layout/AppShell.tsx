"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Search, Menu, X, Lightbulb } from "lucide-react";
import { NAV_ITEMS, MOBILE_PRIMARY_ITEMS, MOBILE_MORE_ITEMS } from "./nav-items";
import { NotificationsBell } from "./NotificationsBell";
import { SearchModal } from "./SearchModal";
import { ActionModal } from "@/components/actions/ActionModal";
import { IdeaQuickCapture } from "@/components/ideas/IdeaQuickCapture";
import { OfflineSync } from "./OfflineSync";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";

const DUE_REMINDERS_POLL_MS = 45_000;

interface Props {
  children: ReactNode;
  timezone: string;
  displayName: string | null;
}

/** Раздел 5, 55, 56, 58 ТЗ: навигация + шапка + мобильное меню + горячие клавиши. */
interface DueReminder {
  reminderId: string;
  actionId: string;
  actionTitle: string;
  actionDate: string | null;
  startTime: string | null;
}

export function AppShell({ children, timezone, displayName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { show } = useToast();

  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isEditable = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if (isEditable) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setCreateOpen(true);
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        setIdeaOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "t" || e.key === "T") {
        window.dispatchEvent(new CustomEvent("shortcut:today"));
      } else if (e.key === "ArrowLeft") {
        window.dispatchEvent(new CustomEvent("shortcut:prev-day"));
      } else if (e.key === "ArrowRight") {
        window.dispatchEvent(new CustomEvent("shortcut:next-day"));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    async function poll() {
      try {
        const { due } = await api.get<{ due: DueReminder[] }>("/api/reminders/due");
        if (due.length > 0) {
          for (const reminder of due) {
            show(`🔔 ${reminder.actionTitle}${reminder.startTime ? ` — ${reminder.startTime}` : ""}`);
          }
          window.dispatchEvent(new CustomEvent("notifications:changed"));
        }
      } catch {
        // тихо игнорируем — сработает на следующем опросе
      }
    }

    poll();
    const interval = setInterval(poll, DUE_REMINDERS_POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    router.refresh();
    window.dispatchEvent(new CustomEvent("actions:changed"));
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r border-border bg-surface p-4">
        <div className="mb-6 px-2">
          <p className="font-semibold text-sm">Мой навигатор</p>
          {displayName && <p className="text-xs text-foreground-muted mt-0.5">{displayName}</p>}
        </div>

        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                  active ? "bg-accent text-accent-foreground" : "text-foreground-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-accent text-accent-foreground rounded-xl h-11 text-sm font-medium hover:opacity-90"
          >
            <Plus size={16} /> Добавить
          </button>
          <button
            onClick={() => setIdeaOpen(true)}
            className="shrink-0 flex items-center justify-center bg-surface-muted text-foreground rounded-xl h-11 w-11 hover:bg-border"
            aria-label="Быстрая запись идеи (I)"
            title="Быстрая запись идеи (I)"
          >
            <Lightbulb size={17} />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 h-14 sticky top-0 z-30">
          <button className="md:hidden p-2 -ml-2" onClick={() => setMobileMoreOpen(true)} aria-label="Меню">
            <Menu size={20} />
          </button>
          <span className="md:hidden font-semibold text-sm">Мой навигатор</span>

          <div className="hidden md:block flex-1" />

          <div className="flex items-center gap-1">
            <button onClick={() => setSearchOpen(true)} className="p-2 rounded-xl hover:bg-surface-muted" aria-label="Поиск (/)">
              <Search size={18} />
            </button>
            <NotificationsBell timezone={timezone} />
            <button
              onClick={() => setIdeaOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-surface-muted"
              aria-label="Быстрая запись идеи"
            >
              <Lightbulb size={18} />
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="md:hidden p-2 rounded-xl bg-accent text-accent-foreground"
              aria-label="Добавить"
            >
              <Plus size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">{children}</main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex items-stretch h-16 z-30">
          {MOBILE_PRIMARY_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px]",
                  active ? "text-accent" : "text-foreground-muted",
                )}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => setMobileMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] text-foreground-muted"
          >
            <Menu size={19} />
            Ещё
          </button>
        </nav>
      </div>

      {mobileMoreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMoreOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl p-4 pb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">Разделы</p>
              <button onClick={() => setMobileMoreOpen(false)} aria-label="Закрыть">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[...MOBILE_PRIMARY_ITEMS, ...MOBILE_MORE_ITEMS].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMoreOpen(false)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-surface-muted text-xs"
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpenAction={(id) => setOpenActionId(id)}
      />

      <ActionModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={refresh} />
      <ActionModal open={!!openActionId} onClose={() => setOpenActionId(null)} actionId={openActionId} onSaved={refresh} />
      <OfflineSync />
      <IdeaQuickCapture open={ideaOpen} onClose={() => setIdeaOpen(false)} onSaved={refresh} />
    </div>
  );
}

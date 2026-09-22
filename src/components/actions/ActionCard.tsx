"use client";

import { MessageSquareText, Bell, Repeat, FolderKanban, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { TypeBadge, PriorityBadge } from "@/components/ui/Badge";
import type { Action } from "@/types/action";

interface Props {
  action: Action;
  onClick?: () => void;
  onStatusToggle?: () => void;
  compact?: boolean;
}

/** Раздел 18 ТЗ: карточка действия. */
export function ActionCard({ action, onClick, onStatusToggle, compact }: Props) {
  const isDone = action.status === "completed";
  const isCancelled = action.status === "cancelled";

  return (
    <div
      onClick={onClick}
      className={cn(
        "group rounded-xl border border-border bg-surface p-3 cursor-pointer hover:border-accent/50 transition-colors",
        isCancelled && "opacity-50",
        compact && "p-2.5",
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: `var(--type-${action.type})` }}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStatusToggle?.();
          }}
          className={cn(
            "mt-0.5 w-4.5 h-4.5 shrink-0 rounded-full border-2 flex items-center justify-center",
            isDone ? "bg-green-600 border-green-600" : "border-foreground-muted",
          )}
          style={{ width: 18, height: 18 }}
          aria-label="Отметить выполненным"
        >
          {isDone && <span className="w-2 h-2 rounded-full bg-white" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-sm font-medium truncate", isDone && "line-through text-foreground-muted")}>{action.title}</span>
            {action.isRecurring && <Repeat size={12} className="text-foreground-muted shrink-0" />}
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-1">
            {(action.startTime || action.endTime) && (
              <span className="text-xs text-foreground-muted">
                {action.startTime}
                {action.endTime ? `–${action.endTime}` : ""}
              </span>
            )}
            {!compact && <TypeBadge type={action.type} />}
            <PriorityBadge priority={action.priority} />
            {action.projectName && (
              <span className="text-xs text-foreground-muted flex items-center gap-1">
                <FolderKanban size={11} /> {action.projectName}
              </span>
            )}
            {action.contactName && (
              <span className="text-xs text-foreground-muted flex items-center gap-1">
                <User size={11} /> {action.contactName}
              </span>
            )}
            {action.hasContext && <MessageSquareText size={12} className="text-foreground-muted" />}
            {!!action.reminderCount && (
              <span className="text-xs text-foreground-muted flex items-center gap-0.5">
                <Bell size={11} /> {action.reminderCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

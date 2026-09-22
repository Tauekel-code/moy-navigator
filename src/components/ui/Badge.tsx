import { cn } from "@/lib/utils";
import type { ActionType, ActionPriority, ActionStatus } from "@/types/action";
import { ACTION_TYPE_LABELS, ACTION_PRIORITY_LABELS, ACTION_STATUS_LABELS } from "@/types/action";

export function TypeBadge({ type }: { type: ActionType }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: `var(--type-${type})` }}
    >
      {ACTION_TYPE_LABELS[type]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: ActionPriority }) {
  if (priority === "normal") return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: `var(--priority-${priority})` }}
    >
      {ACTION_PRIORITY_LABELS[priority]}
    </span>
  );
}

export function StatusBadge({ status }: { status: ActionStatus }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: `var(--status-${status})` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `var(--status-${status})` }} />
      {ACTION_STATUS_LABELS[status]}
    </span>
  );
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn("w-1.5 h-1.5 rounded-full inline-block", className)} />;
}

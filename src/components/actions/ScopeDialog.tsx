"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { RescheduleScope } from "@/types/action";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (scope: RescheduleScope) => void;
  actionLabel?: string;
}

/** Раздел 21 ТЗ: при изменении повторяющегося действия — выбор области изменения. */
export function ScopeDialog({ open, onClose, onSelect, actionLabel = "изменение" }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Это повторяющееся действие" size="sm">
      <p className="text-sm text-foreground-muted mb-4">Применить {actionLabel} к:</p>
      <div className="flex flex-col gap-2">
        <Button variant="outline" className="justify-start" onClick={() => onSelect("this")}>
          Только это
        </Button>
        <Button variant="outline" className="justify-start" onClick={() => onSelect("this_and_future")}>
          Это и будущие
        </Button>
        <Button variant="outline" className="justify-start" onClick={() => onSelect("all")}>
          Всю серию
        </Button>
      </div>
    </Modal>
  );
}

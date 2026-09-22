"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import type { PostponeShortcut } from "@/lib/database/schedule";

interface Props {
  onPostpone: (shortcut?: PostponeShortcut, date?: string, time?: string | null) => void;
}

const SHORTCUTS: { key: PostponeShortcut; label: string }[] = [
  { key: "15m", label: "На 15 минут" },
  { key: "30m", label: "На 30 минут" },
  { key: "1h", label: "На 1 час" },
  { key: "tonight", label: "Сегодня вечером" },
  { key: "tomorrow", label: "Завтра" },
];

/** Раздел 42 ТЗ: быстрое откладывание. */
export function PostponeMenu({ onPostpone }: Props) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  return (
    <div className="relative inline-block">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <Clock size={14} /> Отложить
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 right-0 w-48 bg-surface border border-border rounded-xl shadow-lg py-1">
            {SHORTCUTS.map((s) => (
              <button
                key={s.key}
                className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted"
                onClick={() => {
                  onPostpone(s.key);
                  setOpen(false);
                }}
              >
                {s.label}
              </button>
            ))}
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted border-t border-border"
              onClick={() => {
                setOpen(false);
                setCustomOpen(true);
              }}
            >
              Выбрать дату…
            </button>
          </div>
        </>
      )}

      <Modal open={customOpen} onClose={() => setCustomOpen(false)} title="Перенести на" size="sm">
        <div className="space-y-3">
          <div>
            <Label htmlFor="postpone-date">Дата</Label>
            <Input id="postpone-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="postpone-time">Время (необязательно)</Label>
            <Input id="postpone-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <Button
            className="w-full"
            disabled={!date}
            onClick={() => {
              onPostpone(undefined, date, time || null);
              setCustomOpen(false);
            }}
          >
            Перенести
          </Button>
        </div>
      </Modal>
    </div>
  );
}

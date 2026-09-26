"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Textarea, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { formatHuman, weekdayLabel } from "@/lib/dates";
import type { DailyReview, DailyReviewNoteInput } from "@/types/review";

/** Раздел 30, 46, 71 ТЗ: детальный итог дня с ручными заметками. */
export function ReviewDetailView({ date }: { date: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [review, setReview] = useState<DailyReview | null>(null);
  const [notes, setNotes] = useState<DailyReviewNoteInput>({
    mainResult: "",
    whatFailed: "",
    importantTomorrow: "",
    personalNote: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ review: DailyReview }>(`/api/reviews/${date}`).then((r) => {
      setReview(r.review);
      setNotes({
        mainResult: r.review.mainResult ?? "",
        whatFailed: r.review.whatFailed ?? "",
        importantTomorrow: r.review.importantTomorrow ?? "",
        personalNote: r.review.personalNote ?? "",
      });
    });
  }, [date]);

  async function saveNotes() {
    setSaving(true);
    try {
      const { review: updated } = await api.patch<{ review: DailyReview }>(`/api/reviews/${date}/notes`, notes);
      setReview(updated);
      show("Сохранено", "success");
    } finally {
      setSaving(false);
    }
  }

  if (!review) return <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>;

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={() => router.push("/reviews")} className="flex items-center gap-1 text-sm text-foreground-muted mb-4 hover:text-foreground">
        <ArrowLeft size={15} /> Итоги дня
      </button>

      <h1 className="text-xl font-semibold capitalize mb-1">{formatHuman(date)}</h1>
      <p className="text-sm text-foreground-muted capitalize mb-2">{weekdayLabel(date)}</p>
      <p className="text-sm text-foreground-muted mb-5">Дневник размышлений: 10 минут вечером. Ответ на третий вопрос завтра появится на странице «Сегодня».</p>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
        <Stat label="Запланировано" value={review.plannedCount} />
        <Stat label="Выполнено" value={review.completedCount} />
        <Stat label="Перенесено" value={review.postponedCount} />
        <Stat label="Просрочено" value={review.overdueCount} />
        <Stat label="Отменено" value={review.cancelledCount} />
      </div>

      <div className="space-y-4">
        <div>
          <Label>1. Что прошло хорошо?</Label>
          <Textarea value={notes.mainResult ?? ""} onChange={(e) => setNotes({ ...notes, mainResult: e.target.value })} />
        </div>
        <div>
          <Label>2. Что прошло не так?</Label>
          <Textarea value={notes.whatFailed ?? ""} onChange={(e) => setNotes({ ...notes, whatFailed: e.target.value })} />
        </div>
        <div>
          <Label>3. Что завтра сделаю конкретно по-другому?</Label>
          <Textarea value={notes.importantTomorrow ?? ""} onChange={(e) => setNotes({ ...notes, importantTomorrow: e.target.value })} />
        </div>
        <div>
          <Label>Заметка для себя (необязательно)</Label>
          <Textarea value={notes.personalNote ?? ""} onChange={(e) => setNotes({ ...notes, personalNote: e.target.value })} />
        </div>
        <Button onClick={saveNotes} disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-2.5 text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-foreground-muted">{label}</p>
    </div>
  );
}

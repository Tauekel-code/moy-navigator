"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { formatHuman, todayInTz } from "@/lib/dates";
import type { DailyReview } from "@/types/review";

/** Раздел 30, 46: список итогов дня. */
export function ReviewsListView({ timezone }: { timezone: string }) {
  const [reviews, setReviews] = useState<DailyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const today = todayInTz(timezone);

  useEffect(() => {
    api.get<{ reviews: DailyReview[] }>("/api/reviews?limit=60").then((r) => {
      setReviews(r.reviews);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Итоги дня</h1>
        <Link href={`/reviews/${today}`} className="text-sm text-accent hover:underline">
          Итог сегодня
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-12">Пока нет данных — откройте итог сегодняшнего дня</p>
      ) : (
        <div className="space-y-1.5">
          {reviews.map((r) => (
            <Link
              key={r.id}
              href={`/reviews/${r.reviewDate}`}
              className="flex items-center justify-between border border-border rounded-xl p-3 hover:border-accent/50"
            >
              <div>
                <p className="text-sm font-medium capitalize">{formatHuman(r.reviewDate)}</p>
                {r.mainResult && <p className="text-xs text-foreground-muted line-clamp-1 mt-0.5">{r.mainResult}</p>}
              </div>
              <div className="flex gap-3 text-xs text-foreground-muted shrink-0">
                <span>✓ {r.completedCount}</span>
                <span>⏳ {r.plannedCount - r.completedCount}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

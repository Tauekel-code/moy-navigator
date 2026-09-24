"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Archive, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SparklineChart } from "@/components/ui/SparklineChart";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { GOAL_STATUS_LABELS } from "@/types/goal";
import type { LifeArea, LifeAreaScore } from "@/types/life-area";
import type { Goal } from "@/types/goal";

export function LifeAreaDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [area, setArea] = useState<LifeArea | null>(null);
  const [scores, setScores] = useState<LifeAreaScore[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [newScore, setNewScore] = useState(5);
  const [newDesired, setNewDesired] = useState<number | "">("");
  const [comment, setComment] = useState("");

  async function load() {
    const [{ lifeArea }, { scores }, { goals }] = await Promise.all([
      api.get<{ lifeArea: LifeArea }>(`/api/life-areas/${id}`),
      api.get<{ scores: LifeAreaScore[] }>(`/api/life-areas/${id}/scores`),
      api.get<{ goals: Goal[] }>(`/api/goals?lifeAreaId=${id}`),
    ]);
    setArea(lifeArea);
    setScores(scores);
    setGoals(goals);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(patch: Partial<{ name: string; description: string | null }>) {
    if (!area) return;
    const { lifeArea } = await api.patch<{ lifeArea: LifeArea }>(`/api/life-areas/${id}`, patch);
    setArea(lifeArea);
  }

  async function handleAddScore() {
    try {
      await api.post(`/api/life-areas/${id}/scores`, {
        score: newScore,
        desiredScore: newDesired === "" ? null : newDesired,
        comment: comment || null,
      });
      setScoreOpen(false);
      setComment("");
      show("Оценка сохранена", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Ошибка", "error");
    }
  }

  async function handleArchive() {
    if (!confirm("Архивировать сферу? Связанные цели и история сохранятся.")) return;
    await api.del(`/api/life-areas/${id}`);
    router.push("/life-areas");
  }

  if (!area) return <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>;

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={() => router.push("/life-areas")} className="flex items-center gap-1 text-sm text-foreground-muted mb-4 hover:text-foreground">
        <ArrowLeft size={15} /> Сферы жизни
      </button>

      <div className="flex items-center gap-2 mb-4">
        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
        <Input
          value={area.name}
          onChange={(e) => setArea({ ...area, name: e.target.value })}
          onBlur={(e) => save({ name: e.target.value })}
          className="text-lg font-semibold h-auto py-1.5"
        />
      </div>
      <Textarea
        value={area.description ?? ""}
        onChange={(e) => setArea({ ...area, description: e.target.value })}
        onBlur={(e) => save({ description: e.target.value || null })}
        placeholder="Описание сферы"
        className="mb-6"
      />

      <div className="flex items-center justify-between mb-2">
        <h2 className="font-medium text-sm">Динамика оценки</h2>
        <Button size="sm" variant="outline" onClick={() => setScoreOpen(true)}>
          <Plus size={14} /> Новая оценка
        </Button>
      </div>

      <div className="border border-border rounded-xl p-3 mb-6">
        <SparklineChart points={scores.map((s) => ({ date: s.scoredAt, value: s.score }))} min={0} max={10} />
        {scores.length > 0 && (
          <div className="flex justify-between mt-2 text-xs text-foreground-muted">
            <span>{scores[0].scoredAt}</span>
            <span>{scores[scores.length - 1].scoredAt}</span>
          </div>
        )}
      </div>

      <h2 className="font-medium text-sm mb-2">Цели в этой сфере ({goals.length})</h2>
      <div className="space-y-1.5 mb-6">
        {goals.map((g) => (
          <Link key={g.id} href={`/goals/${g.id}`} className="flex items-center justify-between border border-border rounded-xl p-3 hover:border-accent/50">
            <span className="text-sm">{g.title}</span>
            <span className="text-xs text-foreground-muted">{GOAL_STATUS_LABELS[g.status]}</span>
          </Link>
        ))}
        {goals.length === 0 && <p className="text-sm text-foreground-muted">Пока нет целей в этой сфере</p>}
      </div>

      <Button variant="ghost" size="sm" onClick={handleArchive} className="text-red-600">
        <Archive size={14} /> В архив
      </Button>

      <Modal open={scoreOpen} onClose={() => setScoreOpen(false)} title="Новая оценка сферы" size="sm">
        <div className="space-y-3">
          <div>
            <Label>Текущая оценка: {newScore}/10</Label>
            <input type="range" min={0} max={10} value={newScore} onChange={(e) => setNewScore(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <Label>Желаемая оценка (необязательно)</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={newDesired}
              onChange={(e) => setNewDesired(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Комментарий</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          </div>
          <Button className="w-full" onClick={handleAddScore}>
            Сохранить оценку
          </Button>
        </div>
      </Modal>
    </div>
  );
}

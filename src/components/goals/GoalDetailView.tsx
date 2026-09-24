"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Archive, RotateCcw, Plus, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SparklineChart } from "@/components/ui/SparklineChart";
import { ActionCard } from "@/components/actions/ActionCard";
import { ActionModal } from "@/components/actions/ActionModal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { GOAL_STATUS_LABELS } from "@/types/goal";
import type { Goal, GoalStatus, Subgoal } from "@/types/goal";
import type { Action } from "@/types/action";

export function GoalDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [subgoals, setSubgoals] = useState<Subgoal[]>([]);
  const [scores, setScores] = useState<{ value: number; recorded_at: string }[]>([]);
  const [tasks, setTasks] = useState<Action[]>([]);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [scoreValue, setScoreValue] = useState(0);
  const [subgoalTitle, setSubgoalTitle] = useState("");
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  async function load() {
    const [{ goal }, { subgoals }, { scores }, { actions }] = await Promise.all([
      api.get<{ goal: Goal }>(`/api/goals/${id}`),
      api.get<{ subgoals: Subgoal[] }>(`/api/goals/${id}/subgoals`),
      api.get<{ scores: { value: number; recorded_at: string }[] }>(`/api/goals/${id}/scores`),
      api.get<{ actions: Action[] }>(`/api/actions?goalId=${id}&pageSize=100&includeArchived=1`),
    ]);
    setGoal(goal);
    setSubgoals(subgoals);
    setScores(scores);
    setTasks(actions);
    setScoreValue(goal.currentValue ?? 0);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(patch: Partial<{ title: string; description: string | null; status: GoalStatus }>) {
    if (!goal) return;
    const { goal: updated } = await api.patch<{ goal: Goal }>(`/api/goals/${id}`, patch);
    setGoal(updated);
  }

  async function handleAddScore() {
    await api.post(`/api/goals/${id}/scores`, { value: scoreValue });
    setScoreOpen(false);
    show("Показатель обновлён", "success");
    load();
  }

  async function handleAddSubgoal() {
    if (!subgoalTitle.trim()) return;
    await api.post(`/api/goals/${id}/subgoals`, { title: subgoalTitle.trim(), status: "planned" });
    setSubgoalTitle("");
    load();
  }

  async function toggleSubgoal(sg: Subgoal) {
    await api.patch(`/api/subgoals/${sg.id}`, { status: sg.status === "completed" ? "planned" : "completed" });
    load();
  }

  async function deleteSubgoal(sgId: string) {
    await api.del(`/api/subgoals/${sgId}`);
    load();
  }

  async function handleArchive() {
    await api.post(`/api/goals/${id}/archive`);
    router.push("/goals");
  }

  if (!goal) return <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>;

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={() => router.push("/goals")} className="flex items-center gap-1 text-sm text-foreground-muted mb-4 hover:text-foreground">
        <ArrowLeft size={15} /> Цели
      </button>

      <Input
        value={goal.title}
        onChange={(e) => setGoal({ ...goal, title: e.target.value })}
        onBlur={(e) => save({ title: e.target.value })}
        className="text-lg font-semibold h-auto py-1.5 mb-3"
      />
      <Textarea
        value={goal.description ?? ""}
        onChange={(e) => setGoal({ ...goal, description: e.target.value })}
        onBlur={(e) => save({ description: e.target.value || null })}
        placeholder="Описание цели"
        className="mb-3"
      />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div>
          <Label>Статус</Label>
          <Select value={goal.status} onChange={(e) => save({ status: e.target.value as GoalStatus })}>
            {Object.entries(GOAL_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Дедлайн</Label>
          <Input type="date" value={goal.deadline ?? ""} disabled className="opacity-60" />
        </div>
      </div>

      {goal.metricType !== "text" && (
        <>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium text-sm">
              Показатель {goal.currentValue ?? 0}
              {goal.targetValue != null && ` / ${goal.targetValue}`} {goal.metricUnit}
            </h2>
            <Button size="sm" variant="outline" onClick={() => setScoreOpen(true)}>
              <Plus size={14} /> Обновить
            </Button>
          </div>
          <div className="border border-border rounded-xl p-3 mb-6">
            <SparklineChart
              points={scores.map((s) => ({ date: s.recorded_at, value: s.value }))}
              min={Math.min(0, ...scores.map((s) => s.value))}
              max={Math.max(goal.targetValue ?? 10, ...scores.map((s) => s.value), 10)}
            />
          </div>
        </>
      )}

      <h2 className="font-medium text-sm mb-2">Подцели</h2>
      <div className="space-y-1.5 mb-3">
        {subgoals.map((sg) => (
          <div key={sg.id} className="flex items-center gap-2 border border-border rounded-xl p-2.5">
            <button
              onClick={() => toggleSubgoal(sg)}
              className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                sg.status === "completed" ? "bg-green-600 border-green-600" : "border-foreground-muted"
              }`}
            >
              {sg.status === "completed" && <Check size={12} className="text-white" />}
            </button>
            <span className={`text-sm flex-1 ${sg.status === "completed" ? "line-through text-foreground-muted" : ""}`}>{sg.title}</span>
            <button onClick={() => deleteSubgoal(sg.id)} className="text-foreground-muted hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-6">
        <Input placeholder="Новая подцель" value={subgoalTitle} onChange={(e) => setSubgoalTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddSubgoal()} />
        <Button variant="outline" onClick={handleAddSubgoal}>
          <Plus size={14} />
        </Button>
      </div>

      <h2 className="font-medium text-sm mb-2">Связанные задачи ({tasks.length})</h2>
      <div className="space-y-1.5 mb-6">
        {tasks.map((a) => (
          <ActionCard key={a.id} action={a} onClick={() => setOpenActionId(a.id)} />
        ))}
        {tasks.length === 0 && <p className="text-sm text-foreground-muted">Пока нет связанных задач</p>}
      </div>

      {goal.isArchived ? (
        <Button variant="outline" size="sm" onClick={async () => { await api.post(`/api/goals/${id}/restore`); load(); }}>
          <RotateCcw size={14} /> Восстановить
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={handleArchive} className="text-red-600">
          <Archive size={14} /> В архив
        </Button>
      )}

      <Modal open={scoreOpen} onClose={() => setScoreOpen(false)} title="Обновить показатель" size="sm">
        <div className="space-y-3">
          <Input type="number" value={scoreValue} onChange={(e) => setScoreValue(Number(e.target.value))} />
          <Button className="w-full" onClick={handleAddScore}>
            Сохранить
          </Button>
        </div>
      </Modal>

      <ActionModal open={!!openActionId} onClose={() => setOpenActionId(null)} actionId={openActionId} onSaved={load} />
    </div>
  );
}

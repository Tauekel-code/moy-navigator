"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { todayInTz } from "@/lib/dates";
import { isLocalMode } from "@/lib/config";
import type { LifeArea } from "@/types/life-area";

const STEPS = ["Сферы", "Оценка", "Цели", "Рабочее время", "Telegram"] as const;

/** Раздел 34 ТЗ: первый запуск — сферы → оценка → 1–3 цели → рабочее время → Telegram (пропуск) → «Сегодня». */
export function OnboardingWizard({ timezone }: { timezone: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [step, setStep] = useState(0);
  const [areas, setAreas] = useState<LifeArea[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [goalTitles, setGoalTitles] = useState<string[]>(["", "", ""]);
  const [goalAreas, setGoalAreas] = useState<string[]>(["", "", ""]);
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("19:00");
  const [busy, setBusy] = useState(false);
  const local = isLocalMode();
  const steps = local ? STEPS.slice(0, 4) : STEPS;

  useEffect(() => {
    api.post<{ lifeAreas: LifeArea[] }>("/api/life-areas/seed-defaults").then((r) => {
      setAreas(r.lifeAreas);
      setScores(Object.fromEntries(r.lifeAreas.map((a) => [a.id, a.latestScore ?? 5])));
    });
  }, []);

  async function finish() {
    setBusy(true);
    try {
      await api.post("/api/settings/onboarding");
      router.push("/today");
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Ошибка", "error");
      setBusy(false);
    }
  }

  async function next() {
    setBusy(true);
    try {
      if (step === 1) {
        await Promise.all(areas.map((a) => api.post(`/api/life-areas/${a.id}/scores`, { score: scores[a.id] ?? 5 })));
      } else if (step === 2) {
        const startDate = todayInTz(timezone);
        for (let i = 0; i < goalTitles.length; i++) {
          if (!goalTitles[i].trim()) continue;
          await api.post("/api/goals", {
            title: goalTitles[i].trim(),
            lifeAreaId: goalAreas[i] || null,
            goalType: "long_term",
            metricType: "text",
            startDate,
            priority: "high",
            status: "active",
          });
        }
      } else if (step === 3) {
        await api.patch("/api/settings/profile", { workStartTime: workStart, workEndTime: workEnd });
      }
      if (step >= steps.length - 1) await finish();
      else setStep(step + 1);
    } catch (err) {
      show(err instanceof Error ? err.message : "Ошибка", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-foreground-muted">
            Шаг {step + 1} из {steps.length} · {steps[step]}
          </p>
          <button onClick={finish} className="text-xs text-foreground-muted hover:text-foreground">
            Пропустить
          </button>
        </div>
        <div className="h-1 bg-surface-muted rounded-full mb-5">
          <div className="h-1 bg-accent rounded-full transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <h1 className="text-lg font-semibold">Добро пожаловать в Навигатор</h1>
            <p className="text-sm text-foreground-muted">
              Мы создали базовые сферы жизни. Список не фиксирован — потом можно добавлять, переименовывать и архивировать.
            </p>
            <div className="flex flex-wrap gap-2">
              {areas.map((a) => (
                <span key={a.id} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-border">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                  {a.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h1 className="text-lg font-semibold">Оцените каждую сферу</h1>
            <p className="text-sm text-foreground-muted">От 0 до 10 — как обстоят дела сейчас. Оценки сохраняются, чтобы видеть динамику.</p>
            {areas.map((a) => (
              <div key={a.id}>
                <Label>
                  {a.name}: {scores[a.id] ?? 5}/10
                </Label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={scores[a.id] ?? 5}
                  onChange={(e) => setScores({ ...scores, [a.id]: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h1 className="text-lg font-semibold">Главные цели</h1>
            <p className="text-sm text-foreground-muted">От одной до трёх — можно оставить пустыми и добавить позже.</p>
            {goalTitles.map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  placeholder={`Цель ${i + 1}`}
                  value={t}
                  onChange={(e) => setGoalTitles(goalTitles.map((x, j) => (j === i ? e.target.value : x)))}
                />
                <select
                  value={goalAreas[i]}
                  onChange={(e) => setGoalAreas(goalAreas.map((x, j) => (j === i ? e.target.value : x)))}
                  className="h-11 rounded-xl border border-border bg-surface px-2 text-sm"
                >
                  <option value="">Сфера</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h1 className="text-lg font-semibold">Рабочее время</h1>
            <p className="text-sm text-foreground-muted">Авто-план дня раскладывает задачи в эти часы.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>С</Label>
                <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
              </div>
              <div>
                <Label>До</Label>
                <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h1 className="text-lg font-semibold">Telegram</h1>
            <p className="text-sm text-foreground-muted">
              Подключить бота для напоминаний можно в Настройках → Telegram. Этот шаг можно пропустить.
            </p>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <Button variant="ghost" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>
            Назад
          </Button>
          <Button disabled={busy} onClick={next}>
            {step >= steps.length - 1 ? "Готово — на «Сегодня»" : "Дальше"}
          </Button>
        </div>
      </div>
    </div>
  );
}

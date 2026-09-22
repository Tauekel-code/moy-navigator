"use client";

import { useEffect, useState, useCallback } from "react";
import { Trash2, Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Label } from "@/components/ui/Input";
import { ScopeDialog } from "./ScopeDialog";
import { PostponeMenu } from "./PostponeMenu";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import type { PostponeShortcut } from "@/lib/database/schedule";
import { ACTION_TYPES, ACTION_TYPE_LABELS, ACTION_PRIORITIES, ACTION_PRIORITY_LABELS, ACTION_STATUSES, ACTION_STATUS_LABELS } from "@/types/action";
import { REMINDER_PRESETS } from "@/types/reminder";
import { RECURRENCE_FREQ_LABELS } from "@/types/recurrence";
import type { ActionWithDetails, RescheduleScope } from "@/types/action";
import type { Project } from "@/types/project";
import type { Contact } from "@/types/contact";
import type { RecurrenceFreq } from "@/types/recurrence";
import type { Reminder } from "@/types/reminder";

interface Props {
  open: boolean;
  onClose: () => void;
  actionId?: string | null; // "master" или "master::occurrenceDate"
  defaultDate?: string | null;
  defaultTime?: string | null;
  onSaved?: () => void;
}

type Tab = "main" | "context" | "reminders";

export function ActionModal({ open, onClose, actionId, defaultDate, defaultTime, onSaved }: Props) {
  const { show } = useToast();
  const isEdit = !!actionId;
  const occurrenceDate = actionId?.includes("::") ? actionId.split("::")[1] : undefined;
  const masterId = actionId?.split("::")[0];

  const [tab, setTab] = useState<Tab>("main");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [existing, setExisting] = useState<ActionWithDetails | null>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<(typeof ACTION_TYPES)[number]>("task");
  const [actionDate, setActionDate] = useState(defaultDate ?? "");
  const [startTime, setStartTime] = useState(defaultTime ?? "");
  const [endTime, setEndTime] = useState("");
  const [priority, setPriority] = useState<(typeof ACTION_PRIORITIES)[number]>("normal");
  const [status, setStatus] = useState<(typeof ACTION_STATUSES)[number]>("planned");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [projectId, setProjectId] = useState("");
  const [contactId, setContactId] = useState("");

  const [enableRecurrence, setEnableRecurrence] = useState(false);
  const [recFreq, setRecFreq] = useState<RecurrenceFreq>("weekly");
  const [recInterval, setRecInterval] = useState(1);
  const [recUntil, setRecUntil] = useState("");

  const [whyText, setWhyText] = useState("");
  const [goalText, setGoalText] = useState("");
  const [dontForgetText, setDontForgetText] = useState("");
  const [mainArgument, setMainArgument] = useState("");
  const [questionsText, setQuestionsText] = useState("");
  const [preparationText, setPreparationText] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [resultText, setResultText] = useState("");

  const [pendingReminders, setPendingReminders] = useState<{ unit: string; value: number | null }[]>([]);
  const [scopeAction, setScopeAction] = useState<null | "save">(null);
  const [pendingPostpone, setPendingPostpone] = useState<{ shortcut?: PostponeShortcut; date?: string; time?: string | null } | null>(
    null,
  );

  const reset = useCallback(() => {
    setTab("main");
    setTitle("");
    setType("task");
    setActionDate(defaultDate ?? "");
    setStartTime(defaultTime ?? "");
    setEndTime("");
    setPriority("normal");
    setStatus("planned");
    setDeadlineDate("");
    setDeadlineTime("");
    setProjectId("");
    setContactId("");
    setEnableRecurrence(false);
    setRecFreq("weekly");
    setRecInterval(1);
    setRecUntil("");
    setWhyText("");
    setGoalText("");
    setDontForgetText("");
    setMainArgument("");
    setQuestionsText("");
    setPreparationText("");
    setNextStep("");
    setResultText("");
    setPendingReminders([]);
    setExisting(null);
    setReminders([]);
  }, [defaultDate, defaultTime]);

  useEffect(() => {
    if (!open) return;
    reset();

    api.get<{ projects: Project[] }>("/api/projects").then((r) => setProjects(r.projects)).catch(() => {});
    api.get<{ contacts: Contact[] }>("/api/contacts").then((r) => setContacts(r.contacts)).catch(() => {});

    if (masterId) {
      setLoading(true);
      Promise.all([
        api.get<{ action: ActionWithDetails }>(`/api/actions/${masterId}`),
        api.get<{ reminders: Reminder[] }>(`/api/actions/${masterId}/reminders`),
      ])
        .then(([{ action }, { reminders }]) => {
          setExisting(action);
          setTitle(action.title);
          setType(action.type);
          setActionDate(occurrenceDate ?? action.actionDate ?? "");
          setStartTime(action.startTime ?? "");
          setEndTime(action.endTime ?? "");
          setPriority(action.priority);
          setStatus(action.status);
          if (action.deadlineAt) {
            const d = new Date(action.deadlineAt);
            setDeadlineDate(d.toISOString().slice(0, 10));
            setDeadlineTime(d.toISOString().slice(11, 16));
          }
          setProjectId(action.projectId ?? "");
          setContactId(action.contactId ?? "");
          setWhyText(action.context?.whyText ?? "");
          setGoalText(action.context?.goalText ?? "");
          setDontForgetText(action.context?.dontForgetText ?? "");
          setMainArgument(action.context?.mainArgument ?? "");
          setQuestionsText(action.context?.questionsText ?? "");
          setPreparationText(action.context?.preparationText ?? "");
          setNextStep(action.context?.nextStep ?? "");
          setResultText(action.result?.resultText ?? "");
          setReminders(reminders);
        })
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, masterId]);

  async function doSave(scope: RescheduleScope = "this") {
    if (!title.trim()) {
      show("Введите название", "error");
      return;
    }
    setSaving(true);

    try {
      const deadlineAt = deadlineDate ? new Date(`${deadlineDate}T${deadlineTime || "00:00"}:00`).toISOString() : null;

      const actionPayload = {
        title: title.trim(),
        type,
        actionDate: actionDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
        allDay: false,
        priority,
        status,
        deadlineAt,
        projectId: projectId || null,
        contactId: contactId || null,
      };

      if (isEdit && masterId) {
        await api.patch(`/api/actions/${actionId}`, { ...actionPayload, scope });
        await api.put(`/api/actions/${masterId}/context`, {
          whyText: whyText || null,
          goalText: goalText || null,
          dontForgetText: dontForgetText || null,
          mainArgument: mainArgument || null,
          questionsText: questionsText || null,
          preparationText: preparationText || null,
          nextStep: nextStep || null,
        });
        if (resultText.trim()) {
          await api.put(`/api/actions/${masterId}/result`, { resultText: resultText.trim() });
        }
        show("Сохранено", "success");
      } else {
        const { action } = await api.post<{ action: { id: string } }>("/api/actions", {
          action: actionPayload,
          recurrence: enableRecurrence
            ? { freq: recFreq, interval: recInterval, untilDate: recUntil || null }
            : undefined,
          reminders: pendingReminders.length
            ? pendingReminders.map((r) => ({ offsetUnit: r.unit, offsetValue: r.value }))
            : undefined,
          context:
            whyText || goalText || dontForgetText || mainArgument || questionsText || preparationText || nextStep
              ? {
                  whyText: whyText || null,
                  goalText: goalText || null,
                  dontForgetText: dontForgetText || null,
                  mainArgument: mainArgument || null,
                  questionsText: questionsText || null,
                  preparationText: preparationText || null,
                  nextStep: nextStep || null,
                }
              : undefined,
        });
        void action;
        show("Создано", "success");
      }

      onSaved?.();
      onClose();
    } catch (err) {
      show(err instanceof Error ? err.message : "Ошибка сохранения", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleSaveClick() {
    if (isEdit && existing?.isRecurring) {
      setScopeAction("save");
      return;
    }
    doSave();
  }

  function handlePostponeRequest(shortcut?: PostponeShortcut, date?: string, time?: string | null) {
    if (!masterId) return;
    const request = { shortcut, date, time };
    if (existing?.isRecurring) {
      setPendingPostpone(request);
      return;
    }
    doPostpone(request, "this");
  }

  async function doPostpone(request: { shortcut?: PostponeShortcut; date?: string; time?: string | null }, scope: RescheduleScope) {
    if (!masterId) return;
    try {
      await api.post(`/api/actions/${actionId}/postpone`, {
        shortcut: request.shortcut,
        date: request.date,
        time: request.time,
        scope,
        occurrenceDate,
      });
      show("Перенесено", "success");
      onSaved?.();
      onClose();
    } catch (err) {
      show(err instanceof Error ? err.message : "Не удалось перенести", "error");
    }
  }

  async function addReminderPreset(unit: string, value: number | null) {
    if (isEdit && masterId) {
      try {
        const { reminder } = await api.post<{ reminder: Reminder }>(`/api/actions/${masterId}/reminders`, {
          offsetUnit: unit,
          offsetValue: value,
        });
        setReminders((prev) => [...prev, reminder]);
      } catch (err) {
        show(err instanceof Error ? err.message : "Не удалось добавить напоминание", "error");
      }
    } else {
      setPendingReminders((prev) => [...prev, { unit, value }]);
    }
  }

  async function removeReminder(reminder: Reminder) {
    if (isEdit && masterId) {
      await api.del(`/api/actions/${masterId}/reminders/${reminder.id}`);
      setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
    }
  }

  async function handleDelete() {
    if (!masterId) return;
    if (!confirm("Перенести действие в архив?")) return;
    await api.del(`/api/actions/${masterId}`);
    show("Перенесено в архив", "success");
    onSaved?.();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Действие" : "Новое действие"} size="lg">
      {loading ? (
        <p className="text-sm text-foreground-muted py-8 text-center">Загрузка…</p>
      ) : (
        <>
          <div className="flex gap-1 mb-4 border-b border-border">
            {(
              [
                ["main", "Основное"],
                ["context", "Контекст"],
                ["reminders", "Напоминания"],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                  tab === key ? "border-accent text-accent" : "border-transparent text-foreground-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "main" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Что?</Label>
                <Input id="title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Позвонить клиенту" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="date">Когда? (дата)</Label>
                  <Input id="date" type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="start">Начало</Label>
                    <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="end">Конец</Label>
                    <Input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="type">Тип</Label>
                  <Select id="type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                    {ACTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {ACTION_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Приоритет</Label>
                  <Select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
                    {ACTION_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {ACTION_PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Статус</Label>
                  <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                    {ACTION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ACTION_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="project">Проект</Label>
                  <Select id="project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="">Без проекта</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="contact">Контакт</Label>
                  <Select id="contact" value={contactId} onChange={(e) => setContactId(e.target.value)}>
                    <option value="">Без контакта</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <details className="group">
                <summary className="text-sm text-foreground-muted cursor-pointer select-none">Дедлайн, повторение…</summary>
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="deadline-date">Дедлайн — дата</Label>
                      <Input id="deadline-date" type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="deadline-time">Дедлайн — время</Label>
                      <Input id="deadline-time" type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} />
                    </div>
                  </div>

                  {!isEdit && (
                    <div className="border border-border rounded-xl p-3 space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input type="checkbox" checked={enableRecurrence} onChange={(e) => setEnableRecurrence(e.target.checked)} />
                        Повторяющееся действие
                      </label>
                      {enableRecurrence && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="rec-freq">Частота</Label>
                            <Select id="rec-freq" value={recFreq} onChange={(e) => setRecFreq(e.target.value as RecurrenceFreq)}>
                              {Object.entries(RECURRENCE_FREQ_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="rec-interval">Интервал</Label>
                            <Input
                              id="rec-interval"
                              type="number"
                              min={1}
                              value={recInterval}
                              onChange={(e) => setRecInterval(Number(e.target.value) || 1)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="rec-until">До даты (необязательно)</Label>
                            <Input id="rec-until" type="date" value={recUntil} onChange={(e) => setRecUntil(e.target.value)} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </details>

              {(status === "completed" || isEdit) && (
                <div>
                  <Label htmlFor="result">Результат</Label>
                  <Textarea
                    id="result"
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                    placeholder="Что получилось в итоге?"
                  />
                </div>
              )}
            </div>
          )}

          {tab === "context" && (
            <div className="space-y-3">
              <ContextField label="Зачем?" value={whyText} onChange={setWhyText} />
              <ContextField label="Цель" value={goalText} onChange={setGoalText} />
              <ContextField label="Что нужно не забыть?" value={dontForgetText} onChange={setDontForgetText} />
              <ContextField label="Основной аргумент" value={mainArgument} onChange={setMainArgument} />
              <ContextField label="Что спросить?" value={questionsText} onChange={setQuestionsText} />
              <ContextField label="Что подготовить?" value={preparationText} onChange={setPreparationText} />
              <ContextField label="Следующий шаг" value={nextStep} onChange={setNextStep} />
            </div>
          )}

          {tab === "reminders" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {REMINDER_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => addReminderPreset(p.unit, p.value)}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-border hover:bg-surface-muted"
                  >
                    <Plus size={12} className="inline mr-1" />
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {isEdit
                  ? reminders.map((r) => (
                      <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-muted text-sm">
                        <span>{describeReminder(r.offsetUnit, r.offsetValue)}</span>
                        <button onClick={() => removeReminder(r)} className="text-foreground-muted hover:text-red-600">
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  : pendingReminders.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-muted text-sm">
                        <span>{describeReminder(r.unit as never, r.value)}</span>
                        <button
                          onClick={() => setPendingReminders((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-foreground-muted hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                {(isEdit ? reminders.length : pendingReminders.length) === 0 && (
                  <p className="text-sm text-foreground-muted">Напоминаний пока нет</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            {isEdit ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={handleDelete} className="text-red-600">
                  <Trash2 size={16} /> В архив
                </Button>
                <PostponeMenu onPostpone={handlePostponeRequest} />
              </div>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Отмена
              </Button>
              <Button onClick={handleSaveClick} disabled={saving}>
                {saving ? "Сохраняем…" : "Готово"}
              </Button>
            </div>
          </div>
        </>
      )}

      <ScopeDialog
        open={scopeAction === "save"}
        onClose={() => setScopeAction(null)}
        onSelect={(scope) => {
          setScopeAction(null);
          doSave(scope);
        }}
        actionLabel="изменение"
      />

      <ScopeDialog
        open={!!pendingPostpone}
        onClose={() => setPendingPostpone(null)}
        onSelect={(scope) => {
          const request = pendingPostpone;
          setPendingPostpone(null);
          if (request) doPostpone(request, scope);
        }}
        actionLabel="перенос"
      />
    </Modal>
  );
}

function ContextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} />
    </div>
  );
}

function describeReminder(unit: string, value: number | null): string {
  if (unit === "absolute") return "В указанное время";
  const labels: Record<string, string> = { minutes: "мин", hours: "ч", days: "дн", weeks: "нед", months: "мес" };
  return `За ${value} ${labels[unit] ?? unit}`;
}

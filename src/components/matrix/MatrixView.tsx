"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Trash2, CalendarPlus, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Input";
import { ActionModal } from "@/components/actions/ActionModal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { addCalendarDays, todayInTz } from "@/lib/dates";
import { classify, isImportant, QUADRANT_INFO, type Quadrant } from "@/lib/matrix/quadrant";
import type { Action } from "@/types/action";
import type { Contact } from "@/types/contact";

const OPEN_STATUSES = "planned,in_progress,overdue";

/** Матрица Эйзенхауэра: 1 — выполни, 2 — запланируй, 3 — делегируй, 4 — удали. */
export function MatrixView({ timezone }: { timezone: string }) {
  const { show } = useToast();
  const today = todayInTz(timezone);
  const [actions, setActions] = useState<Action[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [planFor, setPlanFor] = useState<Action | null>(null);
  const [planDate, setPlanDate] = useState("");
  const [delegateFor, setDelegateFor] = useState<Action | null>(null);
  const [delegateContact, setDelegateContact] = useState("");
  const [delegateName, setDelegateName] = useState("");

  const load = useCallback(async () => {
    const [a, c] = await Promise.all([
      api.get<{ actions: Action[] }>(`/api/actions?status=${OPEN_STATUSES}&pageSize=500`),
      api.get<{ contacts: Contact[] }>("/api/contacts"),
    ]);
    setActions(a.actions);
    setContacts(c.contacts);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch((e) => show(e instanceof Error ? e.message : "Не удалось загрузить", "error"));
  }, [load, show]);

  const baseId = (a: Action) => a.id.split("::")[0];

  async function run(fn: () => Promise<unknown>, okMessage: string) {
    try {
      await fn();
      show(okMessage, "success");
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : "Ошибка", "error");
    }
  }

  const complete = (a: Action) => run(() => api.patch(`/api/actions/${a.id}/status`, { status: "completed" }), "Выполнено");

  const toggleImportance = (a: Action) =>
    run(() => api.patch(`/api/actions/${baseId(a)}`, { priority: isImportant(a) ? "normal" : "high" }), "Обновлено");

  const remove = (a: Action) => {
    if (!confirm(`Убрать «${a.title}» в архив?`)) return Promise.resolve();
    return run(() => api.del(`/api/actions/${baseId(a)}`), "Убрано в архив");
  };

  async function saveSchedule() {
    if (!planFor || !planDate) return;
    const a = planFor;
    setPlanFor(null);
    setPlanDate("");
    await run(() => api.patch(`/api/actions/${baseId(a)}`, { actionDate: planDate }), "Запланировано");
  }

  async function delegate() {
    if (!delegateFor) return;
    const a = delegateFor;
    const who = contacts.find((c) => c.id === delegateContact)?.name ?? delegateName.trim();
    if (!who) return;
    const text = `Прошу взять на себя: «${a.title}»${a.actionDate ? ` (срок ${a.actionDate})` : ""}. Подтвердите, пожалуйста.`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* буфер обмена недоступен */
    }
    setDelegateFor(null);
    setDelegateContact("");
    setDelegateName("");
    await run(async () => {
      await api.patch(`/api/actions/${baseId(a)}`, {
        title: `${a.title} (делегировано: ${who})`,
        contactId: delegateContact || null,
      });
      await api.patch(`/api/actions/${a.id}/status`, { status: "deferred" });
    }, `Текст для «${who}» скопирован — отправьте его. Задача убрана из ваших дел`);
  }

  const byQuadrant = (q: Quadrant) => actions.filter((a) => classify(a, today) === q);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Матрица Эйзенхауэра</h1>
      <p className="text-sm text-foreground-muted mb-5">
        Выполни поле 1, запланируй поле 2, делегируй поле 3 и удали поле 4. Разбор занимает 5 минут в неделю.
      </p>

      {loading ? (
        <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {([1, 2, 3, 4] as Quadrant[]).map((q) => (
            <section key={q} className="border border-border rounded-xl p-3 min-h-40">
              <header className="mb-2">
                <p className="text-sm font-semibold">
                  {q}. {QUADRANT_INFO[q].verb} <span className="font-normal text-foreground-muted">— {QUADRANT_INFO[q].title}</span>
                </p>
                <p className="text-xs text-foreground-muted">{QUADRANT_INFO[q].hint}</p>
              </header>
              <div className="space-y-1.5">
                {byQuadrant(q).map((a) => (
                  <div key={a.id} className="rounded-lg bg-surface-muted px-2.5 py-2">
                    <button onClick={() => setOpenId(a.id)} className="text-left text-sm w-full">
                      {a.title}
                      <span className="text-xs text-foreground-muted">
                        {a.actionDate ? ` · ${a.actionDate}` : " · без даты"}
                        {a.goalTitle ? ` · цель: ${a.goalTitle}` : ""}
                      </span>
                    </button>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {q === 1 && (
                        <Button size="sm" variant="outline" onClick={() => complete(a)}>
                          <Check size={13} /> Выполнено
                        </Button>
                      )}
                      {q === 2 && (
                        <Button size="sm" variant="outline" onClick={() => setPlanFor(a)}>
                          <CalendarPlus size={13} /> Запланировать
                        </Button>
                      )}
                      {q === 3 && (
                        <Button size="sm" variant="outline" onClick={() => setDelegateFor(a)}>
                          <Send size={13} /> Делегировать
                        </Button>
                      )}
                      {q === 4 && (
                        <Button size="sm" variant="outline" onClick={() => remove(a)}>
                          <Trash2 size={13} /> Удалить
                        </Button>
                      )}
                      {!a.goalId && (
                        <Button size="sm" variant="ghost" onClick={() => toggleImportance(a)}>
                          <Star size={13} /> {isImportant(a) ? "Не важно" : "Важно"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {byQuadrant(q).length === 0 && <p className="text-xs text-foreground-muted">Пусто</p>}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-foreground-muted mt-4">
        Важно — приоритет «высокий/критичный» или задача привязана к цели. Срочно — дата сегодня–завтра, дедлайн в пределах 2 дней либо задача просрочена.
      </p>

      <Modal open={!!planFor} onClose={() => setPlanFor(null)} title="Когда сделать?" size="sm">
        <div className="p-5 space-y-3">
          <p className="text-sm">{planFor?.title}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setPlanDate(addCalendarDays(today, 3))}>
              Через 3 дня
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPlanDate(addCalendarDays(today, 7))}>
              Через неделю
            </Button>
          </div>
          <Input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
          <Button className="w-full" disabled={!planDate} onClick={saveSchedule}>
            Запланировать
          </Button>
        </div>
      </Modal>

      <Modal open={!!delegateFor} onClose={() => setDelegateFor(null)} title="Кому делегировать?" size="sm">
        <div className="p-5 space-y-3">
          <p className="text-sm">{delegateFor?.title}</p>
          {contacts.length > 0 && (
            <div>
              <Label>Контакт</Label>
              <Select value={delegateContact} onChange={(e) => setDelegateContact(e.target.value)}>
                <option value="">Другой человек…</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {!delegateContact && (
            <div>
              <Label>Имя</Label>
              <Input value={delegateName} onChange={(e) => setDelegateName(e.target.value)} />
            </div>
          )}
          <p className="text-xs text-foreground-muted">
            Текст-просьба скопируется в буфер — отправьте его человеку. Задача уйдёт в «Отложено» с пометкой, кому передана.
          </p>
          <Button className="w-full" disabled={!delegateContact && !delegateName.trim()} onClick={delegate}>
            Делегировать и скопировать текст
          </Button>
        </div>
      </Modal>

      <ActionModal open={!!openId} onClose={() => setOpenId(null)} actionId={openId} onSaved={load} />
    </div>
  );
}

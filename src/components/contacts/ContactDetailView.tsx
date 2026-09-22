"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ActionCard } from "@/components/actions/ActionCard";
import { ActionModal } from "@/components/actions/ActionModal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import type { Contact } from "@/types/contact";
import type { Action } from "@/types/action";

export function ContactDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [history, setHistory] = useState<Action[]>([]);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  async function load() {
    const [{ contact }, { actions }] = await Promise.all([
      api.get<{ contact: Contact }>(`/api/contacts/${id}`),
      api.get<{ actions: Action[] }>(`/api/contacts/${id}/history`),
    ]);
    setContact(contact);
    setHistory(actions);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(patch: Partial<{ name: string; phone: string | null; email: string | null; company: string | null; note: string | null }>) {
    if (!contact) return;
    const { contact: updated } = await api.patch<{ contact: Contact }>(`/api/contacts/${id}`, patch);
    setContact(updated);
  }

  async function handleDelete() {
    if (!confirm("Архивировать контакт?")) return;
    await api.del(`/api/contacts/${id}`);
    router.push("/contacts");
  }

  if (!contact) return <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.push("/contacts")} className="flex items-center gap-1 text-sm text-foreground-muted mb-4 hover:text-foreground">
        <ArrowLeft size={15} /> Контакты
      </button>

      <div className="space-y-3 mb-6">
        <Input
          value={contact.name}
          onChange={(e) => setContact({ ...contact, name: e.target.value })}
          onBlur={(e) => save({ name: e.target.value })}
          className="text-lg font-semibold h-auto py-2"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Телефон</Label>
            <Input
              value={contact.phone ?? ""}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              onBlur={(e) => save({ phone: e.target.value || null })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={contact.email ?? ""}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
              onBlur={(e) => save({ email: e.target.value || null })}
            />
          </div>
        </div>
        <div>
          <Label>Компания</Label>
          <Input
            value={contact.company ?? ""}
            onChange={(e) => setContact({ ...contact, company: e.target.value })}
            onBlur={(e) => save({ company: e.target.value || null })}
          />
        </div>
        <div>
          <Label>Заметка</Label>
          <Textarea
            value={contact.note ?? ""}
            onChange={(e) => setContact({ ...contact, note: e.target.value })}
            onBlur={(e) => save({ note: e.target.value || null })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-sm">История взаимодействия ({history.length})</h2>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600">
          <Trash2 size={14} /> В архив
        </Button>
      </div>

      <div className="space-y-1.5">
        {history.map((a) => (
          <ActionCard key={a.id} action={a} onClick={() => setOpenActionId(a.id)} />
        ))}
        {history.length === 0 && <p className="text-sm text-foreground-muted">Пока нет действий с этим контактом</p>}
      </div>

      <ActionModal open={!!openActionId} onClose={() => setOpenActionId(null)} actionId={openActionId} onSaved={load} />
    </div>
  );
}

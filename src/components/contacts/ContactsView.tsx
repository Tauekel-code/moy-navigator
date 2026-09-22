"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import type { Contact } from "@/types/contact";

export function ContactsView() {
  const { show } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  async function load() {
    setLoading(true);
    const { contacts } = await api.get<{ contacts: Contact[] }>("/api/contacts");
    setContacts(contacts);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      await api.post("/api/contacts", { name: name.trim(), phone: phone || null, email: email || null, company: company || null });
      setCreateOpen(false);
      setName("");
      setPhone("");
      setEmail("");
      setCompany("");
      show("Контакт создан", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Ошибка", "error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Контакты</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Контакт
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-12">Контактов пока нет</p>
      ) : (
        <div className="space-y-1.5">
          {contacts.map((c) => (
            <Link
              key={c.id}
              href={`/contacts/${c.id}`}
              className="flex items-center gap-3 border border-border rounded-xl p-3 hover:border-accent/50"
            >
              <span className="w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center shrink-0">
                <User size={16} className="text-foreground-muted" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-foreground-muted truncate">
                  {[c.company, c.phone, c.email].filter(Boolean).join(" · ") || "Нет данных"}
                </p>
              </div>
              <span className="text-xs text-foreground-muted shrink-0">{c.actionsCount ?? 0} действий</span>
            </Link>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый контакт" size="sm">
        <div className="space-y-3">
          <div>
            <Label htmlFor="c-name">Имя</Label>
            <Input id="c-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="c-phone">Телефон</Label>
            <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="c-company">Компания</Label>
            <Input id="c-company" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleCreate}>
            Создать
          </Button>
        </div>
      </Modal>
    </div>
  );
}

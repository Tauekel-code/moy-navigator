"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ActionCard } from "@/components/actions/ActionCard";
import { api } from "@/lib/api-client";
import type { Action } from "@/types/action";

interface SearchResponse {
  actions: Action[];
  projects: { id: string; name: string }[];
  contacts: { id: string; name: string }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenAction: (id: string) => void;
}

/** Раздел 36 ТЗ: глобальный поиск. */
export function SearchModal({ open, onClose, onOpenAction }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResult(null);
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResult(null);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(() => {
      api
        .get<SearchResponse>(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then(setResult)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <Modal open={open} onClose={onClose} title="Поиск" size="md">
      <Input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Название, контекст, результат, проект, контакт…"
      />

      <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {loading && <p className="text-sm text-foreground-muted">Ищем…</p>}

        {result && result.actions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground-muted uppercase">Действия</p>
            {result.actions.map((a) => (
              <ActionCard
                key={a.id}
                action={a}
                compact
                onClick={() => {
                  onOpenAction(a.id);
                  onClose();
                }}
              />
            ))}
          </div>
        )}

        {result && result.projects.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground-muted uppercase">Проекты</p>
            {result.projects.map((p) => (
              <button
                key={p.id}
                className="block w-full text-left px-3 py-2 rounded-lg hover:bg-surface-muted text-sm"
                onClick={() => {
                  router.push(`/projects/${p.id}`);
                  onClose();
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {result && result.contacts.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground-muted uppercase">Контакты</p>
            {result.contacts.map((c) => (
              <button
                key={c.id}
                className="block w-full text-left px-3 py-2 rounded-lg hover:bg-surface-muted text-sm"
                onClick={() => {
                  router.push(`/contacts/${c.id}`);
                  onClose();
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {result && !result.actions.length && !result.projects.length && !result.contacts.length && (
          <p className="text-sm text-foreground-muted">Ничего не найдено</p>
        )}
      </div>
    </Modal>
  );
}

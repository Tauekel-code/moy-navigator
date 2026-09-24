"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import type { LifeArea } from "@/types/life-area";

const COLORS = ["#4f46e5", "#2563eb", "#0891b2", "#16a34a", "#ca8a04", "#ea580c", "#db2777", "#64748b"];

/** Раздел 3, 17, 20 ТЗ: сферы жизни с оценкой 0-10 и динамикой. */
export function LifeAreasView() {
  const { show } = useToast();
  const [areas, setAreas] = useState<LifeArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  async function load() {
    setLoading(true);
    const { lifeAreas } = await api.get<{ lifeAreas: LifeArea[] }>("/api/life-areas");
    setAreas(lifeAreas);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function seedDefaults() {
    await api.post("/api/life-areas/seed-defaults");
    show("Базовые сферы созданы", "success");
    load();
  }

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      await api.post("/api/life-areas", { name: name.trim(), description: description || null, color });
      setCreateOpen(false);
      setName("");
      setDescription("");
      show("Сфера создана", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Ошибка", "error");
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Сферы жизни</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Сфера
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-foreground-muted text-center py-12">Загрузка…</p>
      ) : areas.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-sm text-foreground-muted">Сфер пока нет</p>
          <Button variant="outline" size="sm" onClick={seedDefaults}>
            <Sparkles size={14} /> Создать базовые сферы
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {areas.map((area) => (
            <Link
              key={area.id}
              href={`/life-areas/${area.id}`}
              className="border border-border rounded-xl p-4 hover:border-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
                  <p className="font-medium text-sm">{area.name}</p>
                </div>
                {area.latestScore != null && (
                  <span className="text-lg font-semibold" style={{ color: area.color }}>
                    {area.latestScore}
                    <span className="text-xs text-foreground-muted">/10</span>
                  </span>
                )}
              </div>
              {area.description && <p className="text-xs text-foreground-muted mt-2 line-clamp-2">{area.description}</p>}
              <div className="flex items-center gap-3 mt-2.5 text-xs text-foreground-muted">
                <span>{area.goalsCount ?? 0} целей</span>
                {area.latestScoreDate && <span>оценка от {area.latestScoreDate}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новая сфера" size="sm">
        <div className="space-y-3">
          <div>
            <Label htmlFor="la-name">Название</Label>
            <Input id="la-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="la-desc">Описание</Label>
            <Textarea id="la-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Цвет</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-accent" : ""}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={handleCreate}>
            Создать
          </Button>
        </div>
      </Modal>
    </div>
  );
}

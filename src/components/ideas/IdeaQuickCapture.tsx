"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { getSpeechRecognition, type SpeechRecognitionCtor } from "@/lib/speech";
import type { IdeaSource } from "@/types/idea";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Раздел 6-7 ТЗ: главная задача — не дать пользователю потерять мысль.
 * Одно поле, сохранение в один клик, без сферы/цели/времени — их можно
 * разобрать позже во «Входящих». Диктовка — дополнительный способ ввода,
 * обычный текст работает всегда (раздел 7: "5. Пользователь подтверждает").
 */
export function IdeaQuickCapture({ open, onClose, onSaved }: Props) {
  const { show } = useToast();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [source, setSource] = useState<IdeaSource>("text");
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const speechSupported = !!getSpeechRecognition();

  useEffect(() => {
    if (!open) {
      setText("");
      setSource("text");
      setListening(false);
      recognitionRef.current?.stop?.();
    }
  }, [open]);

  function toggleVoice() {
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;

    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ru-RU";
    recognition.interimResults = false;
    recognition.onresult = (event: { results: { transcript: string }[][] }) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setSource("voice");
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/ideas", { text: text.trim(), source });
      show("Идея сохранена во «Входящих»", "success");
      onSaved?.();
      onClose();
    } catch (err) {
      show(err instanceof Error ? err.message : "Не удалось сохранить идею", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Быстрая запись" size="sm">
      <div className="space-y-3">
        <Textarea
          autoFocus
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (source === "voice") setSource("text");
          }}
          placeholder="Что пришло в голову?"
          rows={4}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
          }}
        />
        <div className="flex items-center justify-between">
          {speechSupported ? (
            <Button variant={listening ? "danger" : "outline"} size="sm" onClick={toggleVoice} type="button">
              {listening ? <Square size={14} /> : <Mic size={14} />}
              {listening ? "Остановить" : "Продиктовать"}
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleSave} disabled={saving || !text.trim()}>
            {saving ? "Сохраняем…" : "Сохранить идею"}
          </Button>
        </div>
        <p className="text-xs text-foreground-muted">
          Идея сразу попадёт во «Входящие» — сферу, цель и время можно указать позже, раз в неделю приложение
          предложит разобрать неразобранные идеи.
        </p>
      </div>
    </Modal>
  );
}

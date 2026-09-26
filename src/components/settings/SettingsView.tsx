"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Link as LinkIcon, Download, Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { detectBrowserTimezone } from "@/lib/dates";
import { isLocalMode } from "@/lib/config";
import type { UserProfile } from "@/types/user";
import type { NotificationSettings } from "@/types/notification";
import type { TelegramConnection } from "@/types/notification";

type Tab = "profile" | "notifications" | "telegram" | "data" | "security";

const ALL_TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "Профиль" },
  { key: "notifications", label: "Уведомления" },
  { key: "telegram", label: "Telegram" },
  { key: "data", label: "Данные" },
  { key: "security", label: "Безопасность" },
];

export function SettingsView() {
  const [tab, setTab] = useState<Tab>("profile");
  const local = isLocalMode();
  const TABS = local ? ALL_TABS.filter((t) => t.key !== "telegram") : ALL_TABS;

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-xl font-semibold">Настройки</h1>
        {local && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted text-foreground-muted">Локальный режим</span>
        )}
      </div>

      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              tab === t.key ? "border-accent text-accent" : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "telegram" && <TelegramTab />}
      {tab === "data" && <DataTab />}
      {tab === "security" && <SecurityTab />}
    </div>
  );
}

function ProfileTab() {
  const { show } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ profile: UserProfile; email: string }>("/api/settings/profile").then((r) => {
      setProfile(r.profile);
      setEmail(r.email);
    });
  }, []);

  async function save(patch: Partial<UserProfile>) {
    if (!profile) return;
    setSaving(true);
    try {
      const { profile: updated } = await api.patch<{ profile: UserProfile }>("/api/settings/profile", patch);
      setProfile(updated);
      show("Сохранено", "success");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <p className="text-sm text-foreground-muted">Загрузка…</p>;

  return (
    <div className="space-y-4">
      {!isLocalMode() && (
        <div>
          <Label>Email</Label>
          <Input value={email} disabled />
        </div>
      )}
      <div>
        <Label>Имя</Label>
        <Input
          value={profile.displayName ?? ""}
          onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
          onBlur={(e) => save({ displayName: e.target.value || null })}
        />
      </div>
      <div>
        <Label>Часовой пояс</Label>
        <div className="flex gap-2">
          <Input value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const tz = detectBrowserTimezone();
              setProfile({ ...profile, timezone: tz });
              save({ timezone: tz });
            }}
          >
            Авто
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Язык</Label>
          <Select value={profile.language} onChange={(e) => save({ language: e.target.value as UserProfile["language"] })}>
            <option value="ru">Русский</option>
            <option value="kk">Қазақша</option>
            <option value="en">English</option>
          </Select>
        </div>
        <div>
          <Label>Формат времени</Label>
          <Select value={profile.timeFormat} onChange={(e) => save({ timeFormat: e.target.value as UserProfile["timeFormat"] })}>
            <option value="24">24 часа</option>
            <option value="12">12 часов (AM/PM)</option>
          </Select>
        </div>
      </div>
      <div>
        <Label>Первый день недели</Label>
        <Select value={profile.weekStart} onChange={(e) => save({ weekStart: Number(e.target.value) })}>
          <option value={1}>Понедельник</option>
          <option value={0}>Воскресенье</option>
        </Select>
      </div>
      {saving && <p className="text-xs text-foreground-muted">Сохранение…</p>}
    </div>
  );
}

function NotificationsTab() {
  const { show } = useToast();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    api.get<{ settings: NotificationSettings }>("/api/settings/notifications").then((r) => setSettings(r.settings));
  }, []);

  async function save(patch: Partial<NotificationSettings>) {
    if (!settings) return;
    const { settings: updated } = await api.patch<{ settings: NotificationSettings }>("/api/settings/notifications", patch);
    setSettings(updated);
    show("Сохранено", "success");
  }

  if (!settings) return <p className="text-sm text-foreground-muted">Загрузка…</p>;

  return (
    <div className="space-y-5">
      <ToggleRow
        label="Уведомления в приложении"
        checked={settings.inAppEnabled}
        onChange={(v) => save({ inAppEnabled: v })}
      />
      {!isLocalMode() && (
        <ToggleRow label="Уведомления в Telegram" checked={settings.telegramEnabled} onChange={(v) => save({ telegramEnabled: v })} />
      )}
      <ToggleRow label="Предупреждать о конфликте времени" checked={settings.conflictNotify} onChange={(v) => save({ conflictNotify: v })} />
      <ToggleRow label="Уведомлять о просрочке" checked={settings.overdueNotify} onChange={(v) => save({ overdueNotify: v })} />

      <div className="border-t border-border pt-4 space-y-3">
        <ToggleRow label="Утренний план" checked={settings.morningPlanEnabled} onChange={(v) => save({ morningPlanEnabled: v })} />
        {settings.morningPlanEnabled && (
          <Input type="time" value={settings.morningPlanTime.slice(0, 5)} onChange={(e) => save({ morningPlanTime: e.target.value })} />
        )}
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <ToggleRow label="Вечерний итог" checked={settings.eveningReviewEnabled} onChange={(v) => save({ eveningReviewEnabled: v })} />
        {settings.eveningReviewEnabled && (
          <Input type="time" value={settings.eveningReviewTime.slice(0, 5)} onChange={(e) => save({ eveningReviewTime: e.target.value })} />
        )}
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4" />
    </label>
  );
}

function TelegramTab() {
  const { show } = useToast();
  const [connection, setConnection] = useState<TelegramConnection | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const { connection } = await api.get<{ connection: TelegramConnection | null }>("/api/telegram/status");
    setConnection(connection);
  }

  useEffect(() => {
    load();
  }, []);

  async function connect() {
    setLoading(true);
    try {
      const res = await api.post<{ code: string; link: string | null }>("/api/telegram/connect");
      setLink(res.link);
      if (res.link) window.open(res.link, "_blank");
    } finally {
      setLoading(false);
    }
  }

  const [chatId, setChatId] = useState("");
  async function connectManual() {
    setLoading(true);
    try {
      await api.post("/api/telegram/connect-manual", { chatId });
      show("Telegram подключён — проверьте сообщение от бота", "success");
      setChatId("");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Ошибка", "error");
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    await api.post("/api/telegram/disconnect");
    show("Telegram отключён", "success");
    load();
  }

  const isConnected = connection?.status === "connected";

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground-muted">
        Раздел 27 ТЗ: подключите Telegram, чтобы получать напоминания, утренний план и вечерний итог дня.
      </p>

      {isConnected ? (
        <div className="border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Подключено</p>
            {connection?.telegramUsername && <p className="text-xs text-foreground-muted">@{connection.telegramUsername}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={disconnect}>
            Отключить
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-xl p-4 space-y-3">
          <Button onClick={connect} disabled={loading}>
            <Send size={15} /> Подключить Telegram
          </Button>
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="text-sm text-accent flex items-center gap-1 hover:underline">
              <LinkIcon size={13} /> Открыть бота вручную
            </a>
          )}
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-sm font-medium">Или по Chat ID (если бот уже используется в другом проекте)</p>
            <div className="flex gap-2">
              <Input placeholder="Ваш Chat ID, например 123456789" value={chatId} onChange={(e) => setChatId(e.target.value)} />
              <Button variant="outline" disabled={loading || !chatId.trim()} onClick={connectManual}>
                Подключить
              </Button>
            </div>
            <p className="text-xs text-foreground-muted">Узнать свой Chat ID можно у бота @userinfobot. Сначала напишите своему боту любое сообщение.</p>
          </div>
          <p className="text-xs text-foreground-muted">
            Если бот не настроен администратором (переменные TELEGRAM_BOT_TOKEN / NEXT_PUBLIC_TELEGRAM_BOT_USERNAME), ссылка будет
            недоступна — см. README по настройке.
          </p>
        </div>
      )}
    </div>
  );
}

function ExportLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center gap-2 h-8 px-3 text-sm rounded-lg border border-border text-foreground hover:bg-surface-muted font-medium"
    >
      <Download size={14} /> {label}
    </a>
  );
}

function DataTab() {
  const { show } = useToast();
  const [importing, setImporting] = useState(false);

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const format = ext === "csv" ? "csv" : ext === "ics" ? "ics" : "json";

    setImporting(true);
    try {
      const content = await file.text();
      const result = await api.post<{ imported: number; skippedDuplicates: number; conflicts: unknown[] }>("/api/import", {
        format,
        content,
      });
      show(`Импортировано: ${result.imported}, пропущено дублей: ${result.skippedDuplicates}`, "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Ошибка импорта", "error");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium mb-2">Экспорт (раздел 39, 67)</p>
        <div className="flex flex-wrap gap-2">
          <ExportLink href="/api/export/json" label="JSON (полная копия)" />
          <ExportLink href="/api/export/csv" label="CSV: задачи" />
          <ExportLink href="/api/export/csv?type=goals" label="CSV: цели" />
          <ExportLink href="/api/export/csv?type=life-areas" label="CSV: сферы" />
          <ExportLink href="/api/export/csv?type=life-area-scores" label="CSV: оценки сфер" />
          <ExportLink href="/api/export/csv?type=goal-scores" label="CSV: показатели целей" />
          <ExportLink href="/api/export/csv?type=ideas" label="CSV: идеи" />
          <ExportLink href="/api/export/csv?type=history" label="CSV: история" />
          <ExportLink href="/api/export/csv?type=reviews" label="CSV: итоги дней" />
          <ExportLink href="/api/export/csv?type=stats" label="CSV: статистика (90 дней)" />
          <ExportLink href="/api/export/ics" label="ICS" />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Импорт (раздел 40)</p>
        <input type="file" accept=".json,.csv,.ics" onChange={handleImportFile} className="hidden" id="import-file" />
        <Button variant="outline" size="sm" disabled={importing} onClick={() => document.getElementById("import-file")?.click()}>
          <Upload size={14} /> {importing ? "Импортируем…" : "Выбрать файл"}
        </Button>
      </div>
    </div>
  );
}

function ChangePasswordForm() {
  const { show } = useToast();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await createClient().auth.updateUser({ password });
    setSaving(false);
    if (error) {
      show(error.message, "error");
      return;
    }
    setPassword("");
    show("Пароль изменён. Входите с ним на телефоне", "success");
  }

  return (
    <form onSubmit={handleSave} className="border border-border rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium">Сменить пароль</p>
      <p className="text-xs text-foreground-muted">Задайте пароль, который запомните, — с ним можно войти с другого устройства.</p>
      <div>
        <Label>Новый пароль (минимум 8 символов)</Label>
        <Input type="text" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={saving || password.length < 8}>
        {saving ? "Сохраняем…" : "Сменить пароль"}
      </Button>
    </form>
  );
}

function SecurityTab() {
  const router = useRouter();
  const { show } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const local = isLocalMode();

  async function handleDelete() {
    if (confirmText !== "УДАЛИТЬ") return;
    if (!confirm("Это действие необратимо. Все данные будут удалены. Продолжить?")) return;

    setDeleting(true);
    try {
      await api.post("/api/account/delete");
      show(local ? "Локальные данные удалены" : "Аккаунт удалён", "success");
      router.push(local ? "/today" : "/login");
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Ошибка удаления", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {!local && <ChangePasswordForm />}

      {!local && (
        <Button variant="outline" onClick={handleSignOut}>
          Выйти из аккаунта
        </Button>
      )}

      <div className="border border-red-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-red-600 flex items-center gap-1.5">
          <AlertTriangle size={15} /> {local ? "Очистить все локальные данные" : "Удаление аккаунта"}
        </p>
        <p className="text-xs text-foreground-muted">
          {local
            ? "Полностью удалит все действия, проекты, контакты и историю на этом компьютере. Перед этим рекомендуем экспортировать данные во вкладке «Данные». Это действие необратимо."
            : "Раздел 68 ТЗ: перед удалением рекомендуем экспортировать данные во вкладке «Данные». Это действие необратимо."}
        </p>
        <div>
          <Label>Введите УДАЛИТЬ для подтверждения</Label>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </div>
        <Button variant="danger" disabled={confirmText !== "УДАЛИТЬ" || deleting} onClick={handleDelete}>
          {deleting ? "Удаляем…" : local ? "Удалить все локальные данные" : "Удалить аккаунт навсегда"}
        </Button>
      </div>
    </div>
  );
}

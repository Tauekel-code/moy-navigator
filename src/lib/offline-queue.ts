// Раздел 25 ТЗ: временная офлайн-очередь. localStorage здесь — НЕ хранилище данных,
// а только буфер несинхронизированных изменений (раздел 37 это допускает).
// При конфликте синхронизации изменение не теряется и не перезаписывает данные
// молча — оно попадает в список конфликтов, где пользователь решает: повторить или отбросить.

export interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  body: string | null;
  queuedAt: string;
  error?: string;
}

const QUEUE_KEY = "nav.offlineQueue";
const CONFLICTS_KEY = "nav.offlineConflicts";

// Только операции, безопасные для отложенного выполнения: создать задачу/идею и отметить статус.
export function isQueueable(method: string, url: string): boolean {
  if (method === "POST" && (url === "/api/ideas" || url === "/api/actions")) return true;
  if (method === "PATCH" && /^\/api\/actions\/[^/]+\/status$/.test(url)) return true;
  return false;
}

function read(key: string): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function write(key: string, items: QueuedRequest[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // хранилище недоступно — очередь просто не сохранится
  }
  window.dispatchEvent(new CustomEvent("offline:changed"));
}

export const getQueue = () => read(QUEUE_KEY);
export const getConflicts = () => read(CONFLICTS_KEY);

export function enqueue(method: string, url: string, body: string | null) {
  write(QUEUE_KEY, [...getQueue(), { id: crypto.randomUUID(), method, url, body, queuedAt: new Date().toISOString() }]);
}

export function discardConflict(id: string) {
  write(CONFLICTS_KEY, getConflicts().filter((c) => c.id !== id));
}

export function retryConflict(id: string) {
  const item = getConflicts().find((c) => c.id === id);
  if (!item) return;
  write(CONFLICTS_KEY, getConflicts().filter((c) => c.id !== id));
  write(QUEUE_KEY, [...getQueue(), { ...item, error: undefined }]);
}

let flushing = false;

/** Отправляет очередь по порядку. Возвращает число успешно синхронизированных изменений. */
export async function flushQueue(): Promise<number> {
  if (flushing || typeof window === "undefined") return 0;
  flushing = true;
  let synced = 0;
  try {
    for (const item of getQueue()) {
      let res: Response;
      try {
        res = await fetch(item.url, { method: item.method, headers: { "Content-Type": "application/json" }, body: item.body });
      } catch {
        break; // сети всё ещё нет — оставляем остаток очереди
      }
      write(QUEUE_KEY, getQueue().filter((q) => q.id !== item.id));
      if (res.ok) {
        synced++;
      } else {
        const err = await res.json().catch(() => ({}));
        write(CONFLICTS_KEY, [...getConflicts(), { ...item, error: err.error ?? `Ошибка ${res.status}` }]);
      }
    }
  } finally {
    flushing = false;
  }
  return synced;
}

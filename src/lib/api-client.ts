// Тонкая обёртка над fetch для клиентских компонентов: все запросы идут
// через собственные API-маршруты (/api/*), которые уже применяют
// серверный Supabase-клиент, RLS и валидацию (раздел 52, 79 ТЗ).

import { enqueue, isQueueable } from "./offline-queue";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
  } catch (err) {
    const method = options?.method ?? "GET";
    // Нет сети: безопасные операции откладываем в очередь и синхронизируем позже (раздел 25)
    if (typeof window !== "undefined" && isQueueable(method, url)) {
      enqueue(method, url, typeof options?.body === "string" ? options.body : null);
      window.dispatchEvent(new CustomEvent("offline:queued"));
      return { queued: true } as T;
    }
    throw err;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ошибка запроса: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, data?: unknown) => request<T>(url, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(url: string, data?: unknown) => request<T>(url, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(url: string, data?: unknown) => request<T>(url, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  del: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};

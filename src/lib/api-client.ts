// Тонкая обёртка над fetch для клиентских компонентов: все запросы идут
// через собственные API-маршруты (/api/*), которые уже применяют
// серверный Supabase-клиент, RLS и валидацию (раздел 52, 79 ТЗ).

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

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

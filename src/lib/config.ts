/**
 * Локальный режим: если Supabase не настроен (нет NEXT_PUBLIC_SUPABASE_URL
 * в .env.local), приложение работает на встроенной в Node.js базе SQLite
 * прямо на компьютере пользователя — без регистрации, без облака.
 * Как только позже добавят переменные Supabase и перезапустят сервер,
 * приложение автоматически переключится на облачный режим.
 */
export function isLocalMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001";

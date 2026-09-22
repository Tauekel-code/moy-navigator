import { LOCAL_USER_ID } from "@/lib/config";

/**
 * Локальный режим не использует Supabase вовсе — весь доступ к данным идёт
 * через lib/local/*. Но часть кода (getCurrentUserOrThrow, страницы,
 * настройки) продолжает вызывать supabase.auth.* по привычной сигнатуре,
 * поэтому здесь — минимальная заглушка с одним всегда-залогиненным
 * локальным пользователем. .from()/.rpc() намеренно бросают ошибку: если
 * что-то попытается пойти в Supabase в локальном режиме, это баг, который
 * должен быть виден сразу, а не тихо съеден.
 */
export function createLocalSupabaseStub() {
  const localUser = { id: LOCAL_USER_ID, email: "local@device" };

  return {
    auth: {
      getUser: async () => ({ data: { user: localUser }, error: null }),
      getSession: async () => ({ data: { session: { user: localUser } }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: null, error: { message: "Локальный режим: вход не требуется" } }),
      signUp: async () => ({ data: null, error: { message: "Локальный режим: регистрация не требуется" } }),
      resetPasswordForEmail: async () => ({ data: null, error: { message: "Локальный режим: недоступно" } }),
    },
    from() {
      throw new Error("Локальный режим: обращение к Supabase .from() не должно происходить — используйте lib/local/*");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

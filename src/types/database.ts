// Минимальный тип Database для supabase-js. После первого деплоя схемы
// рекомендуется сгенерировать точные типы командой:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
// и заменить этот файл — тогда все .from('table') запросы получат полную типизацию.
// До этого момента слой доступа к данным (src/lib/database/*) сам отвечает
// за форму данных через ручные мапперы в доменные типы (src/types/*.ts).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, Json>; Insert: Record<string, Json>; Update: Record<string, Json> }>;
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { mapTelegramConnection } from "./mappers";
import type { TelegramConnection } from "@/types/notification";

const CODE_TTL_MINUTES = 15;

export async function getTelegramConnection(supabase: SupabaseClient, userId: string): Promise<TelegramConnection | null> {
  const { data, error } = await supabase.from("telegram_connections").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? mapTelegramConnection(data) : null;
}

/** Раздел 27: шаг 2-3 — генерация кода для подключения Telegram. */
export async function createTelegramConnectCode(supabase: SupabaseClient, userId: string): Promise<string> {
  const code = randomBytes(6).toString("hex");
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();

  const { error } = await supabase.from("telegram_connections").upsert(
    {
      user_id: userId,
      connect_code: code,
      connect_code_expires_at: expiresAt,
      status: "pending",
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;

  return code;
}

/** Раздел 27: шаг 4-6 — вызывается из Telegram webhook при получении /start <code>. */
export async function confirmTelegramConnection(
  supabase: SupabaseClient,
  code: string,
  chatId: string,
  username: string | null,
): Promise<{ userId: string } | null> {
  const { data: row, error } = await supabase
    .from("telegram_connections")
    .select("*")
    .eq("connect_code", code)
    .gt("connect_code_expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const { error: updateErr } = await supabase
    .from("telegram_connections")
    .update({
      telegram_chat_id: chatId,
      telegram_username: username,
      status: "connected",
      connected_at: new Date().toISOString(),
      connect_code: null,
      connect_code_expires_at: null,
    })
    .eq("user_id", row.user_id);
  if (updateErr) throw updateErr;

  await supabase.from("notification_settings").update({ telegram_enabled: true }).eq("user_id", row.user_id);

  return { userId: row.user_id };
}

export async function disconnectTelegram(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from("telegram_connections")
    .update({ status: "disconnected", telegram_chat_id: null, connected_at: null })
    .eq("user_id", userId);
  if (error) throw error;

  await supabase.from("notification_settings").update({ telegram_enabled: false }).eq("user_id", userId);
}

export async function findUserByTelegramChatId(supabase: SupabaseClient, chatId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("telegram_connections")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .eq("status", "connected")
    .maybeSingle();
  if (error) throw error;
  return data?.user_id ?? null;
}

/** Привязка без webhook: пользователь сам указывает Chat ID (нужно, когда бот уже работает в polling-режиме в другом проекте). */
export async function connectTelegramManually(supabase: SupabaseClient, userId: string, chatId: string, username: string | null = null): Promise<void> {
  const { error } = await supabase.from("telegram_connections").upsert(
    {
      user_id: userId,
      telegram_chat_id: chatId,
      telegram_username: username,
      status: "connected",
      connected_at: new Date().toISOString(),
      connect_code: null,
      connect_code_expires_at: null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  await supabase.from("notification_settings").update({ telegram_enabled: true }).eq("user_id", userId);
}

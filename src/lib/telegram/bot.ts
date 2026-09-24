import "server-only";

const TELEGRAM_API = "https://api.telegram.org";

function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  return token;
}

export type InlineKeyboard = { text: string; callback_data?: string; url?: string }[][];

export async function sendTelegramMessage(chatId: string, text: string, inlineKeyboard?: InlineKeyboard): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/bot${botToken()}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

export async function setTelegramWebhook(url: string, secretToken: string): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, secret_token: secretToken }),
  });
  if (!res.ok) throw new Error(`Telegram setWebhook failed: ${res.status}`);
}

export interface TelegramUpdate {
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number } };
  };
  message?: {
    chat: { id: number };
    from?: { username?: string; id: number };
    text?: string;
  };
}

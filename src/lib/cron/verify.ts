import type { NextRequest } from "next/server";

/**
 * Раздел 77 ТЗ: "не полагаться на открытый браузер пользователя для
 * отправки напоминаний" — обработчики вызываются планировщиком (Vercel Cron)
 * по расписанию из vercel.json, а не клиентом. Проверяем секрет, который
 * Vercel Cron автоматически передаёт как Authorization: Bearer <CRON_SECRET>.
 */
export function verifyCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const querySecret = req.nextUrl.searchParams.get("secret");
  return querySecret === secret;
}

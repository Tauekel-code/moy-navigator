import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError, jsonError } from "@/lib/api/respond";
import { connectTelegramManually } from "@/lib/database/telegram";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { formatConnectSuccessMessage } from "@/lib/telegram/messages";
import { isLocalMode } from "@/lib/config";

const bodySchema = z.object({ chatId: z.string().trim().regex(/^-?\d{5,20}$/, "Chat ID — это число, например 123456789") });

/** Привязка по Chat ID: проверяем, что бот может написать в этот чат, и только потом сохраняем. */
export async function POST(req: NextRequest) {
  try {
    if (isLocalMode()) return jsonError("Telegram недоступен в локальном режиме", 400);
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { chatId } = bodySchema.parse(await req.json());

    try {
      await sendTelegramMessage(chatId, formatConnectSuccessMessage());
    } catch {
      return jsonError("Бот не смог написать в этот чат. Проверьте Chat ID и что вы уже писали этому боту.", 400);
    }

    await connectTelegramManually(supabase, user.id, chatId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

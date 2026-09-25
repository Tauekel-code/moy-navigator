import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError(err.issues.map((i) => i.message).join("; "), 422);
  }
  if (err instanceof Error) {
    if (err.message === "Не авторизован") return jsonError(err.message, 401);
    return jsonError(err.message, 400);
  }
  // ошибки Supabase/PostgREST — простые объекты с полем message, а не Error
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return jsonError((err as { message: string }).message, 400);
  }
  return jsonError("Внутренняя ошибка", 500);
}

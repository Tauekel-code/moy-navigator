import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { addLifeAreaScore, listLifeAreaScores } from "@/lib/database/life-areas";
import { lifeAreaScoreInputSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const scores = await listLifeAreaScores(supabase, id, {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    return NextResponse.json({ scores });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const { id } = await params;
    const input = lifeAreaScoreInputSchema.parse(await req.json());

    const score = await addLifeAreaScore(supabase, user.id, id, input);
    return NextResponse.json({ score }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

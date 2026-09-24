import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserOrThrow } from "@/lib/utils";
import { handleApiError } from "@/lib/api/respond";
import { listActionsFiltered } from "@/lib/database/actions";
import { listLifeAreas, listLifeAreaScores } from "@/lib/database/life-areas";
import { listGoals } from "@/lib/database/goals";
import { countUnreviewedIdeas } from "@/lib/database/ideas";
import { getUserProfile } from "@/lib/database/settings";
import { computePeriodStats } from "@/lib/stats/compute";
import { addCalendarDays, todayInTz } from "@/lib/dates";

/** Раздел 21 ТЗ: еженедельный обзор — план/факт, динамика сфер, цели без движения, идеи, перенесённые задачи. */
export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUserOrThrow(supabase);
    const profile = await getUserProfile(supabase, user.id);
    const today = todayInTz(profile?.timezone ?? "UTC");
    const weekStart = addCalendarDays(today, -6);
    const stalledSince = addCalendarDays(today, -14);

    const [{ actions: weekActions }, { actions: recentActions }, lifeAreas, goals, unreviewedIdeas] = await Promise.all([
      listActionsFiltered(supabase, user.id, { from: weekStart, to: today, includeArchived: false, pageSize: 100000 }),
      listActionsFiltered(supabase, user.id, { from: stalledSince, to: today, includeArchived: false, pageSize: 100000 }),
      listLifeAreas(supabase, user.id),
      listGoals(supabase, user.id, { status: ["active"] }),
      countUnreviewedIdeas(supabase, user.id),
    ]);

    const stats = computePeriodStats(weekActions, lifeAreas, weekStart, today);

    const sphereDynamics = [];
    for (const area of lifeAreas) {
      const scores = await listLifeAreaScores(supabase, area.id, { from: addCalendarDays(today, -30), to: today });
      sphereDynamics.push({
        id: area.id,
        name: area.name,
        color: area.color,
        latest: scores.length ? scores[scores.length - 1].score : (area.latestScore ?? null),
        previous: scores.length > 1 ? scores[0].score : null,
      });
    }

    const movedGoalIds = new Set(recentActions.filter((a) => a.status === "completed" && a.goalId).map((a) => a.goalId));
    const stalledGoals = goals
      .filter((g) => !movedGoalIds.has(g.id) && g.updatedAt.slice(0, 10) < stalledSince)
      .map((g) => ({ id: g.id, title: g.title, lifeAreaName: g.lifeAreaName ?? null }));

    const postponedTasks = weekActions
      .filter((a) => a.status === "deferred" || a.status === "skipped" || a.status === "overdue")
      .map((a) => ({ id: a.id, title: a.title, status: a.status, actionDate: a.actionDate }));

    return NextResponse.json({ weekStart, today, stats, sphereDynamics, stalledGoals, unreviewedIdeas, postponedTasks });
  } catch (err) {
    return handleApiError(err);
  }
}

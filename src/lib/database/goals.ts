import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/config";
import * as cloud from "./cloud/goals";
import * as local from "@/lib/local/goals";
import type { Goal, GoalInput, GoalScoreInput, Subgoal, SubgoalInput } from "@/types/goal";

export type { GoalFilters } from "./cloud/goals";
import type { GoalFilters } from "./cloud/goals";

export async function listGoals(supabase: SupabaseClient, userId: string, filters: GoalFilters = {}): Promise<Goal[]> {
  return isLocalMode() ? local.listGoals(userId, filters) : cloud.listGoals(supabase, userId, filters);
}

export async function getGoalById(supabase: SupabaseClient, id: string): Promise<Goal | null> {
  return isLocalMode() ? local.getGoalById(id) : cloud.getGoalById(supabase, id);
}

export async function createGoal(supabase: SupabaseClient, userId: string, input: GoalInput): Promise<Goal> {
  return isLocalMode() ? local.createGoal(userId, input) : cloud.createGoal(supabase, userId, input);
}

export async function updateGoal(supabase: SupabaseClient, id: string, userId: string, patch: Partial<GoalInput>): Promise<Goal> {
  return isLocalMode() ? local.updateGoal(id, userId, patch) : cloud.updateGoal(supabase, id, userId, patch);
}

export async function archiveGoal(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  return isLocalMode() ? local.archiveGoal(id, userId) : cloud.archiveGoal(supabase, id, userId);
}

export async function restoreGoal(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  return isLocalMode() ? local.restoreGoal(id, userId) : cloud.restoreGoal(supabase, id, userId);
}

export async function addGoalScore(supabase: SupabaseClient, userId: string, goalId: string, input: GoalScoreInput) {
  return isLocalMode() ? local.addGoalScore(userId, goalId, input) : cloud.addGoalScore(supabase, userId, goalId, input);
}

export async function listGoalScores(supabase: SupabaseClient, goalId: string) {
  return isLocalMode() ? local.listGoalScores(goalId) : cloud.listGoalScores(supabase, goalId);
}

export async function listGoalHistory(supabase: SupabaseClient, goalId: string) {
  return isLocalMode() ? local.listGoalHistory(goalId) : cloud.listGoalHistory(supabase, goalId);
}

export async function listSubgoals(supabase: SupabaseClient, goalId: string): Promise<Subgoal[]> {
  return isLocalMode() ? local.listSubgoals(goalId) : cloud.listSubgoals(supabase, goalId);
}

export async function createSubgoal(supabase: SupabaseClient, userId: string, goalId: string, input: SubgoalInput): Promise<Subgoal> {
  return isLocalMode() ? local.createSubgoal(userId, goalId, input) : cloud.createSubgoal(supabase, userId, goalId, input);
}

export async function updateSubgoal(supabase: SupabaseClient, id: string, patch: Partial<SubgoalInput>): Promise<Subgoal> {
  return isLocalMode() ? local.updateSubgoal(id, patch) : cloud.updateSubgoal(supabase, id, patch);
}

export async function deleteSubgoal(supabase: SupabaseClient, id: string): Promise<void> {
  return isLocalMode() ? local.deleteSubgoal(id) : cloud.deleteSubgoal(supabase, id);
}

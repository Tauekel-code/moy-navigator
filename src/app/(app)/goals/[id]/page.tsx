import { GoalDetailView } from "@/components/goals/GoalDetailView";

export default async function GoalDetailPage({ params }: PageProps<"/goals/[id]">) {
  const { id } = await params;
  return <GoalDetailView id={id} />;
}

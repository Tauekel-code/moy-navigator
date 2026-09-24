import { LifeAreaDetailView } from "@/components/life-areas/LifeAreaDetailView";

export default async function LifeAreaDetailPage({ params }: PageProps<"/life-areas/[id]">) {
  const { id } = await params;
  return <LifeAreaDetailView id={id} />;
}

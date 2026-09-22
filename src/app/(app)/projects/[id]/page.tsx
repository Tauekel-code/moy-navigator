import { ProjectDetailView } from "@/components/projects/ProjectDetailView";

export default async function ProjectDetailPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  return <ProjectDetailView id={id} />;
}

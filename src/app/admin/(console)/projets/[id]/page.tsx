import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/ProjectForm";
import { readSite } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const site = await readSite();
  const project = site.projects.find((item) => item.id === id);
  if (!project) notFound();

  return (
    <main style={{ display: "grid", gap: 20 }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>{project.title}</h1>
      <ProjectForm project={project} />
    </main>
  );
}

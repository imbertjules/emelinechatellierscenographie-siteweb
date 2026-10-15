import { ProjectForm } from "@/components/ProjectForm";
import { readSite } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const site = await readSite();

  return (
    <main style={{ display: "grid", gap: 20 }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>Nouveau projet</h1>
      <ProjectForm settings={site.settings} />
    </main>
  );
}

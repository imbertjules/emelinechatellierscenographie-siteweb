import { ProjectForm } from "@/components/ProjectForm";

export default function NewProjectPage() {
  return (
    <main style={{ display: "grid", gap: 20 }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>Nouveau projet</h1>
      <ProjectForm />
    </main>
  );
}

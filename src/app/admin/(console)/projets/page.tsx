import Link from "next/link";
import { readSite } from "@/lib/store";

export default async function AdminProjectsPage() {
  const site = await readSite();
  const projects = [...site.projects].sort((a, b) => a.order - b.order);

  return (
    <main style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>Projets</h1>
        <Link href="/admin/projets/nouveau">Nouveau projet</Link>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        {projects.map((project) => (
          <li key={project.id} style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {project.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.images[0].src}
                alt=""
                style={{ width: 96, height: 72, objectFit: "cover" }}
              />
            ) : null}
            <div>
              <Link href={`/admin/projets/${project.id}`}>{project.title}</Link>
              <div style={{ color: "#666", fontSize: 14 }}>
                {project.showOnHome ? "Sur l’accueil" : "Hors accueil"} · {project.homeLayout}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

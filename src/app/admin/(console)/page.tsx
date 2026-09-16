import Link from "next/link";
import { readSite } from "@/lib/store";

export default async function AdminHomePage() {
  const site = await readSite();

  return (
    <main style={{ display: "grid", gap: 18, maxWidth: 640 }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>Backoffice</h1>
      <p style={{ margin: 0 }}>
        {site.settings.name} — {site.projects.length} projet
        {site.projects.length > 1 ? "s" : ""}.
      </p>
      <p style={{ margin: 0 }}>
        <Link href="/admin/projets/nouveau">Ajouter un projet</Link>
        {" · "}
        <Link href="/admin/a-propos">Modifier l’à propos</Link>
      </p>
    </main>
  );
}

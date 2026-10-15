import { HomeCanvasForm } from "@/components/HomeCanvasForm";
import { readSite } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminHomeCanvasPage() {
  const site = await readSite();

  return (
    <main style={{ display: "grid", gap: 20, color: "#111" }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>Canevas d’accueil</h1>
      <p style={{ margin: 0, maxWidth: 640 }}>
        Une photo par projet (celle marquée « Photo d’accueil »). Placez les vignettes librement
        pour la page d’accueil publique.
      </p>
      <HomeCanvasForm projects={site.projects} />
    </main>
  );
}

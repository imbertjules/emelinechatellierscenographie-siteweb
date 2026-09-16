import { AboutForm } from "@/components/AboutForm";
import { readSite } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminAboutPage() {
  const site = await readSite();

  return (
    <main style={{ display: "grid", gap: 20, width: "100%" }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>À propos</h1>
      <AboutForm initialHtml={site.aboutHtml} />
    </main>
  );
}

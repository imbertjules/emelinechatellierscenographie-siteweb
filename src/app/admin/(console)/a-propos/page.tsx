import { Wysiwyg } from "@/components/Wysiwyg";
import { saveAboutAction } from "@/lib/actions";
import { readSite } from "@/lib/store";

export default async function AdminAboutPage() {
  const site = await readSite();

  return (
    <main style={{ display: "grid", gap: 20, width: "100%" }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>À propos</h1>
      <form
        action={saveAboutAction}
        style={{ display: "grid", gap: 16, width: "100%" }}
      >
        <Wysiwyg name="aboutHtml" initialHtml={site.aboutHtml} />
        <button
          type="submit"
          style={{
            width: "fit-content",
            background: "#111",
            color: "#fff",
            border: 0,
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          Enregistrer
        </button>
      </form>
    </main>
  );
}

import { saveSettingsAction } from "@/lib/actions";
import { readSite } from "@/lib/store";

export default async function SettingsPage() {
  const site = await readSite();

  return (
    <main style={{ display: "grid", gap: 20, maxWidth: 520 }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>Réglages</h1>
      <form action={saveSettingsAction} style={{ display: "grid", gap: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Nom
          <input name="name" defaultValue={site.settings.name} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Ligne de titre (à côté du nom)
          <input name="tagline" defaultValue={site.settings.tagline} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Email
          <input name="email" type="email" defaultValue={site.settings.email} style={inputStyle} />
        </label>
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

const inputStyle = {
  border: "1px solid #ccc",
  padding: "8px 10px",
  fontSize: 16,
  background: "#fff",
} as const;

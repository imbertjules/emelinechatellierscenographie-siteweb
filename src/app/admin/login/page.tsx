import { loginAction } from "@/lib/actions";
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main
      className="admin-shell"
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
      }}
    >
      <form
        action={loginAction}
        style={{
          display: "grid",
          gap: 16,
          width: "min(360px, 90vw)",
          background: "#fff",
          padding: 28,
          border: "1px solid #ddd",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Backoffice</h1>
        {error ? (
          <p style={{ margin: 0, color: "#a10" }}>Mot de passe incorrect.</p>
        ) : (
          <p style={{ margin: 0, color: "#555" }}>
            Entrez le mot de passe pour ajouter des projets et modifier l’à propos.
          </p>
        )}
        <input
          type="password"
          name="password"
          placeholder="Mot de passe"
          required
          style={{
            border: "1px solid #ccc",
            padding: "10px 12px",
            fontSize: 16,
          }}
        />
        <button
          type="submit"
          style={{
            background: "#111",
            color: "#fff",
            border: 0,
            padding: "10px 12px",
            cursor: "pointer",
          }}
        >
          Entrer
        </button>
      </form>
    </main>
  );
}

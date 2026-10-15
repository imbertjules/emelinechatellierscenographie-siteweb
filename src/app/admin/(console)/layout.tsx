import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <nav style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <Link href="/admin">Backoffice</Link>
          <Link href="/admin/projets">Projets</Link>
          <Link href="/admin/projets/nouveau">Nouveau projet</Link>
          <Link href="/admin/accueil">Canevas accueil</Link>
          <Link href="/admin/a-propos">À propos</Link>
          <Link href="/admin/reglages">Réglages</Link>
          <Link href="/" target="_blank">
            Voir le site
          </Link>
        </nav>
        <form action={logoutAction}>
          <button
            type="submit"
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            Déconnexion
          </button>
        </form>
      </header>
      <div className="admin-body">{children}</div>
    </div>
  );
}

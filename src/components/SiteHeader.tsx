import type { SiteSettings } from "@/lib/types";

export function SiteHeader({
  settings,
  current,
}: {
  settings: SiteSettings;
  current?: "home" | "about";
}) {
  return (
    <header className="site-header">
      <div className="site-brand">
        <a href="/" aria-current={current === "home" ? "page" : undefined}>
          {settings.name}
        </a>
        {settings.tagline ? <span>{settings.tagline}</span> : null}
      </div>
      <nav className="site-nav">
        <a href="/a-propos" aria-current={current === "about" ? "page" : undefined}>
          À propos
        </a>
        {settings.email ? (
          <a href={`mailto:${settings.email}`}>{settings.email}</a>
        ) : null}
      </nav>
    </header>
  );
}

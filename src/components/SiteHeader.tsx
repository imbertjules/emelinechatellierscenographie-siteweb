import Image from "next/image";
import Link from "next/link";
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
        <Link href="/" aria-current={current === "home" ? "page" : undefined}>
          {/* The logo is supplied as an SVG so it stays sharp on every screen. */}
          <Image src="/logo.svg" alt={settings.name} width={268} height={67} priority />
        </Link>
      </div>
      <nav className="site-nav">
        <Link href="/a-propos" aria-current={current === "about" ? "page" : undefined}>
          À propos
        </Link>
        {settings.email ? (
          <a href={`mailto:${settings.email}`}>{settings.email}</a>
        ) : null}
      </nav>
    </header>
  );
}

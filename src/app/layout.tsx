import type { Metadata } from "next";
import { readSite } from "@/lib/store";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const site = await readSite();
  return {
    title: {
      default: `${site.settings.name} — ${site.settings.tagline}`,
      template: `%s — ${site.settings.name}`,
    },
    description: `${site.settings.name}, ${site.settings.tagline}`,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

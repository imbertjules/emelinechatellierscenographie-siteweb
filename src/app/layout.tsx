import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { readSite } from "@/lib/store";
import "./globals.css";

const siteUrl = "https://emelinechatellierscenographie.fr";

export const viewport: Viewport = {
  themeColor: "#000000",
};

export async function generateMetadata(): Promise<Metadata> {
  const site = await readSite();
  const title = `${site.settings.name} — ${site.settings.tagline}`;
  const description = `${site.settings.name} conçoit des projets de scénographie, muséographie, installations et espaces immersifs.`;

  return {
    metadataBase: new URL(siteUrl),
    applicationName: site.settings.name,
    title: {
      default: title,
      template: `%s — ${site.settings.name}`,
    },
    description,
    keywords: [
      site.settings.name,
      "scénographie",
      "muséographie",
      "design d'exposition",
      "installation",
      "Emeline Chatellier",
    ],
    alternates: {
      canonical: "/",
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      url: siteUrl,
      siteName: site.settings.name,
      title,
      description,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
    icons: {
      icon: "/logo.svg",
      shortcut: "/logo.svg",
      apple: "/logo.svg",
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const site = await readSite();
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.settings.name,
    url: siteUrl,
    logo: `${siteUrl}/logo.svg`,
    email: site.settings.email || undefined,
    sameAs: site.settings.email ? [`mailto:${site.settings.email}`] : undefined,
  };

  return (
    <html lang="fr">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
